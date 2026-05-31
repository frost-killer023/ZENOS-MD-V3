require('dotenv').config();
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs-extra');
const { isOwner, getOwnerJid, formatUptime, OWNER_NUMBER } = require('./lib/helper');
const { loadCommands, getCommand } = require('./lib/commandHandler');

const PREFIX = process.env.PREFIX || '!';
const BOT_NAME = process.env.BOT_NAME || 'ZENOS-MD-V1';
const startTime = Date.now();
global.startTime = startTime;

process.on('uncaughtException', err => {
    console.error('❌ Erreur non capturée:', err.message);
});
process.on('unhandledRejection', err => {
    console.error('❌ Promesse rejetée:', err?.message || err);
});

let sock = null;
let pairingCodeSent = false;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        browser: ['ZENOS-MD-V1', 'Chrome', '121.0.0'],
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        retryRequestDelayMs: 250
    });

    // Pairing code si pas encore authentifié
    if (!sock.authState.creds.registered && !pairingCodeSent) {
        pairingCodeSent = true;
        await new Promise(r => setTimeout(r, 3000));
        const phoneNumber = OWNER_NUMBER.replace(/[^0-9]/g, '');
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log('\n╔══════════════════════════════════════╗');
            console.log('║       🔗 CODE DE COUPLAGE ZENOS-MD   ║');
            console.log('╠══════════════════════════════════════╣');
            console.log(`║  Code : ${code}                        `);
            console.log('╠══════════════════════════════════════╣');
            console.log('║ WhatsApp > Appareils > Coupler avec  ║');
            console.log('║ numéro de téléphone                  ║');
            console.log('╚══════════════════════════════════════╝\n');
        } catch (e) {
            console.error('Erreur pairing code:', e.message);
            console.log('\n📱 Scan le QR code pour connecter le bot (voir plus haut)\n');
        }
    }

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            const QRCode = require('qrcode');
            try {
                const qrString = await QRCode.toString(qr, { type: 'terminal', small: true });
                console.log('\n📱 QR CODE (scanne dans WhatsApp):\n');
                console.log(qrString);
            } catch {
                console.log('QR:', qr);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('🔄 Connexion fermée. Reconnexion:', shouldReconnect);
            if (shouldReconnect) {
                pairingCodeSent = false;
                setTimeout(connectToWhatsApp, 5000);
            } else {
                console.log('❌ Déconnecté. Supprime auth_info_baileys/ et redémarre.');
                fs.removeSync('auth_info_baileys');
                setTimeout(connectToWhatsApp, 3000);
            }
        }

        if (connection === 'open') {
            console.log(`\n✅ ${BOT_NAME} connecté avec succès!\n`);
            loadCommands();
            await sendConnectedMessage();
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message) continue;
            if (msg.key.fromMe) continue;

            const sender = msg.key.remoteJid?.includes('@g.us')
                ? msg.key.participant
                : msg.key.remoteJid;

            if (!sender) continue;
            if (!isOwner(sender)) continue;

            const msgType = Object.keys(msg.message)[0];
            let text = '';

            if (msgType === 'conversation') text = msg.message.conversation;
            else if (msgType === 'extendedTextMessage') text = msg.message.extendedTextMessage?.text;
            else if (msgType === 'imageMessage') text = msg.message.imageMessage?.caption || '';
            else if (msgType === 'videoMessage') text = msg.message.videoMessage?.caption || '';

            text = text?.trim() || '';

            if (!text.startsWith(PREFIX)) continue;

            const [rawCmd, ...args] = text.slice(PREFIX.length).trim().split(/\s+/);
            const cmdName = rawCmd.toLowerCase();
            const body = text.slice(PREFIX.length + rawCmd.length).trim();

            const cmdEntry = getCommand(cmdName);
            if (!cmdEntry) continue;

            console.log(`📩 Commande: ${PREFIX}${cmdName} | De: ${sender}`);

            try {
                await cmdEntry.handler({
                    sock,
                    msg,
                    sender,
                    args,
                    body,
                    text,
                    cmdName,
                    prefix: PREFIX,
                    botName: BOT_NAME,
                    startTime
                });
            } catch (e) {
                console.error(`Erreur commande ${cmdName}:`, e.message);
                await sock.sendMessage(msg.key.remoteJid, {
                    text: `❌ Erreur lors de l'exécution de *${PREFIX}${cmdName}*: ${e.message}`
                });
            }
        }
    });

    return sock;
}

async function sendConnectedMessage() {
    try {
        const ownerJid = getOwnerJid();
        const uptimeStr = formatUptime(Math.floor((Date.now() - startTime) / 1000));
        await sock.sendMessage(ownerJid, {
            text: `╔══════════════════════════╗\n║   ✅ ZENOS-MD-V1 ACTIF   ║\n╠══════════════════════════╣\n║ 🤖 Bot connecté avec succès\n║ 📱 Compte WhatsApp lié\n║ 🔒 Mode : Privé (Owner only)\n║ ⏰ Disponible 24h/24 - 7j/7\n║ 🌐 Hébergé sur le cloud\n║ ⚡ Uptime: ${uptimeStr}\n║\n║ Tape !menu pour voir\n║ toutes les commandes 🚀\n╚══════════════════════════╝`
        });
    } catch (e) {
        console.error('Erreur envoi message connexion:', e.message);
    }
}

// Serveur HTTP pour UptimeRobot
const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'online',
        bot: BOT_NAME,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        connected: sock?.user ? true : false
    }));
}).listen(PORT, () => {
    console.log(`🌐 Serveur HTTP actif sur le port ${PORT} (pour UptimeRobot)`);
});

console.log(`🚀 Démarrage de ${BOT_NAME}...`);
connectToWhatsApp();
