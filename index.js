const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

// Handle uncaught errors to prevent crashes
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught error:', error.message);
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error.message);
});

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }), // Change to 'debug' for more logs
        auth: state,
    });

    sock.ev.on('creds.update', saveCreds);

    // Handle connection updates and QR code display
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Display QR code when available
        if (qr) {
            console.log('\n📱 Scan this QR code with WhatsApp:\n');
            qrcode.generate(qr, { small: true });
            console.log('\nOpen WhatsApp → Settings → Linked Devices → Link a Device\n');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);
            if (shouldReconnect) {
                // Wait 3 seconds before reconnecting to avoid rapid reconnection loops
                setTimeout(() => {
                    console.log('🔄 Attempting to reconnect...');
                    connectToWhatsApp().catch(err => console.error('Reconnection failed:', err.message));
                }, 3000);
            }
        } else if (connection === 'open') {
            console.log('✅ Connected to WhatsApp successfully!');
            console.log('Bot is ready to use. Add it to a group and make it admin.');
            console.log('Available commands: .tagall, .help\n');
        } else if (connection === 'connecting') {
            console.log('🔄 Connecting to WhatsApp...');
        }
    });

    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages }) => {
        try {
            const msg = messages[0];
            
            // Debug: Log all incoming messages
            console.log('\n📩 Message received from:', msg.key.remoteJid);
            
            if (!msg.message) {
                console.log('⚠️ No message content');
                return;
            }
            
            // Allow messages from the bot owner (fromMe) to execute commands
            // This is needed because the bot is linked to your account
            if (msg.key.fromMe) {
                console.log('ℹ️ Message from bot owner (you)');
            }

            // Extract message text from various message types
            const messageText = 
                msg.message.conversation || 
                msg.message.extendedTextMessage?.text || 
                msg.message.imageMessage?.caption ||
                msg.message.videoMessage?.caption ||
                msg.message.documentMessage?.caption ||
                '';
            
            console.log('📝 Message text:', messageText);
            console.log('📦 Message type:', Object.keys(msg.message)[0]);
            
            const from = msg.key.remoteJid;
            const isGroup = from.endsWith('@g.us');
            
            console.log('👥 Is group message:', isGroup);

            if (!isGroup) {
                console.log('⚠️ Not a group message, ignoring');
                return;
            }

            // Check if message is a command
            if (!messageText.startsWith('.')) {
                console.log('⚠️ Not a command (doesn\'t start with .)');
                return;
            }
            
            // Get just the command part (remove any extra text)
            const commandOnly = messageText.trim().split(' ')[0].toLowerCase();
            console.log('🔍 Command only:', commandOnly);

            console.log('🔍 Checking commands folder...');

            // Load commands
            if (!fs.existsSync('./commands')) {
                console.error('❌ Commands folder not found!');
                return;
            }

            const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
            console.log('📂 Found command files:', commandFiles);
            
            for (const file of commandFiles) {
                const command = require(`./commands/${file}`);
                console.log(`🔍 Checking command: ${command.name} against: ${commandOnly}`);
                
                // Match exact command only (not partial text)
                if (commandOnly === command.name.toLowerCase()) {
                    console.log('✅ Command matched! Executing:', command.name);
                    
                    try {
                        // Execute command - let it handle connection issues internally
                        await command.execute(sock, msg);
                        console.log('✅ Command executed successfully');
                    } catch (error) {
                        console.error('❌ Error executing command:', error.message);
                        // Only try to send error message if connected
                        if (sock.ws?.readyState === 1) {
                            try {
                                await sock.sendMessage(from, { text: '❌ An error occurred while executing the command.' });
                            } catch (sendError) {
                                console.log('⚠️ Could not send error message - connection issue');
                            }
                        }
                    }
                    break;
                }
            }
        } catch (error) {
            console.error('❌ Error processing message:', error.message);
        }
    });

    return sock;
}

// Start the bot
console.log('🚀 Starting WhatsApp TagAll Bot...\n');
console.log('📋 Debug mode enabled - all messages will be logged\n');
connectToWhatsApp().catch(err => console.error('Error:', err));