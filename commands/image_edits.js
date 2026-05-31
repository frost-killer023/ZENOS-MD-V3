const axios = require('axios');
const { downloadMedia } = require('../lib/helper');
const FormData = require('form-data');

const POPCAT_API = 'https://api.popcat.xyz';

async function getImageBuffer(msg, sock) {
    const direct = await downloadMedia(msg, sock);
    if (direct && (direct.type === 'image' || direct.type === 'sticker')) return direct.buffer;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) return null;
    const fakeMsg = { message: quoted, key: { remoteJid: msg.key.remoteJid } };
    const q = await downloadMedia(fakeMsg, sock);
    return (q && (q.type === 'image' || q.type === 'sticker')) ? q.buffer : null;
}

async function applyPopcatEffect(endpoint, imageBuffer) {
    const form = new FormData();
    form.append('image', imageBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
    const res = await axios.post(`${POPCAT_API}/${endpoint}`, form, {
        headers: form.getHeaders(),
        responseType: 'arraybuffer',
        timeout: 30000
    });
    return Buffer.from(res.data);
}

async function applyPopcatEffectUrl(endpoint, imageUrl) {
    const res = await axios.get(`${POPCAT_API}/${endpoint}?image=${encodeURIComponent(imageUrl)}`, {
        responseType: 'arraybuffer',
        timeout: 30000
    });
    return Buffer.from(res.data);
}

async function uploadToTmpfiles(buffer) {
    const form = new FormData();
    form.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
    const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, { headers: form.getHeaders(), timeout: 20000 });
    return res.data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
}

function createEffectCommand(effect, caption) {
    return async ({ sock, msg }) => {
        const buffer = await getImageBuffer(msg, sock);
        if (!buffer) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite une image' });
        await sock.sendMessage(msg.key.remoteJid, { text: '⏳ Application de l\'effet...' });
        try {
            let imgUrl;
            try {
                imgUrl = await uploadToTmpfiles(buffer);
            } catch {
                return sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur upload image' });
            }
            const result = await applyPopcatEffectUrl(effect, imgUrl);
            await sock.sendMessage(msg.key.remoteJid, { image: result, caption: caption || `✅ Effet *${effect}* appliqué` });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur effet ${effect}: ${e.message}` });
        }
    };
}

const commands = {
    wasted: createEffectCommand('wasted', '💀 *Wasted!*'),
    wanted: createEffectCommand('wanted', '🤠 *Wanted!*'),
    trigger: createEffectCommand('triggered', '😡 *TRIGGERED!*'),
    rip: createEffectCommand('rip', '⚰️ *RIP*'),
    sepia: async ({ sock, msg }) => {
        const buffer = await getImageBuffer(msg, sock);
        if (!buffer) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite une image' });
        try {
            const sharp = require('sharp');
            const result = await sharp(buffer).recomb([[0.393, 0.769, 0.189], [0.349, 0.686, 0.168], [0.272, 0.534, 0.131]]).jpeg().toBuffer();
            await sock.sendMessage(msg.key.remoteJid, { image: result, caption: '🟤 *Effet Sépia appliqué*' });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },
    greyscale: async ({ sock, msg }) => {
        const buffer = await getImageBuffer(msg, sock);
        if (!buffer) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite une image' });
        try {
            const sharp = require('sharp');
            const result = await sharp(buffer).greyscale().jpeg().toBuffer();
            await sock.sendMessage(msg.key.remoteJid, { image: result, caption: '⚫ *Effet Noir & Blanc*' });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },
    invert1: async ({ sock, msg }) => {
        const buffer = await getImageBuffer(msg, sock);
        if (!buffer) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite une image' });
        try {
            const sharp = require('sharp');
            const result = await sharp(buffer).negate().jpeg().toBuffer();
            await sock.sendMessage(msg.key.remoteJid, { image: result, caption: '🔄 *Couleurs inversées*' });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },
    blur: async ({ sock, msg, args }) => {
        const buffer = await getImageBuffer(msg, sock);
        if (!buffer) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite une image' });
        try {
            const sigma = parseFloat(args[0]) || 10;
            const sharp = require('sharp');
            const result = await sharp(buffer).blur(sigma).jpeg().toBuffer();
            await sock.sendMessage(msg.key.remoteJid, { image: result, caption: `💫 *Flou appliqué (${sigma})*` });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },
    pixelate: async ({ sock, msg, args }) => {
        const buffer = await getImageBuffer(msg, sock);
        if (!buffer) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite une image' });
        try {
            const sharp = require('sharp');
            const size = parseInt(args[0]) || 20;
            const img = sharp(buffer);
            const meta = await img.metadata();
            const result = await sharp(buffer)
                .resize(Math.floor(meta.width / size), Math.floor(meta.height / size))
                .resize(meta.width, meta.height, { kernel: 'nearest' })
                .jpeg().toBuffer();
            await sock.sendMessage(msg.key.remoteJid, { image: result, caption: '🟦 *Pixelisation appliquée*' });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },
    beautiful: createEffectCommand('beautiful', '✨ *Beautiful!*'),
    jail: createEffectCommand('jail', '🔒 *En prison!*'),
    affect: createEffectCommand('affect', '😢 *Affect*'),
    facepalm: createEffectCommand('facepalm', '🤦 *Facepalm*'),
    trash: createEffectCommand('trash', '🗑️ *Trash*'),
    shit: createEffectCommand('shit', '💩 *Shit*'),
    rainbow: async ({ sock, msg }) => {
        const buffer = await getImageBuffer(msg, sock);
        if (!buffer) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite une image' });
        try {
            const sharp = require('sharp');
            const result = await sharp(buffer).modulate({ saturation: 3, brightness: 1.1 }).jpeg().toBuffer();
            await sock.sendMessage(msg.key.remoteJid, { image: result, caption: '🌈 *Effet Arc-en-ciel*' });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    },
    darkness: async ({ sock, msg }) => {
        const buffer = await getImageBuffer(msg, sock);
        if (!buffer) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Envoie ou cite une image' });
        try {
            const sharp = require('sharp');
            const result = await sharp(buffer).modulate({ brightness: 0.3 }).jpeg().toBuffer();
            await sock.sendMessage(msg.key.remoteJid, { image: result, caption: '🌑 *Assombri*' });
        } catch (e) {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Erreur: ${e.message}` });
        }
    }
};

const aliases = {
    'gris': 'greyscale',
    'grey': 'greyscale',
    'inverse': 'invert1',
    'flou': 'blur'
};

module.exports = { commands, aliases };
