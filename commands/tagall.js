module.exports = {
    name: '.tagall',
    description: 'Tag all members in the group',
    execute: async (sock, msg) => {
        try {
            const chatId = msg.key.remoteJid;
            const senderId = msg.key.participant || msg.key.remoteJid;
            const groupMetadata = await sock.groupMetadata(chatId);
            const participants = groupMetadata.participants;
            
            if (!participants || participants.length === 0) {
                await sock.sendMessage(chatId, { text: 'No participants found.' });
                return;
            }
            
            const sender = participants.find(p => p.id === senderId);
            const isSenderAdmin = sender && (sender.admin === 'admin' || sender.admin === 'superadmin');
            
            if (!isSenderAdmin) {
                await sock.sendMessage(chatId, { text: 'Only admins can use this command.' });
                return;
            }
            
            let mentionText = 'Hey everyone!\n\n';
            let mentions = [];
            
            participants.forEach((participant, index) => {
                mentionText += `${index + 1}. @${participant.id.split('@')[0]}\n`;
                mentions.push(participant.id);
            });
            
            mentionText += `\nTotal: ${participants.length} members`;
            
            await sock.sendMessage(chatId, {
                text: mentionText,
                mentions: mentions
            });
            
            console.log('Tagged all members successfully!');
        } catch (error) {
            console.error('Error:', error.message);
        }
    }
};
