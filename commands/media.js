const axios = require('axios');
const { downloadMedia } = require('../lib/helper');
const fs = require('fs-extra');
const path = require('path');

const commands = {
    ytmp3: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !ytmp3 <url_youtube>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Téléchargement audio YouTube...' });
        try {
            const apiUrl = `https://api.fabdl.com/youtube/get?url=${encodeURIComponent(body)}`;
            const res = await axios.get(apiUrl, { timeout: 20000 });
            const data = res.data?.result;
            if (!data) throw new Error('Pas de résultat');
            const dlRes = await axios.get(`https://api.fabdl.com/youtube/mp3/${data.process_id}`, { timeout: 30000 });
            const dlUrl = dlRes.data?.result?.download_url;
            if (!dlUrl) throw new Error('URL de téléchargement non disponible');
            const audioRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 });
            await sock.sendMessage(msg.key.remoteJid, {
                audio: Buffer.from(audioRes.data),
                mimetype: 'audio/mpeg',
                ptt: false
            });
        } catch {
            try {
                const res2 = await axios.get(`https://ytdlp.online/api/convert?url=${encodeURIComponent(body)}&format=mp3`, { timeout: 30000 });
                if (res2.data?.url) {
                    const audio = await axios.get(res2.data.url, { responseType: 'arraybuffer', timeout: 60000 });
                    await sock.sendMessage(msg.key.remoteJid, { audio: Buffer.from(audio.data), mimetype: 'audio/mpeg' });
                } else throw new Error('No URL');
            } catch {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Échec téléchargement YouTube MP3. Vérifiez l\'URL.' });
            }
        }
    },

    ytmp4: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !ytmp4 <url_youtube>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Téléchargement vidéo YouTube...' });
        try {
            const res = await axios.get(`https://api.fabdl.com/youtube/get?url=${encodeURIComponent(body)}`, { timeout: 20000 });
            const data = res.data?.result;
            if (!data) throw new Error('No result');
            const dlRes = await axios.get(`https://api.fabdl.com/youtube/mp4/${data.process_id}`, { timeout: 30000 });
            const dlUrl = dlRes.data?.result?.download_url;
            if (!dlUrl) throw new Error('No URL');
            const videoRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 120000 });
            await sock.sendMessage(msg.key.remoteJid, { video: Buffer.from(videoRes.data), mimetype: 'video/mp4', caption: '📹 Vidéo YouTube' });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Échec téléchargement YouTube. L\'API est temporairement indisponible.' });
        }
    },

    tiktok: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !tiktok <url_tiktok>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Téléchargement TikTok...' });
        try {
            const res = await axios.get(`https://api.tikmate.app/api/lookup?url=${encodeURIComponent(body)}`, {
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const dlUrl = res.data?.videoNoWatermark || res.data?.video;
            if (!dlUrl) throw new Error('URL non trouvée');
            const videoRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 });
            await sock.sendMessage(msg.key.remoteJid, { video: Buffer.from(videoRes.data), mimetype: 'video/mp4', caption: '🎵 *TikTok - Sans watermark*' });
        } catch {
            try {
                const res2 = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(body)}`, { timeout: 30000 });
                const data = res2.data?.data;
                if (!data?.play) throw new Error('No data');
                const videoRes = await axios.get(data.play, { responseType: 'arraybuffer', timeout: 60000 });
                await sock.sendMessage(msg.key.remoteJid, { video: Buffer.from(videoRes.data), mimetype: 'video/mp4', caption: `🎵 *TikTok*\n👤 @${data.author?.unique_id || ''}` });
            } catch {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Échec téléchargement TikTok' });
            }
        }
    },

    instagram: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !instagram <url>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Téléchargement Instagram...' });
        try {
            const res = await axios.get(`https://igdownloader.app/api/download?url=${encodeURIComponent(body)}`, { timeout: 30000 });
            const dlUrl = res.data?.url || res.data?.download_url;
            if (!dlUrl) throw new Error('URL non disponible');
            const mediaRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 });
            const isVideo = dlUrl.includes('.mp4') || res.data?.type === 'video';
            if (isVideo) {
                await sock.sendMessage(msg.key.remoteJid, { video: Buffer.from(mediaRes.data), mimetype: 'video/mp4', caption: '📸 Instagram' });
            } else {
                await sock.sendMessage(msg.key.remoteJid, { image: Buffer.from(mediaRes.data), caption: '📸 Instagram' });
            }
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de télécharger ce contenu Instagram.' });
        }
    },

    twitter: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !twitter <url_tweet>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Téléchargement Twitter/X...' });
        try {
            const res = await axios.get(`https://twitsave.com/info?url=${encodeURIComponent(body)}`, {
                timeout: 20000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const dlUrl = res.data?.videos?.[0]?.url;
            if (!dlUrl) throw new Error('URL non disponible');
            const videoRes = await axios.get(dlUrl, { responseType: 'arraybuffer', timeout: 60000 });
            await sock.sendMessage(msg.key.remoteJid, { video: Buffer.from(videoRes.data), mimetype: 'video/mp4', caption: '🐦 Twitter/X' });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de télécharger cette vidéo Twitter/X.' });
        }
    },

    facebook: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !facebook <url>' });
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Téléchargement Facebook...' });
        try {
            const res = await axios.get(`https://fdownloader.net/api/ajaxSearch`, {
                params: { q: body, lang: 'fr' },
                timeout: 20000
            });
            await sock.sendMessage(msg.key.remoteJid, { text: `📘 *Facebook Downloader*\n\nLien reçu: ${body}\n\n⚠️ Utilise https://fdown.net pour télécharger les vidéos Facebook.` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de télécharger cette vidéo Facebook.' });
        }
    },

    image: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !image <recherche>' });
        await sock.sendMessage(msg.key.remoteJid, { text: `🔍 Recherche d'images pour: *${body}*...` });
        try {
            const seed = Math.floor(Math.random() * 999);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(body)}?width=1024&height=1024&seed=${seed}&nologo=true`;
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 45000 });
            await sock.sendMessage(msg.key.remoteJid, { image: Buffer.from(res.data), caption: `🖼️ *Image générée pour:* "${body}"` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de trouver une image pour cette recherche' });
        }
    },

    toimg: async ({ sock, msg }) => {
        const direct = await downloadMedia(msg, sock);
        const media = direct?.type === 'sticker' ? direct : null;
        if (!media) {
            const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quoted) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite un sticker' });
        }
        try {
            const sharp = require('sharp');
            const buf = direct?.buffer || Buffer.alloc(0);
            const png = await sharp(buf).png().toBuffer();
            await sock.sendMessage(msg.key.remoteJid, { image: png, caption: '🖼️ Sticker → Image' });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur conversion: ${e.message}` });
        }
    }
};

const aliases = {
    'yt': 'ytmp3',
    'yta': 'ytmp3',
    'ytv': 'ytmp4',
    'fb': 'facebook',
    'ig': 'instagram',
    'tw': 'twitter',
    'tt': 'tiktok'
};

module.exports = { commands, aliases };
