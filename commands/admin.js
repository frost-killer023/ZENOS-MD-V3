const { getOwnerJid, readJson, writeJson, getDataPath } = require('../lib/helper');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

const logs = [];

function addLog(entry) {
    logs.unshift(`[${new Date().toLocaleString('fr-FR')}] ${entry}`);
    if (logs.length > 100) logs.pop();
}

const commands = {
    restart: async ({ sock, msg }) => {
        await sock.sendMessage(msg.key.remoteJid, { text: '🔄 *Redémarrage du bot...*\n\nÀ dans quelques secondes!' });
        setTimeout(() => process.exit(0), 2000);
    },

    status: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !status <message>' });
        try {
            await sock.updateProfileStatus(body);
            addLog(`Status changé: ${body}`);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Statut WhatsApp mis à jour:\n"${body}"` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de changer le statut' });
        }
    },

    setname: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !setname <nom>' });
        try {
            await sock.updateProfileName(body);
            addLog(`Nom changé: ${body}`);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Nom du bot changé en: "${body}"` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de changer le nom' });
        }
    },

    broadcast: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !broadcast <message>' });
        try {
            const chats = Object.keys(sock.chats || {});
            let sent = 0;
            for (const jid of chats.slice(0, 20)) {
                try {
                    await sock.sendMessage(jid, { text: `📢 *Broadcast ZENOS-MD:*\n\n${body}` });
                    sent++;
                    await new Promise(r => setTimeout(r, 1000));
                } catch {}
            }
            addLog(`Broadcast envoyé à ${sent} chats`);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Broadcast envoyé à *${sent}* chats` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur broadcast' });
        }
    },

    eval: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !eval <code_javascript>' });
        try {
            let result = eval(body);
            if (result instanceof Promise) result = await result;
            if (typeof result === 'object') result = JSON.stringify(result, null, 2);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ *Eval Result:*\n\`\`\`${String(result).substring(0, 2000)}\`\`\`` });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ *Erreur Eval:*\n\`\`\`${e.message}\`\`\`` });
        }
    },

    shell: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !shell <commande>' });
        exec(body, { timeout: 30000 }, async (err, stdout, stderr) => {
            const output = stdout || stderr || err?.message || 'Aucune sortie';
            addLog(`Shell: ${body}`);
            await sock.sendMessage(msg.key.remoteJid, { text: `💻 *Shell Output:*\n\`\`\`${output.substring(0, 2000)}\`\`\`` });
        });
    },

    block: async ({ sock, msg, body, args }) => {
        const target = args[0]?.replace(/[^0-9]/g, '');
        if (!target) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !block <numéro>' });
        try {
            await sock.updateBlockStatus(`${target}@s.whatsapp.net`, 'block');
            addLog(`Bloqué: ${target}`);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Numéro *${target}* bloqué avec succès` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de bloquer ce numéro' });
        }
    },

    unblock: async ({ sock, msg, args }) => {
        const target = args[0]?.replace(/[^0-9]/g, '');
        if (!target) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !unblock <numéro>' });
        try {
            await sock.updateBlockStatus(`${target}@s.whatsapp.net`, 'unblock');
            addLog(`Débloqué: ${target}`);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Numéro *${target}* débloqué avec succès` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de débloquer ce numéro' });
        }
    },

    clearcache: async ({ sock, msg }) => {
        try {
            const authDir = path.join(__dirname, '..', 'auth_info_baileys');
            if (fs.existsSync(authDir)) {
                const files = fs.readdirSync(authDir).filter(f => !f.includes('creds'));
                files.forEach(f => fs.removeSync(path.join(authDir, f)));
            }
            addLog('Cache vidé');
            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Cache du bot vidé avec succès!' });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur lors du vidage du cache' });
        }
    },

    logs: async ({ sock, msg }) => {
        if (!logs.length) return sock.sendMessage(msg.key.remoteJid, { text: '📋 Aucun log disponible pour le moment.' });
        const text = `📋 *Derniers logs (${logs.length}):*\n\n` + logs.slice(0, 20).join('\n');
        await sock.sendMessage(msg.key.remoteJid, { text: text.substring(0, 4000) });
    }
};

const aliases = {
    'reboot': 'restart',
    'exec': 'shell',
    'run': 'eval'
};

module.exports = { commands, aliases, addLog };
