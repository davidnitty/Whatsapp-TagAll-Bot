module.exports = {
    name: '.tagall',
    description: 'Tag all members in the group',
    execute: async (sock, msg) => {
        try {
            const groupId = msg.key.remoteJid;
            const senderId = msg.key.participant || msg.key.remoteJid;
            
            // Get group metadata
            const groupMetadata = await sock.groupMetadata(groupId);
            const participants = groupMetadata.participants;
            
            if (!participants || participants.length === 0) {
                await sock.sendMessage(groupId, { text: 'No participants found in the group.' });
                return;
            }
            
            // Check if sender is admin
            const sender = participants.find(p => p.id === senderId);
            const isSenderAdmin = sender && (sender.admin === 'admin' || sender.admin === 'superadmin');
            
            if (!isSenderAdmin) {
                await sock.sendMessage(groupId, {
                    text: '❌ Only group admins can use this command.'
                });
                return;
            }
            
            // Create mention list (completely invisible tags)
            let mentions = participants.map(p => p.id);
            
            // Message WITHOUT showing any numbers - completely clean
            let mentionText = '📢 *Attention Everyone!* 🔔\n\n';
            mentionText += 'Important group announcement.\n';
            mentionText += `Total members: ${participants.length}`;
            
            // The mentions array handles the tagging invisibly
            // People get notified but numbers don't appear in the message
            
            // Send message with retry logic
            let sent = false;
            for (let attempt = 0; attempt < 5; attempt++) {
                try {
                    // Check WebSocket state before attempting
                    if (!sock.ws || sock.ws.readyState !== 1) {
                        console.log(`⚠️ WebSocket not ready, waiting... (attempt ${attempt + 1}/5)`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        continue;
                    }
                    
                    await sock.sendMessage(groupId, {
                        text: mentionText,
                        mentions: mentions
                    });
                    
                    console.log(`✅ Tagged ${participants.length} members successfully (invisible mode)!`);
                    sent = true;
                    break;
                } catch (sendError) {
                    console.log(`⚠️ Send attempt ${attempt + 1}/5 failed:`, sendError.message);
                    if (attempt < 4) {
                        console.log('⏳ Waiting 3 seconds before retry...');
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }
                }
            }
            
            if (!sent) {
                console.log('❌ Failed to send message after 5 attempts');
            }
        } catch (error) {
            console.error('❌ Error in tagall command:', error.message);
        }
    }
};