const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// Rate limiter - prevent spam
const lastCommandTime = new Map();
const COOLDOWN_MS = 10000; // 10 seconds

// Process control
let processingCommand = false;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: state,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n📱 Scan QR code:\n');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                setTimeout(() => {
                    connectToWhatsApp().catch(err => console.error('Reconnect failed:', err.message));
                }, 3000);
            }
        } else if (connection === 'open') {
            console.log('✅ Connected to WhatsApp!');
            console.log('⚠️ STRICT MODE: Only .tagall command will work\n');
        }
    });

    // ULTRA-STRICT MESSAGE HANDLER
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            // Prevent concurrent processing
            if (processingCommand) {
                console.log('⚠️ Already processing a command, skipping');
                return;
            }

            const msg = messages[0];
            
            // Basic validations
            if (!msg || !msg.message) return;
            if (!msg.key || !msg.key.remoteJid) return;
            
            // ONLY group messages
            if (!msg.key.remoteJid.endsWith('@g.us')) return;
            
            // Get message type
            const msgType = Object.keys(msg.message)[0];
            
            // ONLY accept conversation type - reject everything else
            if (msgType !== 'conversation') {
                return; // Silent reject
            }
            
            // Get text
            const text = msg.message.conversation;
            if (!text) return;
            
            // Trim and check
            const trimmed = text.trim();
            
            // MUST be exactly ".tagall" - nothing more, nothing less
            if (trimmed !== '.tagall') {
                return; // Silent reject - not the command
            }
            
            console.log('✅ .tagall command detected');
            
            // Check cooldown
            const groupId = msg.key.remoteJid;
            const lastUsed = lastCommandTime.get(groupId);
            const now = Date.now();
            
            if (lastUsed && (now - lastUsed) < COOLDOWN_MS) {
                const remaining = Math.ceil((COOLDOWN_MS - (now - lastUsed)) / 1000);
                console.log(`⏱️ Cooldown active: ${remaining}s remaining`);
                return;
            }
            
            // Set processing flag
            processingCommand = true;
            lastCommandTime.set(groupId, now);
            
            // Execute tagall
            try {
                const groupMetadata = await sock.groupMetadata(groupId);
                const participants = groupMetadata.participants;
                
                // Check if sender is admin
                const senderId = msg.key.participant || msg.key.remoteJid;
                const sender = participants.find(p => p.id === senderId);
                const isAdmin = sender && (sender.admin === 'admin' || sender.admin === 'superadmin');
                
                if (!isAdmin) {
                    await sock.sendMessage(groupId, { 
                        text: '❌ Only admins can use this command.' 
                    });
                    processingCommand = false;
                    return;
                }
                
                // Create mentions
                const mentions = participants.map(p => p.id);
                const mentionText = '📢 *Attention Everyone!* 🔔\n\nImportant group announcement.';
                
                // Send message
                await sock.sendMessage(groupId, {
                    text: mentionText,
                    mentions: mentions
                });
                
                console.log(`✅ Tagged ${participants.length} members`);
                
            } catch (error) {
                console.error('❌ Command error:', error.message);
            } finally {
                processingCommand = false;
            }
            
        } catch (error) {
            console.error('❌ Handler error:', error.message);
            processingCommand = false;
        }
    });

    return sock;
}

console.log('🚀 Starting WhatsApp TagAll Bot (STRICT MODE)...\n');
connectToWhatsApp().catch(err => console.error('Start error:', err));