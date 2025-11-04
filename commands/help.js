module.exports = {
    name: '.help',
    description: 'Show help',
    execute: async (sock, msg) => {
        const helpText = `WhatsApp TagAll Bot

.help - Show this message
.tagall - Tag all members (admin only)

Bot is active!`;
        
        await sock.sendMessage(msg.key.remoteJid, { text: helpText });
        console.log('Help command executed');
    }
};
