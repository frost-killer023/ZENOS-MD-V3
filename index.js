require('dotenv').config();
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
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
let pairingCodeRequested = false;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();
    const phoneNumber = OWNER_NUMBER.replace(/[^0-9]/g, '');

    sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        // IMPORTANT: pas de browser mobile pour pairing code
        browser: ['Ubuntu', 'Chrome', '121.0.0.0'],
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        printQRInTerminal: false  // on gère nous-mêmes
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // ✅ CORRECT TIMING: demander le pairing code quand le QR serait généré
        // C'est exactement le bon moment — WA servers sont prêts à authentifier
        if (qr && !pairingCodeRequested && !sock.authState.creds.registered) {
            pairingCodeRequested = true;
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                // Formater le code en groupes de 4 (ex: ABCD-EFGH)
                const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log('\n');
                console.log('╔══════════════════════════════════════════╗');
                console.log('║      🔗 CODE DE COUPLAGE ZENOS-MD-V1    ║');
                console.log('╠══════════════════════════════════════════╣');
                console.log(`║                                          ║`);
                console.log(`║         CODE :  ${formattedCode}             ║`);
                console.log(`║                                          ║`);
                console.log('╠══════════════════════════════════════════╣');
                console.log('║  Sur WhatsApp :                          ║');
                console.log('║  ⚙️  Paramètres > Appareils connectés   ║');
                console.log('║  📱 "Coupler avec un numéro de tél."    ║');
                console.log('║  ➡️  Entre le code ci-dessus             ║');
                console.log('╚══════════════════════════════════════════╝');
                console.log('\n');
            } catch (e) {
                console.error('❌ Pairing code échoué:', e.message);
                // Fallback: afficher le QR code
                pairingCodeRequested = false;
                const QRCode = require('qrcode');
                try {
                    const qrStr = await QRCode.toString(qr, { type: 'terminal', small: true });
                    console.log('\n📱 Fallback QR Code:\n');
                    console.log(qrStr);
                } catch {
                    console.log('QR brut:', qr);
                }
            }
        } else if (qr && !pairingCodeRequested) {
            // Afficher QR si déjà enregistré (ne devrait pas arriver)
            const QRCode = require('qrcode');
            try {
                const qrStr = await QRCode.toString(qr, { type: 'terminal', small: true });
                console.log('\n📱 QR Code:\n');
                console.log(qrStr);
            } catch {}
        }

        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode;
            const reason = lastDisconnect?.error?.output?.payload?.error || 'inconnue';
            console.log(`🔴 Connexion fermée. Code: ${code} | Raison: ${reason}`);

            if (code === DisconnectReason.loggedOut) {
                console.log('🚪 Déconnexion volontaire — suppression de session...');
                await fs.remove('auth_info_baileys').catch(() => {});
                pairingCodeRequested = false;
                setTimeout(connectToWhatsApp, 3000);
            } else if (code === DisconnectReason.restartRequired) {
                console.log('🔄 Redémarrage requis...');
                pairingCodeRequested = false;
                setTimeout(connectToWhatsApp, 2000);
            } else if (code === 401) {
                console.log('⛔ Non autorisé — suppression session et reconnexion...');
                await fs.remove('auth_info_baileys').catch(() => {});
                pairingCodeRequested = false;
                setTimeout(connectToWhatsApp, 3000);
            } else {
                console.log('🔄 Reconnexion dans 5 secondes...');
                pairingCodeRequested = false;
                setTimeout(connectToWhatsApp, 5000);
            }
        }

        if (connection === 'connecting') {
            console.log('🔄 Connexion aux serveurs WhatsApp...');
        }

        if (connection === 'open') {
            console.log(`\n✅ ${BOT_NAME} connecté avec succès!`);
            console.log(`👤 Compte: ${sock.user?.name || 'N/A'} (+${sock.user?.id?.split(':')[0] || 'N/A'})\n`);
            loadCommands();
            setTimeout(sendConnectedMessage, 2000);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message) continue;
            if (msg.key.fromMe) continue;

            const sender = msg.key.remoteJid?.endsWith('@g.us')
                ? (msg.key.participant || msg.key.remoteJid)
                : msg.key.remoteJid;

            if (!sender) continue;
            if (!isOwner(sender)) continue;

            const msgType = Object.keys(msg.message)[0];
            let text = '';

            if (msgType === 'conversation') {
                text = msg.message.conversation;
            } else if (msgType === 'extendedTextMessage') {
                text = msg.message.extendedTextMessage?.text || '';
            } else if (msgType === 'imageMessage') {
                text = msg.message.imageMessage?.caption || '';
            } else if (msgType === 'videoMessage') {
                text = msg.message.videoMessage?.caption || '';
            } else if (msgType === 'documentMessage') {
                text = msg.message.documentMessage?.caption || '';
            }

            text = text?.trim() || '';
            if (!text.startsWith(PREFIX)) continue;

            const parts = text.slice(PREFIX.length).trim().split(/\s+/);
            const rawCmd = parts[0] || '';
            const args = parts.slice(1);
            const cmdName = rawCmd.toLowerCase();
            const body = text.slice(PREFIX.length + rawCmd.length).trim();

            const cmdEntry = getCommand(cmdName);
            if (!cmdEntry) continue;

            console.log(`📩 [${new Date().toLocaleTimeString('fr-FR')}] !${cmdName} | ${sender.split('@')[0]}`);

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
                console.error(`❌ Erreur !${cmdName}:`, e.message);
                try {
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: `❌ Erreur commande *!${cmdName}*\n${e.message}`
                    });
                } catch {}
            }
        }
    });

    return sock;
}

async function sendConnectedMessage() {
    try {
        const ownerJid = getOwnerJid();
        const uptime = formatUptime(Math.floor((Date.now() - startTime) / 1000));
        await sock.sendMessage(ownerJid, {
            text: `╔══════════════════════════╗\n║   ✅ ZENOS-MD-V1 ACTIF   ║\n╠══════════════════════════╣\n║ 🤖 Bot connecté avec succès\n║ 📱 Compte WhatsApp lié\n║ 🔒 Mode : Privé (Owner only)\n║ ⏰ Disponible 24h/24 - 7j/7\n║ 🌐 Hébergé sur le cloud\n║ ⚡ Uptime: ${uptime}\n║\n║ Tape !menu pour voir\n║ toutes les commandes 🚀\n╚══════════════════════════╝`
        });
    } catch (e) {
        console.error('Erreur message connexion:', e.message);
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
        connected: !!(sock?.user),
        user: sock?.user?.name || null
    }));
}).listen(PORT, () => {
    console.log(`🌐 Serveur ping actif sur le port ${PORT}`);
});

console.log(`\n🚀 Démarrage de ${BOT_NAME}...`);
console.log(`👑 Propriétaire: +${OWNER_NUMBER}`);
console.log(`📌 Préfixe: ${PREFIX}\n`);
connectToWhatsApp();
