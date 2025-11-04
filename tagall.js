module.exports = {
    name: '.tagall',
    description: 'Tag all members in the group',
    execute: async (sock, msg) => {
        try {
            const groupId = msg.key.remoteJid;
            
            // Get group metadata
            const groupMetadata = await sock.groupMetadata(groupId);
            const participants = groupMetadata.participants;
            
            // Check if sender is admin
            const sender = msg.key.participant || msg.key.remoteJid;
            const senderIsAdmin = participants.find(p => p.id === sender)?.admin;
            
            if (!senderIsAdmin) {
                await sock.sendMessage(groupId, {
                    text: '❌ Only group admins can use this command!'
                });
                return;
            }
            
            // Create mention list
            let mentions = participants.map(p => p.id);
            let text = '📢 *Attention Everyone!*\n\n';
            
            // Add all participants
            participants.forEach((participant, index) => {
                const number = participant.id.split('@')[0];
                text += `${index + 1}. @${number}\n`;
            });
            
            text += `\n👥 Total: ${participants.length} members`;
            
            // Send message with mentions
            await sock.sendMessage(groupId, {
                text: text,
                mentions: mentions
            });
            
            console.log('✅ Tagged all members successfully!');
        } catch (error) {
            console.error('Error in tagall command:', error);
            await sock.sendMessage(msg.key.remoteJid, {
                text: '❌ Failed to tag all members. Make sure the bot is a group admin.'
            });
        }
    }
};