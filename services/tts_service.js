require("dotenv").config();
const fs = require("fs");
const path = require("path");
const {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus
} = require("@discordjs/voice");
const { ElevenLabsClient } = require("@elevenlabs/elevenlabs-js");

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVEN_LABS_TOKEN
});

const VOZ_ID = "33B4UnXyTNbgLmdEDh5P";
const MODELO = "eleven_multilingual_v2";

// ========== PASTA TEMP ==========
const tempFolder = path.join(process.cwd(), "temp");
if (!fs.existsSync(tempFolder)) {
  fs.mkdirSync(tempFolder);
  console.log("[LOG] Pasta /temp criada");
}

// ========== GERAR ÁUDIO ==========
async function gerarAudio(texto) {
  console.log("[LOG] Gerando áudio ElevenLabs...");

  const stream = await elevenlabs.textToSpeech.convert(VOZ_ID, {
    text: texto,
    modelId: MODELO,
    OutputFormat: "mp3_44100_128",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.1,
      use_speaker_boost: true,
    },
  });

  console.log("[LOG] Stream recebido, convertendo para buffer...");

  const chunks = [];
  for await (const c of stream) chunks.push(c);
  const buffer = Buffer.concat(chunks);

  const filePath = path.join(tempFolder, `audio_${Date.now()}.mp3`);
  fs.writeFileSync(filePath, buffer);

  console.log("[LOG] Áudio salvo em:", filePath);

  return filePath;
}

// ========== TOCAR ÁUDIO ==========
async function falar(texto, voiceChannel) {
  if (!voiceChannel) {
    console.log("[ERRO] Usuário NÃO está em call.");
    return;
  }

  console.log("[LOG] Usuário está na call:", voiceChannel.name);

  let connection = getVoiceConnection(voiceChannel.guild.id);
  
  if (!connection) {
    console.log("[LOG] Bot NÃO estava na call, conectando...");
    connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator
    });
  } else {
    console.log("[LOG] Bot já está na call.");
  }

  const filePath = await gerarAudio(texto);

  console.log("[LOG] Criando AudioResource...");
  let resource;
  try {
    resource = createAudioResource(filePath, {inputType: 'arbitrary'});
  } catch (err) {
    console.error("[ERRO] createAudioResource falhou:", err);
    return;
  }

  console.log("[LOG] Criando AudioPlayer...");
  const player = createAudioPlayer();

  player.on("stateChange", (oldState, newState) => {
    console.log(`[AUDIO] Estado: ${oldState.status} -> ${newState.status}`);
  });

  player.on("error", (error) => {
    console.error("[AUDIO ERRO]:", error);
  });

  console.log("[LOG] Dando play...");
  player.play(resource);

  console.log("[LOG] Inscrevendo conexão...");
  connection.subscribe(player);

  player.on(AudioPlayerStatus.Idle, () => {
    console.log("[LOG] Áudio terminou, apagando arquivo:", filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });
}

module.exports = { falar };
