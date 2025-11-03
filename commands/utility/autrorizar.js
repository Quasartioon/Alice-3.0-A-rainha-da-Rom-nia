const {SlashCommandBuilder} = require('discord.js');
const { data } = require('./ping');
module.exports = {
    data: new SlashCommandBuilder()
    .setName('autrorizar')
    .setDescription('Comando de definir canal de conversa da Alice.'),
    async execute(interaction) {
        const canal = message.channel.id;
        await interaction.reply('Comando autorizar executado!');
    },
};