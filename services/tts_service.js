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
  texto = String(texto);
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
let player;
// ========== TOCAR ÁUDIO ==========
async function falar(texto, voiceChannel) {
  if(!voiceChannel) return;
  
  texto = String(texto);
  let connection = getVoiceConnection(voiceChannel.guild.id);
  if (!connection) return;
 
  const filePath = await gerarAudio(texto);

  const resource = createAudioResource(filePath);
  player = createAudioPlayer();
  connection.subscribe(player);
  player.on("error", (error) => {
    console.error("[AUDIO ERRO]:", error);
  });
  player.play(resource);

  return new Promise(resolve => {
    player.once(AudioPlayerStatus.Idle, () => {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      resolve();
    });
  });
}

module.exports = { falar };
