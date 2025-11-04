module.exports = {
    name: '.help',
    description: 'Show available commands',
    execute: async (sock, msg) => {
        try {
            const helpText = `
🤖 *WhatsApp TagAll Bot*

📋 *Available Commands:*

*.tagall*
└ Tag all members in the group
└ Admin only command

*.help*
└ Show this help message

💡 *Note:* Only group admins can use .tagall

✨ Bot is ready to use!
            `;

            await sock.sendMessage(msg.key.remoteJid, {
                text: helpText.trim()
            });
            
            console.log('✅ Help command executed');
        } catch (error) {
            console.error('❌ Error in help command:', error);
        }
    }
};