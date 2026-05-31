const { readJson, writeJson, getDataPath, getSenderNumber } = require('../lib/helper');
const path = require('path');

function getGroups() {
    return readJson(getDataPath('groups.json'));
}
function saveGroups(data) {
    writeJson(getDataPath('groups.json'), data);
}
function getWarns() {
    return readJson(getDataPath('warns.json'));
}
function saveWarns(data) {
    writeJson(getDataPath('warns.json'), data);
}

async function isGroupAdmin(sock, groupId, jid) {
    try {
        const meta = await sock.groupMetadata(groupId);
        return meta.participants.some(p => p.id === jid && (p.admin === 'admin' || p.admin === 'superadmin'));
    } catch { return false; }
}

const commands = {
    tagall: async ({ sock, msg }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Commande disponible uniquement en groupe!' });
        try {
            const meta = await sock.groupMetadata(msg.key.remoteJid);
            const mentions = meta.participants.map(p => p.id);
            const tags = meta.participants.map(p => `@${p.id.replace('@s.whatsapp.net', '')}`).join(' ');
            await sock.sendMessage(msg.key.remoteJid, { text: `📢 *${meta.subject}* - Mention de tous les membres:\n${tags}`, mentions });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur lors du tag de tous les membres' });
        }
    },

    tagadmin: async ({ sock, msg }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        try {
            const meta = await sock.groupMetadata(msg.key.remoteJid);
            const admins = meta.participants.filter(p => p.admin);
            const mentions = admins.map(p => p.id);
            const tags = admins.map(p => `@${p.id.replace('@s.whatsapp.net', '')}`).join(' ');
            await sock.sendMessage(msg.key.remoteJid, { text: `👑 *Administrateurs:*\n${tags}`, mentions });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur' });
        }
    },

    tag: async ({ sock, msg, body }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        try {
            const meta = await sock.groupMetadata(msg.key.remoteJid);
            const mentions = meta.participants.map(p => p.id);
            await sock.sendMessage(msg.key.remoteJid, { text: body || '📢 Message du bot', mentions });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur tag' });
        }
    },

    kick: async ({ sock, msg }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !kick @membre' });
        try {
            await sock.groupParticipantsUpdate(msg.key.remoteJid, mentioned, 'remove');
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ ${mentioned.length} membre(s) expulsé(s)` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible d\'expulser (vérifiez les droits admin)' });
        }
    },

    promote: async ({ sock, msg }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !promote @membre' });
        try {
            await sock.groupParticipantsUpdate(msg.key.remoteJid, mentioned, 'promote');
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Membres promus administrateurs` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur promotion' });
        }
    },

    demote: async ({ sock, msg }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !demote @membre' });
        try {
            await sock.groupParticipantsUpdate(msg.key.remoteJid, mentioned, 'demote');
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Droits admin retirés` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur rétrogradation' });
        }
    },

    gcreate: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !gcreate <nom_du_groupe>' });
        try {
            const group = await sock.groupCreate(body, [msg.key.remoteJid]);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Groupe *${body}* créé!\n🆔 ID: ${group.id}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur création groupe' });
        }
    },

    gdesc: async ({ sock, msg, body }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !gdesc <description>' });
        try {
            await sock.groupUpdateDescription(msg.key.remoteJid, body);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Description du groupe mise à jour` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur modification description' });
        }
    },

    gname: async ({ sock, msg, body }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !gname <nouveau_nom>' });
        try {
            await sock.groupUpdateSubject(msg.key.remoteJid, body);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Nom du groupe changé en: *${body}*` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur changement nom' });
        }
    },

    close: async ({ sock, msg }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        try {
            await sock.groupSettingUpdate(msg.key.remoteJid, 'announcement');
            await sock.sendMessage(msg.key.remoteJid, { text: '🔒 Groupe fermé - Seuls les admins peuvent écrire' });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur fermeture groupe' });
        }
    },

    open: async ({ sock, msg }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        try {
            await sock.groupSettingUpdate(msg.key.remoteJid, 'not_announcement');
            await sock.sendMessage(msg.key.remoteJid, { text: '🔓 Groupe ouvert - Tout le monde peut écrire' });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur ouverture groupe' });
        }
    },

    lock: async ({ sock, msg }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        try {
            await sock.groupSettingUpdate(msg.key.remoteJid, 'locked');
            await sock.sendMessage(msg.key.remoteJid, { text: '🔒 Seuls les admins peuvent modifier les paramètres' });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur' });
        }
    },

    unlock: async ({ sock, msg }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        try {
            await sock.groupSettingUpdate(msg.key.remoteJid, 'unlocked');
            await sock.sendMessage(msg.key.remoteJid, { text: '🔓 Tout le monde peut modifier les paramètres' });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur' });
        }
    },

    leave: async ({ sock, msg }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        await sock.sendMessage(msg.key.remoteJid, { text: '👋 Au revoir! ZENOS-MD quitte le groupe...' });
        try {
            await sock.groupLeave(msg.key.remoteJid);
        } catch {}
    },

    link: async ({ sock, msg }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        try {
            const code = await sock.groupInviteCode(msg.key.remoteJid);
            await sock.sendMessage(msg.key.remoteJid, { text: `🔗 *Lien d'invitation:*\nhttps://chat.whatsapp.com/${code}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible d\'obtenir le lien (admin requis)' });
        }
    },

    revoke: async ({ sock, msg }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        try {
            await sock.groupRevokeInvite(msg.key.remoteJid);
            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Lien d\'invitation réinitialisé' });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur réinitialisation lien' });
        }
    },

    ginfo: async ({ sock, msg }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        try {
            const meta = await sock.groupMetadata(msg.key.remoteJid);
            const admins = meta.participants.filter(p => p.admin);
            const created = new Date(meta.creation * 1000).toLocaleDateString('fr-FR');
            await sock.sendMessage(msg.key.remoteJid, {
                text: `👥 *Informations du groupe*\n\n📛 Nom: ${meta.subject}\n👤 Créateur: @${meta.owner?.replace('@s.whatsapp.net', '')}\n📅 Créé le: ${created}\n👥 Membres: ${meta.participants.length}\n👑 Admins: ${admins.length}\n📝 Description: ${meta.desc || 'Aucune'}`,
                mentions: [meta.owner]
            });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur récupération infos groupe' });
        }
    },

    join: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !join <lien_groupe>' });
        try {
            const code = body.includes('chat.whatsapp.com/') ? body.split('chat.whatsapp.com/')[1] : body;
            await sock.groupAcceptInvite(code);
            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Groupe rejoint avec succès!' });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de rejoindre le groupe' });
        }
    },

    warn: async ({ sock, msg, body }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !warn @membre [raison]' });
        const warns = getWarns();
        const gid = msg.key.remoteJid;
        const reason = body.replace(/@\d+/g, '').trim() || 'Comportement inapproprié';
        for (const jid of mentioned) {
            if (!warns[gid]) warns[gid] = {};
            if (!warns[gid][jid]) warns[gid][jid] = [];
            warns[gid][jid].push({ reason, date: new Date().toISOString() });
            const count = warns[gid][jid].length;
            saveWarns(warns);
            if (count >= 3) {
                try {
                    await sock.groupParticipantsUpdate(gid, [jid], 'remove');
                    await sock.sendMessage(gid, { text: `⚠️ @${jid.replace('@s.whatsapp.net', '')} a reçu 3 avertissements → Expulsé automatiquement!`, mentions: [jid] });
                    warns[gid][jid] = [];
                    saveWarns(warns);
                } catch {}
            } else {
                await sock.sendMessage(gid, { text: `⚠️ *Avertissement ${count}/3* pour @${jid.replace('@s.whatsapp.net', '')}\nRaison: ${reason}`, mentions: [jid] });
            }
        }
    },

    antilink: async ({ sock, msg, args }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        const groups = getGroups();
        const gid = msg.key.remoteJid;
        if (!groups[gid]) groups[gid] = {};
        const state = args[0] === 'on';
        groups[gid].antilink = state;
        saveGroups(groups);
        await sock.sendMessage(gid, { text: `🔗 Anti-lien: ${state ? '✅ Activé' : '❌ Désactivé'}` });
    },

    antispam: async ({ sock, msg, args }) => {
        const groups = getGroups();
        const gid = msg.key.remoteJid;
        if (!groups[gid]) groups[gid] = {};
        const state = args[0] === 'on';
        groups[gid].antispam = state;
        saveGroups(groups);
        await sock.sendMessage(gid, { text: `🛡️ Anti-spam: ${state ? '✅ Activé' : '❌ Désactivé'}` });
    },

    welcome: async ({ sock, msg, args }) => {
        const groups = getGroups();
        const gid = msg.key.remoteJid;
        if (!groups[gid]) groups[gid] = {};
        const state = args[0] === 'on';
        const welcomeMsg = args.slice(1).join(' ') || '👋 Bienvenue {name} dans le groupe {group}!';
        groups[gid].welcome = state;
        groups[gid].welcomeMsg = welcomeMsg;
        saveGroups(groups);
        await sock.sendMessage(gid, { text: `👋 Message de bienvenue: ${state ? '✅ Activé' : '❌ Désactivé'}\n📝 Message: ${welcomeMsg}` });
    },

    goodbye: async ({ sock, msg, args }) => {
        const groups = getGroups();
        const gid = msg.key.remoteJid;
        if (!groups[gid]) groups[gid] = {};
        const state = args[0] === 'on';
        const byeMsg = args.slice(1).join(' ') || '👋 Au revoir {name}!';
        groups[gid].goodbye = state;
        groups[gid].goodbyeMsg = byeMsg;
        saveGroups(groups);
        await sock.sendMessage(gid, { text: `👋 Message d'adieu: ${state ? '✅ Activé' : '❌ Désactivé'}` });
    },

    kickall: async ({ sock, msg }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        try {
            const meta = await sock.groupMetadata(msg.key.remoteJid);
            const nonAdmins = meta.participants.filter(p => !p.admin).map(p => p.id);
            await sock.sendMessage(msg.key.remoteJid, { text: `⚠️ Expulsion de ${nonAdmins.length} membres non-admins...` });
            for (const jid of nonAdmins) {
                try { await sock.groupParticipantsUpdate(msg.key.remoteJid, [jid], 'remove'); } catch {}
                await new Promise(r => setTimeout(r, 500));
            }
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ ${nonAdmins.length} membres expulsés` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur kickall' });
        }
    },

    getpp: async ({ sock, msg }) => {
        if (!msg.key.remoteJid.endsWith('@g.us')) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Groupe uniquement!' });
        try {
            const ppUrl = await sock.profilePictureUrl(msg.key.remoteJid, 'image');
            const axios = require('axios');
            const res = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 10000 });
            await sock.sendMessage(msg.key.remoteJid, { image: Buffer.from(res.data), caption: '🖼️ Photo de profil du groupe' });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Pas de photo de profil ou groupe' });
        }
    },

    poll: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !poll <question> <option1|option2|...>' });
        const [question, ...rest] = body.split(' ');
        const optStr = rest.join(' ');
        const options = optStr.split('|').map(o => o.trim()).filter(Boolean);
        if (options.length < 2) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Au moins 2 options séparées par |' });
        try {
            await sock.sendMessage(msg.key.remoteJid, {
                poll: { name: question, values: options, selectableCount: options.length }
            });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur création sondage' });
        }
    }
};

const aliases = {
    'htag': 'tag',
    'hidetag': 'tag',
    'gpp': 'getpp',
    'upp': 'updatepp',
    'rpp': 'removepp',
    'kickall2': 'kickall'
};

module.exports = { commands, aliases };
