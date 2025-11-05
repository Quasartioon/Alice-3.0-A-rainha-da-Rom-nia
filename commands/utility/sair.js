const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sair')
    .setDescription('Comando de fazer a Alice sair da call'),

  async execute(interaction) {
    const connection = getVoiceConnection(interaction.guild.id);

    if (!connection) {
      await interaction.reply("Não estou em nenhuma call");
      return;
    }

    connection.destroy();
    await interaction.reply("Finalmente descanso...");
  }
};
