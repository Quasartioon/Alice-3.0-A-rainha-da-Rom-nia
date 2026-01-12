const { SlashCommandBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');
const { falar } = require('../../services/tts_service');

module.exports = {
    data: new SlashCommandBuilder()
    .setName('finalizar')
    .setDescription('Finaliza a acll de hoje'),
    async execute(message, args) {
        const tempoContagem = parseInt(args[0]);
        const voiceChannel = message.member.voice.channel;
        const botMember = message.guild.members.me;


        if (isNaN(tempoContagem) || tempoContagem <= 0) {
            return message.reply('Ai cê me quebra… manda um número **maior que zero** aí 😑');
        }

        await message.reply(`Contagem regressiva iniciando em **${tempoContagem}**… 🎙️`);

        for (let i = tempoContagem; i >= 1; i--) {
            await falar(String(i), voiceChannel);
        }

        // --- Desconectar geral ---
        /*voiceChannel.members.forEach(async member => {
            if (member.id === botMember.id) return;

            try {
                await member.voice.disconnect();
            } catch (error) {
                if (error.code === 50013) {
                    message.channel.send(
                        `Tô sendo oprimida, não consigo tirar ${member.user.toString()} da call 😭`
                    );
                } else {
                    message.channel.send(
                        `Erro ao desconectar ${member.user.toString()}: ${error.message}`
                    );
                }
            }
        });*/
        const connection = getVoiceConnection(voiceChannel.guild.id);
        if (connection) connection.destroy();

        // --- Desconectar membros ---
        for (const member of voiceChannel.members.values()){
            if(member.user.bot) continue;
            try {
                await member.voice.disconnect();
            } catch (error){
                 if (error.code === 50013) {
                    message.channel.send(
                        `Tô sendo oprimida, não consigo tirar ${member.user.toString()} da call 😭`
                    );
                } else {
                    message.channel.send(
                        `Erro ao desconectar ${member.user.toString()}: ${error.message}`
                    );
                }
            }
        }

        await message.channel.send('Boa noite rapaziada! @everyone 🌙');
    }
};
