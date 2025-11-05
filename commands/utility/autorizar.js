const { SlashCommandBuilder } = require('discord.js');
let canal = "923121181975007232"

module.exports = {
    data: new SlashCommandBuilder().setName('autorizar').setDescription('Comando de definir canal de conversa da Alice.'),
    async execute(interaction) {
        canal = interaction.channel.id;
        await interaction.reply('✅ Canal autorizado. Irei conversar aqui');
    },
    canalAtual:() => canal
};