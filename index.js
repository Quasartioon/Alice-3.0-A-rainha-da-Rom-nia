/* eslint-disable indent */
const fs = require("fs"); 
const { gerarResposta } = require("./services/ai_service");
const { canalAtual } = require("./commands/utility/autorizar");
const { Client, GatewayIntentBits, Events } = require("discord.js");
const { falar } = require("./services/tts_service");

const clientDiscord = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers, 
    GatewayIntentBits.GuildVoiceStates,
  ],
});

require("dotenv").config();
const token = process.env.DISCORD_TOKEN;
const prefixo = "a";

// Evento de inicialização do cliente
clientDiscord.once(Events.ClientReady, (readyClient) => {
  console.log(
    `Pronto! A rainha da Romênia está devolta como: ${readyClient.user.tag}`
  );
});

// Carregar comandos do diretório
clientDiscord.commands = new Map();
const comandosArquivos = fs
  .readdirSync("./commands/utility")
  .filter((file) => file.endsWith(".js"));

for (const file of comandosArquivos) {
  const comando = require(`./commands/utility/${file}`);
  clientDiscord.commands.set(comando.data.name, comando);
}

// Evento de interação
clientDiscord.on("messageCreate", async (message) => {
  console.log("Recebi mensagem de", message.author.username, "no canal:", message.channel.name, "->", message.content);

  // Ignora bots
  //if (message.author.bot) return;
  if (message.author.bot || message.author.id === clientDiscord.user.id) return; // Se for bot e ela mesma, ignora

  const args = message.content.slice(prefixo.length).trim().split(/ +/);
  const comandoNome = args.shift().toLowerCase();

  // === Comandos de prefixos ===
  if (message.content.startsWith(prefixo)) {
    // filtra apenas mensagens com prefixo
    const comando = clientDiscord.commands.get(comandoNome);
    if (!comando) return;
    try {
      comando.execute(message, args);
    } catch (error) {
      console.error(error);
      message.reply("Houve um erro ao executar esse comando!");
    }
  }

  // === IA DA ALICE AQUI ===

  if (message.content.length > 200) return; // ignora mensagens muito longas
  if (message.content.startsWith(prefixo)) return; // ignora comandos
  if (canalAtual() && message.channel.id !== canalAtual() && message.channel.name === 'alice') return; // ignora canais não autorizados (implementar depois)

  try {
    const resposta = await gerarResposta(
      message.channel.id, 
      message.author.id,
      message.author.username,
      message.content,
      message.attachments
    );
    message.reply(resposta);


    // FALAR CASO ESTÁ NA CALL 
    const voiceChannel = message.member.voice.channel;
    if (voiceChannel) {
      falar(resposta, voiceChannel);
    }


  } catch (error) {
    console.error("[ERRO] ao gerar resposta da Alice: ", error);
    message.reply(
      "Houve um erro ao Me distraí pensando em sangue... digo, em bytes! Pode repetir?"
    );
  }
});

clientDiscord.login(token);
