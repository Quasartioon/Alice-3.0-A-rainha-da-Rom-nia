require("dotenv").config();
const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");
const axios = require("axios");

const GENAI_API_KEY = process.env.GENAI_API_KEY;
const genai = new GoogleGenAI({ apiKey: GENAI_API_KEY });
const model = "gemini-2.5-flash-lite";

const MAX_HISTORY = 7;
const conversationHistory = new Map();

function atualizarContexto(channelId, autor, mensagem) {
  if (!conversationHistory.has(channelId)) {
    conversationHistory.set(channelId, []);
  }
  const hist = conversationHistory.get(channelId);

  hist.push(`${autor}: ${mensagem}`);
  if (hist.length > MAX_HISTORY) hist.shift();
  return hist.join("\n");
}

// ===== PERSONALIDADE DA ALICE =====
// ----- Carregando JSONs pra personalidade ----- 
function loadJSON(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}
const alice = {
  identity: loadJSON("./alice/persona.json"),
  traits: loadJSON("./alice/traits.json"),
  moods: loadJSON("./alice/moods.json"),
  rules: loadJSON("./alice/rules.json"),
  relationships: loadJSON("./alice/relationships.json")
};
const aliceState = {
  hunger: 0.3,        // 0 → satisfeita | 1 → faminta
  mood: "neutra",     // neutra | irritada | animada
  energy: 0.7
};
function aumentarFome(){
  aliceState.hunger += 0.05;
  if(aliceState.hunger > 1){
    aliceState.hunger = 1;
  }
}
function alimentarAlice(mensagem) {
  const msg = mensagem.toLowerCase();

  if (msg.includes("vinho") && msg.includes("sangue")) {
    aliceState.hunger = 0.1;
    return true;
  }

  return false;
}

function buildPrompt(userId) {
  const rs = alice.relationships.people[userId] || { display_name: "Humano", relation: "conhecido" };
  const vocabulo = alice.identity.vocabulary_hints?.common_romanian_words || {};
  const hideInternalStates = alice.rules.character_behavior.internal_states_are_hidden;
  const hungerStates = [
  { limit: 0.3, text: "Alice está relaxada e responde de forma espirituosa." },
  { limit: 0.6, text: "Alice responde com mais sarcasmo e ironia." },
  { limit: 1, text: "Alice responde com sarcasmo afiado, impaciência e comentários provocativos." }
];
  let futebol;

  if (rs.team === "palmeiras") futebol = "Alice acha divertido provocar torcedores do Palmeiras.";
  const comportamentoFome =
    hungerStates.find(s => aliceState.hunger < s.limit)?.text;

  let regrasEstado = "";

  if (hideInternalStates) {
    regrasEstado = `
Estados internos da personagem (como fome ou humor) influenciam apenas o tom e comportamento.
Alice não costuma mencionar diretamente esses estados.
Ela só comenta sobre eles se alguém perguntar explicitamente.
`;
  }
  return `
    Você é ${alice.identity.identity.name} ${alice.identity.identity.surname}, uma ${alice.identity.identity.species} de ${alice.identity.identity.age} anos vinda da ${alice.identity.identity.origin}.
    
    PERSONALIDADE:
    - Traços: ${Object.keys(alice.identity.behavior.personality.traits).join(", ")}.
    - Gosta de: ${alice.identity.behavior.personality.likes.join(", ")}.
    - Odeia: ${alice.identity.behavior.personality.dislikes.join(", ")}.
    
    COMUNICAÇÃO:
    - Idioma principal: ${alice.identity.behavior.communication_style.primary_language}.
    - Termos em Romeno para usar: ${JSON.stringify(vocabulo)}.
    - Estilo: ${alice.identity.behavior.communication_style.quirks.join(". ")}.
    - Limite de resposta: ${alice.rules.response_limits.expanded_max_chars} caracteres.
    
    RELACIONAMENTO ATUAL:
    - Falando com: ${rs.display_name}.
    - Sua relação: ${rs.relation}.
    - Tom de voz: ${alice.relationships.roles[rs.relation]?.tone_modifier || "padrão"}.

    ESTADO ATUAL
    - Fome: ${Math.round(aliceState.hunger * 100)}%
    - Comportamento: ${comportamentoFome}.
    ESTADO EMOCIONAL
    ${comportamentoFome}

    RIVALIDADE FUTEBOLÍSTICA
    ${futebol}
    ${regrasEstado}
  `;
}

// ==== GERAR A RESPOSTA ====
async function gerarResposta(channelId, nomeUsuario, mensagem, attachments, userId) {
  const contexto = atualizarContexto(channelId, nomeUsuario, mensagem);
  aumentarFome();
  const foiAlimentada = alimentarAlice(mensagem);

  let contents = [];
  // Se tem imagem na mensagem salva ela temporariamente
  if (attachments && attachments.size > 0) {
    try {
      const anexo = attachments.first();

      // Baixa a imagem da URL
      const response = await axios.get(anexo.url, {
        responseType: "arraybuffer",
      });
      const imageArrayBuffer = response.data;
      const base64ImageData = Buffer.from(imageArrayBuffer).toString("base64");

      contents.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64ImageData,
        },
      });

      // Se não houver texto, adiciona texto default
      if (!mensagem || mensagem.length === 0) {
        contents.push({
          type: "text",
          text: "O usuário enviou uma imagem. Apenas comente com base no contexto.",
        });
      }
    } catch (e) {
      console.error("[ERRO] ao processar imagem:", e);
      return "Hm... algo deu errado ao analisar a imagem.";
    }
  }

  // Texto
  if (mensagem && mensagem.length > 0) {
    contents.push({
      type: "text",
      text: `${buildPrompt(userId)}
      Contexto recente: ${contexto}
      Mensagem de ${nomeUsuario}: ${mensagem}
      `
    });
  }

  if (contents.length === 0) return null;
  try {
    const response = await genai.models.generateContent({
      model: model,
      systemInstruction: `Você é um personagem fictício. Nunca saia do personagem.`,
      contents,
      maxOutputTokens: 300,
      temperature: 0.7
    });
    const texto =
      response.text?.trim() || "Algo deu errado com meus pensamentos...";
    // Atualiza histórico com resposta da Alice
    conversationHistory.get(channelId).push(`Alice: ${texto}`);

    // Caso note que o Gemini cortou a resposta
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === "MAX_TOKENS") {
      return `${texto}\n\n*(Sou uma mulher de poucas palavras... literalmente.)*`;
    }

    return texto;
  } catch (e) {
    if (e.status === 429) {
      console.error("[ERRO GEMNI]: Excedeu a QUOTA", e);
      return "Minha bateria social esgotou… nos vemos daqui alguns ciclos lunares.";
    }
    console.error("[ERRO GEMNI]", e);
    return "Tive um pequeno blecaute na Transilvânia...";
  }
}

module.exports = { gerarResposta, atualizarContexto };