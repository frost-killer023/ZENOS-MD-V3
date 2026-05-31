const { formatUptime, randomItem, OWNER_NUMBER } = require('../lib/helper');
const moment = require('moment-timezone');
const fs = require('fs-extra');
const path = require('path');

const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');

function getSettings() {
    try { return fs.readJsonSync(settingsPath); } catch { return { theme: 'default', prefix: '!', botName: 'ZENOS-MD-V1' }; }
}

const commands = {
    menu: async ({ sock, msg, startTime, botName, prefix }) => {
        const settings = getSettings();
        const uptime = formatUptime(Math.floor((Date.now() - startTime) / 1000));
        const jid = msg.key.remoteJid;
        const menu = `╔══════════════════════════╗
║      🤖 ${settings.botName || botName}      
║    𝗕𝗼𝘁 𝗠𝘂𝗹𝘁𝗶𝘀𝗲𝗿𝘃𝗶𝗰𝗲𝘀   ║
╠══════════════════════════╣
║ Préfixe : ${settings.prefix || prefix}              ║
║ Mode    : Privé 🔒       ║
║ Owner   : ${OWNER_NUMBER}  ║
║ Uptime  : ${uptime}      ║
╠══════════════════════════╣
║ 📌 CATÉGORIES            ║
║                          ║
║ 1️⃣  Général              ║
║ 2️⃣  Fun & Jeux           ║
║ 3️⃣  Médias & Stickers    ║
║ 4️⃣  Utilitaires          ║
║ 5️⃣  Informations         ║
║ 6️⃣  Administration       ║
║ 7️⃣  Confidentialité      ║
║ 8️⃣  Conversion           ║
║ 9️⃣  Groupe               ║
║ 🔟  IA & Intelligence    ║
║ 1️⃣1️⃣ Effets Audio        ║
║ 1️⃣2️⃣ Édition Image      ║
║ 1️⃣3️⃣ Logos & Effets     ║
║ 1️⃣4️⃣ Outils Bot         ║
║ 1️⃣5️⃣ Économie           ║
╚══════════════════════════╝
Tape *${settings.prefix || prefix}menu <catégorie>* pour les commandes
Ex: *${settings.prefix || prefix}menu fun*`;
        await sock.sendMessage(jid, { text: menu });
    },

    ping: async ({ sock, msg }) => {
        const start = Date.now();
        await sock.sendMessage(msg.key.remoteJid, { text: '🏓 Calcul...' });
        const end = Date.now();
        await sock.sendMessage(msg.key.remoteJid, { text: `🏓 *Pong!* ${end - start}ms` });
    },

    info: async ({ sock, msg, startTime, botName, prefix }) => {
        const uptime = formatUptime(Math.floor((Date.now() - startTime) / 1000));
        const now = moment().tz('Africa/Abidjan').format('DD/MM/YYYY HH:mm:ss');
        const text = `╔══════════════════════════╗
║    ℹ️ INFOS BOT ZENOS    ║
╠══════════════════════════╣
║ 🤖 Nom     : ${botName}
║ 📌 Préfixe : ${prefix}
║ ⏰ Uptime  : ${uptime}
║ 📅 Date    : ${now}
║ 🔒 Mode    : Privé
║ 💻 Runtime : Node.js
║ 📦 Lib     : Baileys
║ 🌐 Version : 1.0.0
╚══════════════════════════╝`;
        await sock.sendMessage(msg.key.remoteJid, { text });
    },

    uptime: async ({ sock, msg, startTime }) => {
        const uptime = formatUptime(Math.floor((Date.now() - startTime) / 1000));
        await sock.sendMessage(msg.key.remoteJid, { text: `⏰ *Uptime du bot:* ${uptime}` });
    },

    botname: async ({ sock, msg, botName }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `🤖 *Nom du bot:* ${botName}` });
    },

    owner: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: `👑 *Propriétaire:* +${OWNER_NUMBER}` });
    },

    hello: async ({ sock, msg }) => {
        const greetings = ['Bonjour! 👋 Comment puis-je vous aider?', 'Salut! 😊 Je suis ZENOS-MD, à votre service!', 'Hello! 🌟 Prêt à vous aider!'];
        await sock.sendMessage(msg.key.remoteJid, { text: randomItem(greetings) });
    },

    date: async ({ sock, msg }) => {
        const now = moment().tz('Africa/Abidjan');
        const text = `📅 *Date et heure actuelles:*\n\n📆 Date: ${now.format('dddd DD MMMM YYYY')}\n⏰ Heure: ${now.format('HH:mm:ss')}\n🌍 Fuseau: Africa/Abidjan`;
        await sock.sendMessage(msg.key.remoteJid, { text });
    },

    about: async ({ sock, msg }) => {
        const text = `╔══════════════════════════╗
║    🤖 À PROPOS DU BOT    ║
╠══════════════════════════╣
║ ZENOS-MD-V1 est un bot   ║
║ WhatsApp multiservices   ║
║ privé, développé en      ║
║ Node.js avec Baileys.    ║
║                          ║
║ ✨ Fonctionnalités:      ║
║ • +150 commandes         ║
║ • Fun & Jeux             ║
║ • Téléchargements        ║
║ • IA intégrée            ║
║ • Gestion de groupes     ║
║ • Système économique     ║
║ • Effets audio/image     ║
╚══════════════════════════╝`;
        await sock.sendMessage(msg.key.remoteJid, { text });
    },

    aide: async ({ sock, msg, args }) => {
        const category = args[0]?.toLowerCase();
        const categories = {
            general: '📌 *Général:* menu, ping, info, uptime, botname, owner, hello, date, about',
            fun: '🎭 *Fun:* joke, fact, quote, 8ball, flip, dice, random, love, reverse, mock, encrypt, decrypt, roast, story, riddle, ascii',
            media: '📸 *Médias:* sticker, toimg, ytmp3, ytmp4, tiktok, instagram, qr, image',
            utils: '🛠️ *Utilitaires:* calc, translate, weather, currency, password, hash, ip, define, bmi, age',
            info: 'ℹ️ *Infos:* news, wiki, crypto, country, movie, anime, lyrics',
            admin: '👑 *Admin:* restart, status, eval, shell, block, unblock, broadcast, logs',
            groupe: '👥 *Groupe:* tagall, kick, promote, demote, gcreate, link, ginfo, warn, antilink, welcome'
        };
        if (category && categories[category]) {
            await sock.sendMessage(msg.key.remoteJid, { text: categories[category] });
        } else {
            const list = Object.entries(categories).map(([k, v]) => `• *${k}*`).join('\n');
            await sock.sendMessage(msg.key.remoteJid, { text: `📚 *Catégories disponibles:*\n${list}\n\nEx: !aide fun` });
        }
    },

    allmenu: async ({ sock, msg, prefix }) => {
        const text = `╔══════════════════════════╗
║    📋 TOUTES LES CMDS    ║
╠══════════════════════════╣
║ 1️⃣ GÉNÉRAL              ║
║ menu, ping, info, uptime ║
║ botname, owner, hello    ║
║ date, about, aide        ║
╠══════════════════════════╣
║ 2️⃣ FUN                  ║
║ joke, fact, quote, 8ball ║
║ flip, dice, random, love ║
║ reverse, mock, roast     ║
║ story, riddle, ascii     ║
╠══════════════════════════╣
║ 3️⃣ MÉDIAS               ║
║ sticker, toimg, ytmp3    ║
║ ytmp4, tiktok, instagram ║
║ qr, image                ║
╠══════════════════════════╣
║ 4️⃣ UTILITAIRES          ║
║ calc, translate, weather ║
║ currency, password, hash ║
║ ip, define, bmi, age     ║
║ shorturl, color, unit    ║
╠══════════════════════════╣
║ 5️⃣ INFORMATIONS         ║
║ news, wiki, crypto, movie║
║ anime, country, lyrics   ║
╠══════════════════════════╣
║ 6️⃣ ADMINISTRATION       ║
║ restart, status, eval    ║
║ shell, block, unblock    ║
║ broadcast, logs          ║
╠══════════════════════════╣
║ 7️⃣ GROUPE               ║
║ tagall, kick, promote    ║
║ demote, link, ginfo      ║
║ warn, antilink, welcome  ║
╠══════════════════════════╣
║ 8️⃣ IA                   ║
║ gpt, gemini, claude      ║
║ blackbox, llama, dalle   ║
╠══════════════════════════╣
║ 9️⃣ ÉCONOMIE             ║
║ myecon, depot, retrait   ║
║ vol, pari, slot, bonus   ║
║ tictactoe, transfer      ║
╚══════════════════════════╝
Préfixe: *${prefix}*`;
        await sock.sendMessage(msg.key.remoteJid, { text });
    }
};

const aliases = {
    'start': 'menu',
    'help': 'aide',
    'aide2': 'aide',
    'upt': 'uptime',
    'hi': 'hello'
};

module.exports = { commands, aliases };
