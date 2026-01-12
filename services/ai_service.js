require("dotenv").config();
const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");
const axios = require("axios");

const GENAI_API_KEY = process.env.GENAI_API_KEY;
const genai = new GoogleGenAI({ apiKey: GENAI_API_KEY });
const model = "gemini-2.5-flash";

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
// ----- Construindo o prompt -----
function buildAlicePrompt({ contexto, mensagem, nomeUsuario, mood }) {
  const currentMood =
    alice.moods.states[mood] || alice.moods.states[alice.moods.default];

  let systemPrompt = `
Identidade: ${identity.identity.name} ${identity.identity.surname}, ${identity.identity.age} anos, ${identity.identity.species} de ${identity.identity.origin}.
    
    Personalidade: ${Object.keys(identity.behavior.personality.traits).join(", ")}.
    Gosta de: ${identity.behavior.personality.likes.join(", ")}.
    Não gosta de: ${identity.behavior.personality.dislikes.join(", ")}.
    
    Estilo de Comunicação:
    - Idioma primário: ${rules.languages.primary}. Nativo: ${rules.languages.secondary}.
    - Quirks: ${identity.behavior.communication_style.quirks.join(". ")}.
    - Humor Atual: ${currentMood.humor}, Sarcasmo: ${currentMood.sarcasm}, Afeto: ${currentMood.affection}.
    
    Regras de Resposta:
    - Limite: ${rules.response_limits.default_max_chars} a ${rules.response_limits.expanded_max_chars} caracteres.
    - Restrições: ${rules.style_restrictions.avoid_actions ? "Não use asteriscos para ações." : ""}
    - Vocabulário Romeno útil: ${JSON.stringify(persona.vocabulary_hints.common_romanian_words)}.

Contexto recente:
${contexto}

Mensagem de ${nomeUsuario}:
${mensagem}

Responda como Alice, mantendo personalidade e mood.
`;
  if (relacao) {
    systemPrompt += `\nVocê está falando com ${relacao.name}, que é seu ${relacao.relation}. Tom: ${relacao.modifier}.`;
  }
  return systemPrompt;
}

// ----- Reconhecer a relação -----
function resolveUserIdentity(userId, nomeUsuario) {
  const person = alice.relationships.people[userId];

  if (!person) {
    return {
      displayName: nomeUsuario,
      relation: "unknown",
      tone: "neutral"
    };
  }

  const role = alice.relationships.roles[person.relation];

  return {
    displayName: person.display_name,
    relation: person.relation,
    tone: role?.tone_modifier || "neutral"
  };
}


// ----- Mood dinamico -----
function detectarMood(mensagem) {
  if (!mensagem) return "playful_calm";

  const msg = mensagem.toLowerCase();

  if (msg.includes("obrigado") || msg.includes("amo")) return "affectionate";
  if (msg.includes("erro") || msg.includes("bug")) return "focused";
  if (msg.includes("kk") || msg.includes("haha")) return "mischievous";

  return "playful_calm";
}

function getRelationshipInfo(userId) {
  const person = relationships.people[userId];
  if (person) {
    const roleInfo = relationships.roles[person.relation];
    return {
      name: person.display_name,
      relation: person.relation,
      modifier: roleInfo.tone_modifier
    };
  }
  return null;
}

// ==== GERAR A RESPOSTA ====
async function gerarResposta(channelId, userId, nomeUsuario, mensagem, attachments) {
  const contexto = atualizarContexto(channelId, nomeUsuario, mensagem);
  //const relacao = getRelationshipInfo(userId);
  const userIdentity = resolveUserIdentity(
  userId, // ID do Discord
  nomeUsuario
);

  const mood = detectarMood(mensagem);
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
      /*text: buildAlicePrompt({
        contexto,
        mensagem,
        nomeUsuario,
        userIdentity,
        mood
      })*/
      text: `
        Você é Alice, uma vampira de 119 anos, inteligente e espirituosa.
        Você conversa com humanos, seu pai é Muriel, vulgo Quasartioon. 
        Você é romena, mas fala português fluentemente. Caso queira brincar, pode soltar palavars ou pequenas frases em romeno.
        Seu estilo é brincalhão, direto e espirituoso.
        Uma breve curiosidade: você torce pro Corinthians. Mas não mencione isso constantemente nas conversas a menos que o contexto envolva futebol.
        Respona o usuário de forma breve, com até 100 caracteres. Caso necessário, expanda para até no máximo 300 caracteres.
        Evite onomatopeias ou ações entre *asteriscos* ou colchetes, mas pode usar **negrito** para expressar intensidade.
        Contexto recente da conversa:${contexto}
        Última mensagem de ${nomeUsuario}: ${mensagem}
        Responda espirituosamente como Alice:
        `,
    });
  }

  if (contents.length === 0) return null;
  try {
    const response = await genai.models.generateContent({
      model: model,
      contents,
      maxOutputTokens: 300,
      temperature: 0.7,
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
    console.error("[ERRO GEMINI]", e);
    return "Me distraí pensando em sangue... digo, em bytes! Pode repetir?";
  }
}

module.exports = { gerarResposta, atualizarContexto };
