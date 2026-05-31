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
const { getOwnerJid, isOwner, formatUptime, OWNER_NUMBER } = require('./lib/helper');
const { loadCommands, getCommand } = require('./lib/commandHandler');

const PREFIX = process.env.PREFIX || '!';
const BOT_NAME = process.env.BOT_NAME || 'ZENOS-MD-V1';
const startTime = Date.now();
global.startTime = startTime;

// Ensure data dir + default settings
fs.ensureDirSync('./data');
if (!fs.existsSync('./data/settings.json')) {
    fs.writeJsonSync('./data/settings.json', {
        theme: 'galaxy', prefix: '!', botName: 'ZENOS-MD-V1', language: 'fr'
    }, { spaces: 2 });
}

process.on('uncaughtException', err => console.error('❌ Exception:', err.message));
process.on('unhandledRejection', err => console.error('❌ Rejection:', err?.message || err));

let sock = null;
let pairingCodeRequested = false;
let keepAliveInterval = null;

// ─── KEEP-ALIVE : envoie présence toutes les 25s pour rester actif ───────────
async function startKeepAlive() {
    if (keepAliveInterval) clearInterval(keepAliveInterval);
    const ownerJid = getOwnerJid();
    keepAliveInterval = setInterval(async () => {
        if (!sock?.user) return;
        try {
            await sock.sendPresenceUpdate('recording', ownerJid);
            await new Promise(r => setTimeout(r, 3000));
            await sock.sendPresenceUpdate('available', ownerJid);
        } catch {}
    }, 25000);
    console.log('💓 Keep-alive activé (25s)');
}

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
        browser: ['Ubuntu', 'Chrome', '121.0.0.0'],
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        printQRInTerminal: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000   // Baileys built-in ping
    });

    // ─── PAIRING CODE (au bon moment) ─────────────────────────────────────────
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Intercepte le QR et demande un pairing code à la place
        if (qr && !pairingCodeRequested && !sock.authState.creds.registered) {
            pairingCodeRequested = true;
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                const fmt = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log('\n╔══════════════════════════════════════════╗');
                console.log('║      🔗 CODE DE COUPLAGE ZENOS-MD-V1    ║');
                console.log('╠══════════════════════════════════════════╣');
                console.log(`║         CODE :  ${fmt.padEnd(25)}║`);
                console.log('╠══════════════════════════════════════════╣');
                console.log('║  WhatsApp > Appareils > Coupler numéro  ║');
                console.log('╚══════════════════════════════════════════╝\n');
            } catch (e) {
                console.error('❌ Pairing code échoué:', e.message);
                pairingCodeRequested = false;
            }
        }

        if (connection === 'connecting') {
            console.log('🔄 Connexion aux serveurs WhatsApp...');
        }

        if (connection === 'open') {
            console.log(`\n✅ ${BOT_NAME} connecté !`);
            console.log(`👤 ${sock.user?.name || 'N/A'} (+${sock.user?.id?.split(':')[0] || 'N/A'})\n`);
            loadCommands();
            startKeepAlive();
            setTimeout(sendConnectedMessage, 2000);
        }

        if (connection === 'close') {
            if (keepAliveInterval) { clearInterval(keepAliveInterval); keepAliveInterval = null; }
            const code = lastDisconnect?.error?.output?.statusCode;
            console.log(`🔴 Connexion fermée (code: ${code})`);

            if (code === DisconnectReason.loggedOut || code === 401) {
                console.log('🚪 Session invalide — suppression et reconnexion...');
                await fs.remove('auth_info_baileys').catch(() => {});
                pairingCodeRequested = false;
                setTimeout(connectToWhatsApp, 3000);
            } else {
                pairingCodeRequested = false;
                const delay = code === DisconnectReason.restartRequired ? 1000 : 5000;
                setTimeout(connectToWhatsApp, delay);
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // ─── MESSAGES : traitement des commandes ──────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message) continue;

            // ⚠️ FIX CRITIQUE : NE PAS ignorer fromMe — l'owner envoie avec fromMe=true
            // car le bot est un appareil lié à son compte.
            // On détermine le sender selon le contexte :
            let sender;
            if (msg.key.remoteJid?.endsWith('@g.us')) {
                sender = msg.key.participant || msg.key.remoteJid;
            } else if (msg.key.fromMe) {
                // Message envoyé par l'owner depuis son téléphone principal
                sender = getOwnerJid();
            } else {
                sender = msg.key.remoteJid;
            }

            if (!sender) continue;
            // Bot privé : seul l'owner peut envoyer des commandes
            if (!isOwner(sender)) continue;

            // Extraire le texte selon le type de message
            const msgType = Object.keys(msg.message)[0];
            let text = '';
            if (msgType === 'conversation') text = msg.message.conversation;
            else if (msgType === 'extendedTextMessage') text = msg.message.extendedTextMessage?.text || '';
            else if (msgType === 'imageMessage') text = msg.message.imageMessage?.caption || '';
            else if (msgType === 'videoMessage') text = msg.message.videoMessage?.caption || '';
            else if (msgType === 'documentMessage') text = msg.message.documentMessage?.caption || '';

            text = text?.trim() || '';
            if (!text.startsWith(PREFIX)) continue;

            const raw = text.slice(PREFIX.length).trim();
            const parts = raw.split(/\s+/);
            const rawCmd = parts[0] || '';
            const args = parts.slice(1);
            const cmdName = rawCmd.toLowerCase();
            const body = raw.slice(rawCmd.length).trim();

            const cmdEntry = getCommand(cmdName);
            if (!cmdEntry) continue;

            const jid = msg.key.remoteJid;
            console.log(`📩 [${new Date().toLocaleTimeString('fr-FR')}] ${PREFIX}${cmdName} | ${sender.split('@')[0]}`);

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
                console.error(`❌ Erreur ${PREFIX}${cmdName}:`, e.message);
                try {
                    await sock.sendMessage(jid, {
                        text: `❌ Erreur commande *${PREFIX}${cmdName}*\n_${e.message}_`
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
            text: `╔══════════════════════════╗\n║   ✅ ZENOS-MD-V1 ACTIF   ║\n╠══════════════════════════╣\n║ 🤖 Bot connecté 24h/24   ║\n║ 🔒 Mode : Privé (Owner)  ║\n║ 💓 Keep-alive actif      ║\n║ ⚡ Uptime: ${uptime.padEnd(14)}║\n╠══════════════════════════╣\n║  Tape *!menu* pour voir  ║\n║  toutes les commandes 🚀 ║\n╚══════════════════════════╝`
        });
    } catch (e) {
        console.error('Erreur message connexion:', e.message);
    }
}

// ─── Serveur HTTP ping pour UptimeRobot ──────────────────────────────────────
const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'online',
        bot: BOT_NAME,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        connected: !!(sock?.user),
        user: sock?.user?.name || null,
        keepAlive: keepAliveInterval !== null,
        timestamp: new Date().toISOString()
    }));
}).listen(PORT, () => {
    console.log(`🌐 Serveur ping actif (port ${PORT})`);
});

console.log(`\n🚀 Démarrage de ${BOT_NAME}...`);
console.log(`👑 Owner: +${OWNER_NUMBER} | Préfixe: ${PREFIX}\n`);
connectToWhatsApp();
