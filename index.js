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
const path = require('path');
const { getOwnerJid, isOwner, formatUptime, OWNER_NUMBER } = require('./lib/helper');
const { loadCommands, getCommand } = require('./lib/commandHandler');

const PREFIX   = process.env.PREFIX   || '!';
const BOT_NAME = process.env.BOT_NAME || 'ZENOS-MD-V1';
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');
const startTime = Date.now();
global.startTime = startTime;

// ─── Dossiers / fichiers requis ───────────────────────────────────────────────
fs.ensureDirSync('./data');
fs.ensureDirSync(AUTH_DIR);
if (!fs.existsSync('./data/settings.json')) {
    fs.writeJsonSync('./data/settings.json', { theme: 'galaxy', prefix: '!', botName: 'ZENOS-MD-V1', language: 'fr' }, { spaces: 2 });
}

process.on('uncaughtException',  err => console.error('❌ Exception non capturée:', err.message));
process.on('unhandledRejection', err => console.error('❌ Promesse rejetée:', err?.message || err));

// ─── SESSION PERSISTANTE ─────────────────────────────────────────────────────
// Restaure la session depuis la variable d'environnement SESSION_DATA (base64)
// Cela permet de garder la session même après redéploiement sur Render.com
function restoreSessionFromEnv() {
    const sessionData = process.env.SESSION_DATA;
    if (!sessionData) return false;
    try {
        const decoded = Buffer.from(sessionData, 'base64').toString('utf8');
        const data = JSON.parse(decoded);
        fs.ensureDirSync(AUTH_DIR);
        for (const [filename, content] of Object.entries(data)) {
            const filePath = path.join(AUTH_DIR, filename);
            if (typeof content === 'string') fs.writeFileSync(filePath, content, 'utf8');
            else fs.writeJsonSync(filePath, content, { spaces: 2 });
        }
        console.log('✅ Session restaurée depuis SESSION_DATA');
        return true;
    } catch (e) {
        console.error('⚠️ Impossible de restaurer la session:', e.message);
        return false;
    }
}

// Sauvegarde la session courante en base64 (à copier dans l'env Render)
async function backupSession() {
    try {
        const files = fs.readdirSync(AUTH_DIR);
        const data = {};
        for (const f of files) {
            const filePath = path.join(AUTH_DIR, f);
            try {
                data[f] = fs.readJsonSync(filePath);
            } catch {
                data[f] = fs.readFileSync(filePath, 'utf8');
            }
        }
        const b64 = Buffer.from(JSON.stringify(data)).toString('base64');
        fs.writeFileSync('./data/session_backup.txt', b64, 'utf8');
        // Exporter aussi dans global pour la commande !session
        global.sessionBase64 = b64;
        return b64;
    } catch { return null; }
}

// Exporter backupSession pour la commande !session dans admin.js
global.backupSession = backupSession;

let sock = null;
let pairingCodeRequested = false;
let keepAliveInterval = null;

// ─── KEEP-ALIVE (25 secondes) ─────────────────────────────────────────────────
function startKeepAlive() {
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
    console.log('💓 Keep-alive démarré (25s)');
}

// ─── CONNEXION WHATSAPP ───────────────────────────────────────────────────────
async function connectToWhatsApp() {
    // Restaurer la session depuis env si disponible
    restoreSessionFromEnv();

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
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
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 500
    });

    // Exporter sock globalement pour les commandes qui en ont besoin
    global.sock = sock;

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // ── PAIRING CODE : demandé au bon moment (quand QR serait affiché) ──
        if (qr && !pairingCodeRequested && !sock.authState.creds.registered) {
            pairingCodeRequested = true;
            try {
                const code = await sock.requestPairingCode(phoneNumber);
                const fmt = code?.match(/.{1,4}/g)?.join('-') || code;
                console.log('\n╔══════════════════════════════════════════╗');
                console.log('║      🔗 CODE DE COUPLAGE ZENOS-MD-V1    ║');
                console.log('╠══════════════════════════════════════════╣');
                console.log(`║  CODE :  ${fmt.padEnd(32)}║`);
                console.log('╠══════════════════════════════════════════╣');
                console.log(`║  Numéro: ${phoneNumber.padEnd(31)}║`);
                console.log('║  Expiration: ~60 secondes                ║');
                console.log('╠══════════════════════════════════════════╣');
                console.log('║  WhatsApp > ⚙️ > Appareils connectés    ║');
                console.log('║  > "Coupler avec un numéro de tél."     ║');
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
            // Sauvegarder la session dès la connexion
            await backupSession();
            setTimeout(sendConnectedMessage, 2000);
        }

        if (connection === 'close') {
            if (keepAliveInterval) { clearInterval(keepAliveInterval); keepAliveInterval = null; }
            const code = lastDisconnect?.error?.output?.statusCode;
            console.log(`🔴 Connexion fermée (code: ${code})`);

            if (code === DisconnectReason.loggedOut || code === 401) {
                console.log('🚪 Session invalide — suppression et reconnexion...');
                await fs.remove(AUTH_DIR).catch(() => {});
                pairingCodeRequested = false;
                setTimeout(connectToWhatsApp, 3000);
            } else {
                pairingCodeRequested = false;
                const delay = code === DisconnectReason.restartRequired ? 1000 : 5000;
                console.log(`🔄 Reconnexion dans ${delay / 1000}s...`);
                setTimeout(connectToWhatsApp, delay);
            }
        }
    });

    sock.ev.on('creds.update', async (...args) => {
        saveCreds(...args);
        await backupSession();
    });

    // ─── TRAITEMENT DES MESSAGES ──────────────────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message) continue;

            // Déterminer l'expéditeur
            // IMPORTANT: fromMe=true quand l'owner envoie depuis son téléphone principal
            // (bot = appareil lié) → NE PAS ignorer ces messages
            let sender;
            if (msg.key.remoteJid?.endsWith('@g.us')) {
                sender = msg.key.participant || msg.key.remoteJid;
            } else if (msg.key.fromMe) {
                sender = getOwnerJid();
            } else {
                sender = msg.key.remoteJid;
            }

            if (!sender) continue;
            if (!isOwner(sender)) continue;

            // Extraire le texte
            const msgType = Object.keys(msg.message)[0];
            let text = '';
            if (msgType === 'conversation')       text = msg.message.conversation;
            else if (msgType === 'extendedTextMessage') text = msg.message.extendedTextMessage?.text || '';
            else if (msgType === 'imageMessage')  text = msg.message.imageMessage?.caption || '';
            else if (msgType === 'videoMessage')  text = msg.message.videoMessage?.caption || '';
            else if (msgType === 'documentMessage') text = msg.message.documentMessage?.caption || '';

            text = text?.trim() || '';
            if (!text.startsWith(PREFIX)) continue;

            const raw   = text.slice(PREFIX.length).trim();
            const parts = raw.split(/\s+/);
            const rawCmd = parts[0] || '';
            const args   = parts.slice(1);
            const cmdName = rawCmd.toLowerCase();
            const body    = raw.slice(rawCmd.length).trim();

            const cmdEntry = getCommand(cmdName);
            if (!cmdEntry) continue;

            const jid = msg.key.remoteJid;
            console.log(`📩 [${new Date().toLocaleTimeString('fr-FR')}] ${PREFIX}${cmdName} | ${sender.split('@')[0]}`);

            try {
                await cmdEntry.handler({ sock, msg, sender, args, body, text, cmdName, prefix: PREFIX, botName: BOT_NAME, startTime });
            } catch (e) {
                console.error(`❌ Erreur ${PREFIX}${cmdName}:`, e.message);
                try { await sock.sendMessage(jid, { text: `❌ Erreur *${PREFIX}${cmdName}*\n_${e.message}_` }); } catch {}
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
            text: `╔══════════════════════════╗\n║   ✅ ZENOS-MD-V1 ACTIF   ║\n╠══════════════════════════╣\n║ 🤖 Connecté & opérationnel\n║ 💾 Session sauvegardée\n║ 💓 Keep-alive actif (25s)\n║ 🔒 Mode : Privé (Owner)\n║ ⚡ Uptime: ${uptime}\n╠══════════════════════════╣\n║ Tape *!menu* pour commencer\n║ Tape *!session* pour la session\n╚══════════════════════════╝`
        });
    } catch (e) {
        console.error('Erreur msg connexion:', e.message);
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
        owner: OWNER_NUMBER,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        connected: !!(sock?.user),
        user: sock?.user?.name || null,
        keepAlive: keepAliveInterval !== null,
        timestamp: new Date().toISOString()
    }));
}).listen(PORT, () => console.log(`🌐 Serveur ping sur le port ${PORT}`));

console.log(`\n🚀 Démarrage de ${BOT_NAME}...`);
console.log(`👑 Owner: +${OWNER_NUMBER} | Préfixe: ${PREFIX}\n`);
connectToWhatsApp();
