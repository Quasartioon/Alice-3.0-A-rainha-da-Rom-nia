# Tecnologias
O projeto é desenvolvido utilizando a linguagem JavaScript, tendo como ambiente de execução o Node.js. A escolha fundamenta-se principalmente pelo amplo suporte das bibliotecas utilizadas, que possuem maior estabilidade e compatibilidade em suas versões voltadas ao ecossistema JavaScript.
O Node.js oferece uma estrutura modular, escalável e orientada a eventos, adequada para aplicações que dependem de comunicação em tempo real, como bots integrados ao Discord. Seu modelo assíncrono favorece o tratamento eficiente de múltiplas interações simultâneas.
Além disso, utiliza-se o FFmpeg, um framework multimídia responsável pelo processamento e reprodução de áudio. Sua utilização é necessária para que os áudios gerados possam ser corretamente transmitidos durante chamadas de voz no Discord.

# Bibliotecas
O sistema utiliza como principal dependência a biblioteca discord.js (v14.25.1), responsável por toda a comunicação com a API do Discord. Por meio dela, são implementadas funcionalidades como:
- Captura e tratamento de mensagens;
- Execução de comandos;
- Gerenciamento de interações;
- Envio de mensagens;
- Entrada e permanência em canais de voz.
Sem essa biblioteca, a implementação do bot não seria viável.
Para funcionalidades específicas relacionadas a áudio e chamadas de voz, são utilizadas bibliotecas complementares:
-@discordjs/voice: responsável pela manipulação de conexões e transmissões em canais de voz;
-@discordjs/opus: utilizada para codificação e reprodução de áudio durante chamadas.
Para integração com o modelo de linguagem, utiliza-se a biblioteca @google/genai, responsável por realizar a comunicação com a API do Gemini, permitindo a geração dinâmica das respostas do bot.
A biblioteca dotenv é utilizada para o gerenciamento seguro de variáveis de ambiente, armazenando tokens e chaves de API no arquivo .env, que não é exposto publicamente.
Biblioteca do ElevenLabs, @elevenlabs, utilizada para conversão de texto em fala (Text-to-Speech).
Quando o bot está conectado a uma chamada de voz, o texto gerado pelo modelo Gemini é enviado para a API da ElevenLabs, que retorna um arquivo de áudio (.mp3). Esse arquivo é então reproduzido no canal de voz através das bibliotecas de áudio do Discord.
Por fim, utiliza-se libsodium-wrappers, biblioteca exigida pelo Discord para garantir a criptografia e proteção dos pacotes de áudio transmitidos entre o bot e os servidores da plataforma.
