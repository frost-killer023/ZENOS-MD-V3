const { formatUptime, randomItem, OWNER_NUMBER, getOwnerJid } = require('../lib/helper');
const { getAllCommands } = require('../lib/commandHandler');
const moment = require('moment-timezone');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');

function getSettings() {
    try {
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
        const def = { theme: 'galaxy', prefix: '!', botName: 'ZENOS-MD-V1', language: 'fr' };
        fs.writeJsonSync(settingsPath, def, { spaces: 2 });
        return def;
    }
}

// ─── Catégories de commandes avec leurs détails ───────────────────────────────
const CATEGORY_MAP = {
    general: {
        emoji: '📌', name: 'Général',
        cmds: ['menu', 'ping', 'info', 'uptime', 'botname', 'owner', 'hello', 'date', 'about', 'aide', 'allmenu']
    },
    fun: {
        emoji: '🎭', name: 'Fun & Jeux',
        cmds: ['joke', 'fact', 'quote', '8ball', 'flip', 'dice', 'random', 'love', 'reverse', 'mock', 'roast', 'story', 'riddle', 'ascii', 'encrypt', 'decrypt']
    },
    media: {
        emoji: '📸', name: 'Médias',
        cmds: ['sticker', 'toimg', 'ytmp3', 'ytmp4', 'tiktok', 'instagram', 'twitter', 'facebook', 'image']
    },
    utils: {
        emoji: '🛠️', name: 'Utilitaires',
        cmds: ['calc', 'translate', 'weather', 'currency', 'password', 'hash', 'define', 'bmi', 'age', 'shorturl', 'color', 'unit', 'qr']
    },
    info: {
        emoji: 'ℹ️', name: 'Informations',
        cmds: ['news', 'wiki', 'crypto', 'country', 'anime', 'lyrics']
    },
    admin: {
        emoji: '👑', name: 'Administration',
        cmds: ['restart', 'status', 'eval', 'shell', 'broadcast', 'logs', 'block', 'unblock']
    },
    confidentialite: {
        emoji: '🔒', name: 'Confidentialité',
        cmds: ['disappear', 'viewonce', 'phantom', 'ghost', 'screenshot', 'savestatus', 'antidelete']
    },
    conversion: {
        emoji: '🔄', name: 'Conversion',
        cmds: ['convert', 'encode64', 'decode64', 'hex', 'binary', 'morse', 'tempconv', 'lengthconv', 'weightconv']
    },
    groupe: {
        emoji: '👥', name: 'Groupe',
        cmds: ['tagall', 'kick', 'promote', 'demote', 'link', 'ginfo', 'warn', 'antilink', 'welcome', 'gcreate', 'gname', 'gdesc']
    },
    ia: {
        emoji: '🤖', name: 'Intelligence IA',
        cmds: ['gpt', 'gemini', 'blackbox', 'llama', 'dalle', 'imagine', 'chat']
    },
    fx_audio: {
        emoji: '🎵', name: 'FX Audio',
        cmds: ['bass', 'nightcore', 'slowdown', 'reverse_audio', 'echo', 'robot', 'pitch', 'noise']
    },
    image_edits: {
        emoji: '🖼️', name: 'Édition Image',
        cmds: ['wasted', 'wanted', 'trigger', 'rip', 'sepia', 'greyscale', 'blur', 'pixelate', 'beautiful', 'jail', 'facepalm', 'trash', 'rainbow', 'darkness', 'invert1']
    },
    logo: {
        emoji: '🎨', name: 'Logos & Effets',
        cmds: ['glitch', 'neon_text', 'shadow_text', 'gradient_text', 'fire_text', 'matrix_text', 'retro_text']
    },
    outils: {
        emoji: '⚙️', name: 'Outils Bot',
        cmds: ['stats', 'resetstats', 'theme', 'setprefix', 'setname', 'language']
    },
    economie: {
        emoji: '💰', name: 'Économie',
        cmds: ['myecon', 'depot', 'retrait', 'vol', 'pari', 'slot', 'bonus', 'transfer', 'tictactoe', 'richlist']
    }
};

// ─── Cherche une image anime (Cid Kagenou / waifu fallback) ──────────────────
async function getAnimeImage() {
    // Sources par ordre de priorité
    const sources = [
        async () => {
            const r = await axios.get('https://api.waifu.pics/sfw/waifu', { timeout: 8000 });
            return r.data?.url;
        },
        async () => {
            const r = await axios.get('https://nekos.best/api/v2/neko', { timeout: 8000 });
            return r.data?.results?.[0]?.url;
        },
        async () => {
            const r = await axios.get('https://api.waifu.im/search?included_tags=maid', { timeout: 8000 });
            return r.data?.images?.[0]?.url;
        }
    ];

    for (const source of sources) {
        try {
            const url = await source();
            if (url) return url;
        } catch {}
    }
    return null;
}

// ─── Rendu du thème galaxy (amélioré) ────────────────────────────────────────
function renderGalaxyMenu(categories, botInfo) {
    const { botName, prefix, uptime, cmdCount, ownerNum } = botInfo;
    const catLines = categories.map(([key, cat]) =>
        `│ ${cat.emoji} *${cat.name}*  ·  ${cat.cmds.length} cmds`
    ).join('\n');

    return `╭──────────────────────────────╮
│  ✨🌌  Z E N O S - M D  🌌✨  │
│       ꧁  V E R S I O N  1  ꧂  │
╰──────────────────────────────╯
🌟━━━━━━━━━━━━━━━━━━━━━━━🌟
│ 🤖 Bot    : ${botName}
│ 👑 Owner  : +${ownerNum}
│ ⚡ Prefix : ${prefix}
│ 📡 Status : En ligne ✅
│ ⏱️ Uptime : ${uptime}
│ 🧩 Cmds   : ${cmdCount} commandes
🌟━━━━━━━━━━━━━━━━━━━━━━━🌟

✦ ☄️  C A T É G O R I E S  ☄️ ✦

${catLines}

✨━━━━━━━━━━━━━━━━━━━━━━━✨
💡 Tape *${prefix}menu [catégorie]*
   Ex: *${prefix}menu fun* · *${prefix}menu ia*
_*   BY : ANOS.*_
✨━━━━━━━━━━━━━━━━━━━━━━━✨
   🌌 *ZENOS-MD-V1* • 24/7 Online 🚀`;
}

const commands = {
    // ─── COMMANDE PRINCIPALE !menu ────────────────────────────────────────────
    menu: async ({ sock, msg, args, startTime, botName, prefix }) => {
        const settings = getSettings();
        const currentTheme = settings.theme || 'galaxy';
        const jid = msg.key.remoteJid;
        const uptime = formatUptime(Math.floor((Date.now() - startTime) / 1000));
        const totalCmds = getAllCommands ? getAllCommands().size : '247';

        // ── Mode sous-catégorie : !menu fun, !menu ia, etc. ──────────────────
        if (args[0]) {
            const cat = args[0].toLowerCase();
            const found = CATEGORY_MAP[cat];
            if (!found) {
                const validCats = Object.keys(CATEGORY_MAP).join(', ');
                return sock.sendMessage(jid, {
                    text: `❌ *Catégorie inconnue :* "${args[0]}"\n\n📋 *Catégories valides :*\n${validCats}\n\n💡 Ex: *!menu fun*`
                });
            }
            const cmdList = found.cmds.map(c => `  • *${prefix}${c}*`).join('\n');
            return sock.sendMessage(jid, {
                text: `${found.emoji} *${found.name}* — ${found.cmds.length} commandes\n${'━'.repeat(30)}\n\n${cmdList}\n\n${'━'.repeat(30)}\n💡 *${prefix}menu* pour le menu principal`
            });
        }

        // ── Menu principal avec image anime ──────────────────────────────────
        const botInfo = {
            botName: settings.botName || botName,
            prefix: settings.prefix || prefix,
            uptime,
            cmdCount: totalCmds,
            ownerNum: OWNER_NUMBER
        };

        const catEntries = Object.entries(CATEGORY_MAP);

        // Construire le texte du menu selon le thème
        let menuText;
        try {
            const { THEMES } = require('./theme');
            const theme = THEMES[currentTheme] || THEMES['galaxy'];
            const catList = catEntries.map(([, cat]) => `${cat.emoji} *${cat.name}*  ·  ${cat.cmds.length} cmds`);
            menuText = theme.renderMenu(catList, botInfo);
        } catch {
            // Fallback galaxy si theme.js a un problème
            menuText = renderGalaxyMenu(catEntries, botInfo);
        }

        // Tenter d'envoyer avec image anime
        try {
            const imageUrl = await getAnimeImage();
            if (imageUrl) {
                await sock.sendMessage(jid, { image: { url: imageUrl }, caption: menuText });
                return;
            }
        } catch {}

        // Fallback : texte seul
        await sock.sendMessage(jid, { text: menuText });
    },

    // ─── Autres commandes générales ───────────────────────────────────────────
    ping: async ({ sock, msg }) => {
        const start = Date.now();
        const sentMsg = await sock.sendMessage(msg.key.remoteJid, { text: '🏓 Calcul...' });
        const end = Date.now();
        await sock.sendMessage(msg.key.remoteJid, { text: `🏓 *Pong!* \`${end - start}ms\`` }, { quoted: sentMsg });
    },

    info: async ({ sock, msg, startTime, botName, prefix }) => {
        const uptime = formatUptime(Math.floor((Date.now() - startTime) / 1000));
        const now = moment().tz('Africa/Abidjan').format('DD/MM/YYYY HH:mm:ss');
        await sock.sendMessage(msg.key.remoteJid, {
            text: `╔══════════════════════════╗\n║    ℹ️  INFOS ZENOS-MD    ║\n╠══════════════════════════╣\n║ 🤖 Nom     : ${botName}\n║ 📌 Préfixe : ${prefix}\n║ ⏰ Uptime  : ${uptime}\n║ 📅 Date    : ${now}\n║ 🔒 Mode    : Privé\n║ 💻 Runtime : Node.js 20\n║ 📦 Lib     : Baileys\n║ 🌐 Version : 1.0.0\n╚══════════════════════════╝`
        });
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
        const greetings = ['Bonjour! 👋 Comment puis-je vous aider?', 'Salut! 😊 Je suis ZENOS-MD, à votre service!', 'Hello! 🌟 Prêt à vous aider!', 'Yo! 🤙 ZENOS-MD opérationnel!'];
        await sock.sendMessage(msg.key.remoteJid, { text: randomItem(greetings) });
    },

    date: async ({ sock, msg }) => {
        const now = moment().tz('Africa/Abidjan');
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📅 *Date et heure:*\n\n📆 ${now.format('dddd DD MMMM YYYY')}\n⏰ ${now.format('HH:mm:ss')}\n🌍 Africa/Abidjan`
        });
    },

    about: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, {
            text: `╔══════════════════════════╗\n║    🤖 À PROPOS DU BOT    ║\n╠══════════════════════════╣\n║ ZENOS-MD-V1 est un bot   ║\n║ WhatsApp multiservices   ║\n║ privé, codé en Node.js   ║\n║ avec Baileys.            ║\n║                          ║\n║ ✨ +247 commandes        ║\n║ 🎭 Fun & Jeux            ║\n║ 📥 Téléchargements       ║\n║ 🤖 IA intégrée           ║\n║ 👥 Gestion groupes       ║\n║ 💰 Système économique    ║\n║ 🎨 Effets audio/image    ║\n║ 💓 Keep-alive 24h/24     ║\n╚══════════════════════════╝`
        });
    },

    aide: async ({ sock, msg, args, prefix }) => {
        const cat = args[0]?.toLowerCase();
        if (cat && CATEGORY_MAP[cat]) {
            const found = CATEGORY_MAP[cat];
            const cmdList = found.cmds.map(c => `• *${prefix}${c}*`).join('\n');
            return sock.sendMessage(msg.key.remoteJid, {
                text: `${found.emoji} *${found.name}*\n\n${cmdList}`
            });
        }
        const list = Object.entries(CATEGORY_MAP).map(([k, v]) => `${v.emoji} *${k}* — ${v.name}`).join('\n');
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📚 *Catégories:*\n\n${list}\n\n💡 Ex: *${prefix}aide fun*`
        });
    },

    allmenu: async ({ sock, msg, prefix }) => {
        const sections = Object.entries(CATEGORY_MAP).map(([key, cat]) => {
            const cmds = cat.cmds.map(c => `${prefix}${c}`).join('  ');
            return `${cat.emoji} *${cat.name}*\n${cmds}`;
        }).join('\n\n');
        await sock.sendMessage(msg.key.remoteJid, {
            text: `📋 *TOUTES LES COMMANDES*\n${'━'.repeat(30)}\n\n${sections}`
        });
    }
};

const aliases = {
    'start': 'menu',
    'help': 'aide',
    'hi': 'hello',
    'upt': 'uptime',
    'cmds': 'allmenu'
};

module.exports = { commands, aliases, CATEGORY_MAP };
