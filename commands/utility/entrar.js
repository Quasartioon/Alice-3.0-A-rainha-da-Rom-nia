const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder().setName('entrar').setDescription('Comando de fazer a Alice entrar na call'),
  
  async execute(interaction) {
    const userVoiceOn = interaction.member.voice.channel;
    const botVoiceOn = getVoiceConnection(interaction.guild.id);

    if (botVoiceOn) {
      await interaction.reply("Já estou em uma call! Me desconecta primeiro.");
      return;
    }

    if (userVoiceOn) {
        await interaction.reply("To entrando...");
        joinVoiceChannel({
          channelId: userVoiceOn.id,
          guildId: userVoiceOn.guild.id,
          adapterCreator: userVoiceOn.guild.voiceAdapterCreator,
        });
    }else{
        await interaction.reply("Aí cê me quebra, você precisa estar em uma call.");
        return;
    }
    

  }
};
