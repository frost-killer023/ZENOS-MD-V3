const fs = require('fs-extra');
const path = require('path');
const { formatUptime } = require('../lib/helper');

const settingsPath = path.join(__dirname, '..', 'data', 'settings.json');

function getSettings() {
    try { return fs.readJsonSync(settingsPath); } catch { return { theme: 'default', prefix: '!', botName: 'ZENOS-MD-V1' }; }
}
function saveSettings(data) {
    fs.writeJsonSync(settingsPath, data, { spaces: 2 });
}

const THEMES = {
    default: {
        name: 'Default',
        emoji: '⚪',
        renderMenu: (categories, botInfo) => {
            const { botName, prefix, uptime, cmdCount } = botInfo;
            return `╔══════════════════════════╗
║      🤖 ${botName}      
╠══════════════════════════╣
║ Préfixe : ${prefix}              ║
║ Mode    : Privé 🔒       ║
║ Cmds    : ${cmdCount}           ║
║ Uptime  : ${uptime}      ║
╠══════════════════════════╣
║ 📌 CATÉGORIES            ║
${categories.map(c => `║ ${c}`.padEnd(28) + '║').join('\n')}
╚══════════════════════════╝
Tape *${prefix}menu <cat>* pour les cmds`;
        }
    },

    neon: {
        name: 'Neon',
        emoji: '💜',
        renderMenu: (categories, botInfo) => {
            const { botName, prefix, uptime, cmdCount } = botInfo;
            return `┏━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🌌 ${botName} 🌌  ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ ⚡ Préfixe : ${prefix}           ┃
┃ 🔮 Mode    : Privé        ┃
┃ ✨ Cmds    : ${cmdCount}          ┃
┃ ⏰ Uptime  : ${uptime}    ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃ 🌟 CATÉGORIES             ┃
${categories.map(c => `┃ › ${c}`).join('\n')}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━┛
💜 *${prefix}menu <cat>* pour voir les cmds`;
        }
    },

    galaxy: {
        name: 'Galaxy',
        emoji: '🌌',
        renderMenu: (categories, botInfo) => {
            const { botName, prefix, uptime, cmdCount } = botInfo;
            return `✦ ✧ ✦ ✧ ✦ GALAXY ✦ ✧ ✦ ✧ ✦
🌌 *${botName}* 🌌
✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦
◈ Préfixe : ${prefix}
◈ Mode    : 🔒 Privé
◈ Cmds    : ${cmdCount}
◈ Uptime  : ${uptime}
✦ ✧ ✦ ✧ ✦ MENU ✦ ✧ ✦ ✧ ✦
${categories.map(c => `⋆ ${c}`).join('\n')}
✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦ ✧ ✦
🌌 *${prefix}menu <cat>* pour les cmds`;
        }
    },

    minimal: {
        name: 'Minimal',
        emoji: '⬜',
        renderMenu: (categories, botInfo) => {
            const { botName, prefix, uptime, cmdCount } = botInfo;
            return `${botName}
─────────────────────
prefix: ${prefix} | mode: privé | cmds: ${cmdCount}
uptime: ${uptime}
─────────────────────
catégories:
${categories.map(c => `  · ${c}`).join('\n')}
─────────────────────
${prefix}menu <catégorie>`;
        }
    },

    fire: {
        name: 'Fire',
        emoji: '🔥',
        renderMenu: (categories, botInfo) => {
            const { botName, prefix, uptime, cmdCount } = botInfo;
            return `🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
🔥  *${botName}*  🔥
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
🔥 Préfixe : ${prefix}
🔥 Mode    : Privé 🔒
🔥 Cmds    : ${cmdCount}
🔥 Uptime  : ${uptime}
🔥🔥🔥 CATÉGORIES 🔥🔥🔥
${categories.map(c => `🔥 ${c}`).join('\n')}
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
*${prefix}menu <cat>*`;
        }
    },

    ocean: {
        name: 'Ocean',
        emoji: '🌊',
        renderMenu: (categories, botInfo) => {
            const { botName, prefix, uptime, cmdCount } = botInfo;
            return `🌊〰️〰️〰️〰️〰️〰️〰️🌊
🐋 *${botName}* 🐋
🌊〰️〰️〰️〰️〰️〰️〰️🌊
🐠 Préfixe : ${prefix}
🐠 Mode    : Privé 🔒
🐠 Cmds    : ${cmdCount}
🐠 Uptime  : ${uptime}
🌊〰️ CATÉGORIES 〰️🌊
${categories.map(c => `🐟 ${c}`).join('\n')}
🌊〰️〰️〰️〰️〰️〰️〰️🌊
*${prefix}menu <cat>*`;
        }
    },

    matrix: {
        name: 'Matrix',
        emoji: '💚',
        renderMenu: (categories, botInfo) => {
            const { botName, prefix, uptime, cmdCount } = botInfo;
            return `> 01001110 01000101 01001111 01001110
> *${botName}* [SYSTEM_ONLINE]
> ─────────────────────────
> PREFIX: ${prefix} | SECURE_MODE: TRUE
> COMMANDS: ${cmdCount} | UPTIME: ${uptime}
> ─────────────────────────
> [MODULES_LOADED]
${categories.map(c => `> [+] ${c}`).join('\n')}
> ─────────────────────────
> CMD: ${prefix}menu <module>`;
        }
    }
};

const allCategories = [
    '1️⃣  Général', '2️⃣  Fun & Jeux', '3️⃣  Médias',
    '4️⃣  Utilitaires', '5️⃣  Informations', '6️⃣  Administration',
    '7️⃣  Confidentialité', '8️⃣  Conversion', '9️⃣  Groupe',
    '🔟  IA & Intelligence', '1️⃣1️⃣ FX Audio', '1️⃣2️⃣ Image Edits',
    '1️⃣3️⃣ Logos', '1️⃣4️⃣ Outils', '1️⃣5️⃣ Économie'
];

const commands = {
    theme: async ({ sock, msg, args, startTime, botName, prefix }) => {
        const settings = getSettings();
        const sub = args[0]?.toLowerCase();

        if (!sub) {
            const list = Object.entries(THEMES).map(([k, v]) => `${v.emoji} *${k}* — ${v.name}`).join('\n');
            await sock.sendMessage(msg.key.remoteJid, { text: `🎨 *Thèmes disponibles:*\n\n${list}\n\n• *!theme set <nom>* → Activer\n• *!theme preview <nom>* → Aperçu\n• *!theme reset* → Par défaut\n\n📌 Actuel: *${settings.theme}*` });
            return;
        }

        if (sub === 'set' && args[1]) {
            const themeName = args[1].toLowerCase();
            if (!THEMES[themeName]) return sock.sendMessage(msg.key.remoteJid, { text: `❌ Thème introuvable. Tape !theme pour voir la liste.` });
            settings.theme = themeName;
            saveSettings(settings);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Thème *${themeName}* activé ! Tape !menu pour voir le résultat.` });
            return;
        }

        if (sub === 'reset') {
            settings.theme = 'default';
            saveSettings(settings);
            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Thème remis par défaut.' });
            return;
        }

        if (sub === 'preview' && args[1]) {
            const themeName = args[1].toLowerCase();
            const theme = THEMES[themeName];
            if (!theme) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Thème introuvable. Tape !theme pour voir la liste.' });
            const uptime = formatUptime(Math.floor((Date.now() - (global.startTime || Date.now())) / 1000));
            const menu = theme.renderMenu(allCategories, { botName: settings.botName || botName, prefix: settings.prefix || prefix, uptime, cmdCount: '150+' });
            await sock.sendMessage(msg.key.remoteJid, { text: `🔍 *Aperçu thème: ${themeName}*\n\n${menu}` });
            return;
        }

        await sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage:\n• !theme (liste)\n• !theme set <nom>\n• !theme preview <nom>\n• !theme reset' });
    }
};

module.exports = { commands, aliases: {}, THEMES, allCategories };
