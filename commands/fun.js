const { randomInt, randomItem, cleanText } = require('../lib/helper');

const blagues = [
    "Pourquoi les plongeurs plongent-ils toujours en arrière? Parce que sinon ils tomberaient dans le bateau! 😂",
    "Qu'est-ce qu'un canif? Un petit fien! 🤣",
    "Pourquoi Batman ne peut-il pas manger? Parce que Robin lui a mangé sa soupe! 😄",
    "Qu'est-ce qu'un crocodile qui surveille la cour? Un sac à dents! 😆",
    "Comment appelle-t-on un chat tombé dans un pot de peinture? Un chat-peint! 😂",
    "Qu'est-ce qu'un caniche qui chante sous la pluie? Un bichon mouillé! 😁",
    "Pourquoi l'épouvantail a-t-il reçu un prix? Parce qu'il se débrouillait dans son domaine! 😄",
    "Qu'est-ce qu'un éléphant dans une boîte aux lettres? Un problème de courrier! 😂"
];

const facts = [
    "🦦 Les loutres de mer se tiennent par la patte pour ne pas se perdre en dormant!",
    "🐙 Les poulpes ont trois cœurs et leur sang est bleu!",
    "🌙 Il y a de l'eau sur la Lune sous forme de glace!",
    "🍯 Le miel ne se périme jamais - on a trouvé du miel vieux de 3000 ans dans des tombes égyptiennes!",
    "🐘 Les éléphants sont les seuls animaux qui ne peuvent pas sauter!",
    "🦋 Les papillons goûtent avec leurs pieds!",
    "🍕 La pizza est originellement un plat napolitain datant du 18e siècle!",
    "🐬 Les dauphins ont des noms individuels et s'appellent entre eux!"
];

const citations = [
    '"La vie c\'est comme une bicyclette, il faut avancer pour ne pas perdre l\'équilibre." - Einstein 💡',
    '"Le succès c\'est tomber sept fois, se relever huit." - Proverbe japonais 🎌',
    '"Soyez le changement que vous voulez voir dans le monde." - Gandhi ✨',
    '"L\'imagination est plus importante que la connaissance." - Einstein 🧠',
    '"La seule façon de faire du bon travail est d\'aimer ce qu\'on fait." - Steve Jobs 💼',
    '"Chaque expert a été un jour un débutant." - Helen Hayes 🌱',
    '"Le bonheur n\'est pas quelque chose de prêt à l\'emploi. Il vient de vos propres actions." - Dalaï Lama 🙏'
];

const magicBall = [
    "✅ C'est certain!", "✅ Oui, définitivement!", "✅ Sans aucun doute!",
    "✅ Oui!", "✅ Les signes pointent vers oui", "⚠️ Réponds plus tard...",
    "⚠️ Ne compte pas dessus", "❌ Non", "❌ Très peu probable",
    "❌ Mes sources disent non", "❌ Perspective pas bonne", "❓ Difficile à dire"
];

const roasts = [
    "Tu es la raison pour laquelle les notices viennent avec des instructions simples! 😂",
    "Tu aurais besoin d'un GPS pour trouver ta personnalité! 🗺️",
    "Si l'intelligence était de l'eau, tu serais un désert! 🏜️",
    "Tu n'es pas bête, tu imites juste parfaitement! 🎭",
    "Même ton miroir pleure quand tu pars au travail! 😭",
    "Tu es si lent que tu rattrapes tes propres tortues! 🐢"
];

const stories = [
    "🌟 Il était une fois un robot qui rêvait d'être humain. Un jour il réalisa que les humains rêvaient d'être des robots. La morale: l'herbe est toujours plus verte ailleurs!",
    "🚀 Un astronaute se perd dans l'espace. Il trouve une planète peuplée de chats géants. Les chats l'ignorent royalement. Certaines cultures sont universelles.",
    "🐉 Un dragon apprend à coder. Son premier programme bug. Il brûle son ordinateur. Certains bogues ne méritent pas de solution.",
    "🧙 Un sorcier crée une potion pour être populaire. Il devient une bouteille de ketchup. Leçon: lis toujours les instructions!"
];

const riddles = [
    { q: "Je suis plein le jour et vide la nuit. Qu'est-ce que je suis?", r: "Des chaussures! 👟" },
    { q: "Je cours mais n'ai pas de jambes, j'ai une bouche mais ne parle pas. Qui suis-je?", r: "Une rivière! 🌊" },
    { q: "Plus je sèche, plus je suis mouillée. Qu'est-ce que je suis?", r: "Une serviette! 🏊" },
    { q: "Je peux voler sans ailes, tomber sans jambes. Qu'est-ce que je suis?", r: "La neige! ❄️" },
    { q: "Plus tu en prends, plus tu en laisses derrière toi. Qu'est-ce que c'est?", r: "Des pas! 👣" }
];

const commands = {
    joke: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `😂 *Blague du jour:*\n\n${randomItem(blagues)}` });
    },

    fact: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `🤓 *Fait insolite:*\n\n${randomItem(facts)}` });
    },

    quote: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `💬 *Citation du jour:*\n\n${randomItem(citations)}` });
    },

    '8ball': async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❓ Pose-moi une question!\nEx: !8ball Est-ce que je vais réussir?' });
        const answer = randomItem(magicBall);
        await sock.sendMessage(msg.key.remoteJid, { text: `🔮 *Boule Magique*\n\n❓ Question: ${body}\n${answer}` });
    },

    flip: async ({ sock, msg }) => {
        const result = Math.random() < 0.5 ? '🪙 *PILE!*' : '🪙 *FACE!*';
        await sock.sendMessage(msg.key.remoteJid, { text: `🪙 *Lancer de pièce:*\n\n${result}` });
    },

    dice: async ({ sock, msg }) => {
        const result = randomInt(1, 6);
        const emojis = ['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];
        await sock.sendMessage(msg.key.remoteJid, { text: `🎲 *Lancer de dé:*\n\n${emojis[result]} (${result})` });
    },

    random: async ({ sock, msg, args }) => {
        const min = parseInt(args[0]) || 1;
        const max = parseInt(args[1]) || 100;
        if (min >= max) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Le minimum doit être inférieur au maximum!' });
        const result = randomInt(min, max);
        await sock.sendMessage(msg.key.remoteJid, { text: `🎲 *Nombre aléatoire entre ${min} et ${max}:*\n\n*${result}*` });
    },

    love: async ({ sock, msg, args }) => {
        if (args.length < 2) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !love <prenom1> <prenom2>' });
        const p1 = args[0];
        const p2 = args[1];
        const score = randomInt(1, 100);
        let emoji = score >= 80 ? '💑 Parfaits l\'un pour l\'autre!' : score >= 60 ? '💕 Bonne compatibilité!' : score >= 40 ? '💛 Peut fonctionner!' : '💔 Pas idéal...';
        await sock.sendMessage(msg.key.remoteJid, { text: `💘 *Test d'Amour*\n\n❤️ ${p1} + ${p2}\n\n━━━━━━━━━━━━\n🌡️ Compatibilité: *${score}%*\n${emoji}\n━━━━━━━━━━━━` });
    },

    reverse: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !reverse <texte>' });
        const reversed = body.split('').reverse().join('');
        await sock.sendMessage(msg.key.remoteJid, { text: `🔄 *Texte inversé:*\n\n${reversed}` });
    },

    mock: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !mock <texte>' });
        const mocked = body.split('').map((c, i) => i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()).join('');
        await sock.sendMessage(msg.key.remoteJid, { text: `🐸 ${mocked}` });
    },

    encrypt: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !encrypt <texte>' });
        const encoded = Buffer.from(body).toString('base64');
        await sock.sendMessage(msg.key.remoteJid, { text: `🔐 *Texte encodé (Base64):*\n\n${encoded}` });
    },

    decrypt: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !decrypt <texte_base64>' });
        try {
            const decoded = Buffer.from(body, 'base64').toString('utf-8');
            await sock.sendMessage(msg.key.remoteJid, { text: `🔓 *Texte décodé:*\n\n${decoded}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Texte base64 invalide!' });
        }
    },

    ascii: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !ascii <texte>' });
        const art = body.toUpperCase().split('').join(' ');
        await sock.sendMessage(msg.key.remoteJid, { text: `🎨 *Art ASCII:*\n\n${art}` });
    },

    roast: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `🔥 *Vanne:*\n\n${randomItem(roasts)}` });
    },

    story: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `📖 *Mini-histoire:*\n\n${randomItem(stories)}` });
    },

    riddle: async ({ sock, msg }) => {
        const r = randomItem(riddles);
        await sock.sendMessage(msg.key.remoteJid, { text: `🧩 *Devinette:*\n\n❓ ${r.q}\n\n||Réponse: ${r.r}||` });
    },

    fliptext: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !fliptext <texte>' });
        const map = { a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z' };
        const flipped = body.toLowerCase().split('').map(c => map[c] || c).reverse().join('');
        await sock.sendMessage(msg.key.remoteJid, { text: `🙃 *Texte retourné:*\n\n${flipped}` });
    },

    ship: async ({ sock, msg, args }) => {
        if (args.length < 2) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !ship <personne1> <personne2>' });
        const score = randomInt(1, 100);
        const bar = '█'.repeat(Math.floor(score / 10)) + '░'.repeat(10 - Math.floor(score / 10));
        await sock.sendMessage(msg.key.remoteJid, { text: `💕 *Ship Test*\n\n${args[0]} ❤️ ${args[1]}\n\n[${bar}] ${score}%\n\n${score > 70 ? '💑 Match parfait!' : score > 40 ? '💛 Possible!' : '💔 Hmm...'}` });
    },

    fancy: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !fancy <texte>' });
        const normal = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const fancy = '𝒶𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁𝓂𝓃𝑜𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗';
        let result = '';
        for (const c of body) {
            const i = normal.indexOf(c);
            result += i !== -1 ? fancy[i] : c;
        }
        await sock.sendMessage(msg.key.remoteJid, { text: `✨ *Texte Fancy:*\n\n${result}` });
    },

    profile: async ({ sock, msg, sender }) => {
        const number = sender.replace('@s.whatsapp.net', '');
        let ppUrl = null;
        try { ppUrl = await sock.profilePictureUrl(sender, 'image'); } catch {}
        const text = `👤 *Profil WhatsApp*\n\n📱 Numéro: +${number}\n🆔 JID: ${sender}\n🖼️ Photo: ${ppUrl ? 'Disponible' : 'Privée'}`;
        if (ppUrl) {
            const { default: fetch } = require('node-fetch');
            const res = await fetch(ppUrl);
            const buf = await res.buffer();
            await sock.sendMessage(msg.key.remoteJid, { image: buf, caption: text });
        } else {
            await sock.sendMessage(msg.key.remoteJid, { text });
        }
    }
};

const aliases = {
    'blague': 'joke',
    'citation': 'quote',
    'devinette': 'riddle',
    'histoire': 'story',
    'match': 'ship',
    'compatibilite': 'love'
};

module.exports = { commands, aliases };
