module.exports = {
    name: '.tagall',
    description: 'Tag all members in the group',
    execute: async (sock, msg) => {
        try {
            const chatId = msg.key.remoteJid;
            const senderId = msg.key.participant || msg.key.remoteJid;
            
            // Get group metadata
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants;
            
            if (!participants || participants.length === 0) {
                await sock.sendMessage(chatId, { text: 'No participants found in the group.' });
                return;
            }
            
            // Check if sender is admin
            const sender = participants.find(p => p.id === senderId);
            const isSenderAdmin = sender && (sender.admin === 'admin' || sender.admin === 'superadmin');
            
            // Check if bot is admin
            const bot = participants.find(p => p.id === sock.user.id);
            const isBotAdmin = bot && (bot.admin === 'admin' || bot.admin === 'superadmin');
            
            if (!isSenderAdmin && !isBotAdmin) {
                await sock.sendMessage(chatId, {
                    text: '❌ Only admins can use the .tagall command.'
                });
                return;
            }
            
            // Create mention text
            let mentionText = '📢 *Hey everyone!*\n\n';
            let mentions = [];
            
            participants.forEach((participant, index) => {
                mentionText += `${index + 1}. @${participant.id.split('@')[0]}\n`;
                mentions.push(participant.id);
            });
            
            mentionText += `\n👥 Total: ${participants.length} members`;
            
            // Send message with mentions
            await sock.sendMessage(chatId, {
                text: mentionText,
                mentions: mentions
            });
            
            console.log('✅ Tagged all members successfully!');
        } catch (error) {
            console.error('❌ Error in tagall command:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Failed to tag all members. Error: ' + error.message
            });
        }
    }
};