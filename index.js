require('dotenv').config();
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino   = require('pino');
const fs     = require('fs-extra');
const path   = require('path');
const http   = require('http');
const { getOwnerJid, isOwner, formatUptime, OWNER_NUMBER } = require('./lib/helper');
const { loadCommands, getCommand } = require('./lib/commandHandler');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const PREFIX     = process.env.PREFIX      || '!';
const BOT_NAME   = process.env.BOT_NAME    || 'ZENOS-MD-V1';
// PHONE_NUMBER = numéro WhatsApp du bot (avec indicatif, sans +)
// Si différent de OWNER_NUMBER, le définir dans les variables Render
const PHONE_NUMBER = (process.env.PHONE_NUMBER || OWNER_NUMBER).replace(/[^0-9]/g, '');
const AUTH_DIR   = path.join(__dirname, 'auth_info_baileys');
const PORT       = process.env.PORT || 3000;
const startTime  = Date.now();
global.startTime = startTime;

// ─── Dossiers ────────────────────────────────────────────────────────────────
fs.ensureDirSync('./data');
fs.ensureDirSync(AUTH_DIR);
if (!fs.existsSync('./data/settings.json')) {
    fs.writeJsonSync('./data/settings.json',
        { theme: 'galaxy', prefix: '!', botName: BOT_NAME, language: 'fr' },
        { spaces: 2 });
}

process.on('uncaughtException',  err => console.error('[ERR]', err.message));
process.on('unhandledRejection', err => console.error('[REJ]', err?.message || err));

// ─── ÉTAT GLOBAL (visible dans la page web) ───────────────────────────────────
const STATE = {
    connected:   false,
    pairingCode: null,
    pairingAt:   null,
    user:        null,
    retries:     0
};

// ─── SESSION PERSISTANTE ─────────────────────────────────────────────────────
function restoreSessionFromEnv() {
    const raw = process.env.SESSION_DATA;
    if (!raw) return false;
    try {
        const data = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        fs.ensureDirSync(AUTH_DIR);
        for (const [file, content] of Object.entries(data)) {
            const fp = path.join(AUTH_DIR, file);
            if (typeof content === 'string') fs.writeFileSync(fp, content, 'utf8');
            else fs.writeJsonSync(fp, content, { spaces: 2 });
        }
        console.log('✅ Session restaurée depuis SESSION_DATA');
        return true;
    } catch (e) {
        console.error('⚠️  Restauration session échouée:', e.message);
        return false;
    }
}

async function backupSession() {
    try {
        const files = fs.readdirSync(AUTH_DIR);
        const data  = {};
        for (const f of files) {
            const fp = path.join(AUTH_DIR, f);
            try { data[f] = fs.readJsonSync(fp); } catch { data[f] = fs.readFileSync(fp, 'utf8'); }
        }
        const b64 = Buffer.from(JSON.stringify(data)).toString('base64');
        fs.writeFileSync('./data/session_backup.txt', b64, 'utf8');
        global.sessionBase64 = b64;
        return b64;
    } catch { return null; }
}
global.backupSession = backupSession;

// ─── SERVEUR HTTP ─────────────────────────────────────────────────────────────
// Page web = affiche le code de couplage en clair + status JSON
http.createServer((req, res) => {
    const url = req.url?.split('?')[0];

    if (url === '/status' || url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
            status: STATE.connected ? 'connected' : 'waiting',
            bot: BOT_NAME, phone: PHONE_NUMBER,
            user: STATE.user, uptime: Math.floor((Date.now() - startTime) / 1000),
            pairingCode: STATE.pairingCode,
            timestamp: new Date().toISOString()
        }));
    }

    // Page principale — affiche le code de pairing si non connecté
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    if (STATE.connected) {
        res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${BOT_NAME}</title>
<style>body{background:#0a0a0a;color:#00ff88;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{text-align:center;padding:40px;border:2px solid #00ff88;border-radius:12px;max-width:500px}
h1{font-size:2em;margin-bottom:10px}p{color:#aaa}
.badge{background:#00ff88;color:#000;padding:8px 20px;border-radius:20px;font-weight:bold;font-size:1.2em}</style></head>
<body><div class="box"><h1>✅ ${BOT_NAME}</h1>
<p>Bot connecté et opérationnel</p>
<p>👤 ${STATE.user || PHONE_NUMBER}</p>
<br><span class="badge">EN LIGNE</span>
<br><br><small style="color:#555">Uptime: ${Math.floor((Date.now() - startTime) / 1000)}s</small></div></body></html>`);
    } else {
        const age = STATE.pairingAt ? Math.floor((Date.now() - STATE.pairingAt) / 1000) : null;
        const expired = age !== null && age > 55;
        res.end(`<!DOCTYPE html><html><head><meta charset="utf-8">
<meta http-equiv="refresh" content="15"><title>${BOT_NAME} — Connexion</title>
<style>body{background:#0a0a0a;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.box{text-align:center;padding:40px;border:2px solid #5555ff;border-radius:12px;max-width:600px}
h1{color:#5555ff}
.code{font-size:3em;letter-spacing:10px;color:#ffdd00;background:#111;padding:20px 30px;border-radius:8px;margin:20px 0;border:2px dashed #ffdd00}
.steps{text-align:left;margin-top:20px;color:#ccc;line-height:2}
.expired{color:#ff4444;font-weight:bold}
.ok{color:#00ff88}</style></head>
<body><div class="box">
<h1>🤖 ${BOT_NAME}</h1>
<p>Numéro WhatsApp du bot : <strong>+${PHONE_NUMBER}</strong></p>
${STATE.pairingCode
    ? `<p>${expired ? '<span class="expired">⏰ Code expiré — nouveau code en cours...</span>' : '<span class="ok">✅ Code actif (valide ~60s)</span>'}</p>
       <div class="code">${STATE.pairingCode}</div>`
    : `<p>⏳ Génération du code en cours...<br><small>(la page se rafraîchit automatiquement)</small></p>`}
<div class="steps">
<strong>📱 Comment entrer le code :</strong><br>
1️⃣ Ouvre WhatsApp sur ton téléphone<br>
2️⃣ ⚙️ Paramètres → Appareils connectés<br>
3️⃣ "Connecter un appareil"<br>
4️⃣ En bas : <strong>"Coupler avec un numéro de téléphone"</strong><br>
5️⃣ Saisis ton numéro <strong>+${PHONE_NUMBER}</strong><br>
6️⃣ Entre le code ci-dessus dans WhatsApp<br>
⚡ <span style="color:#ffdd00">Tu as 60 secondes !</span>
</div>
<br><small style="color:#444">Page auto-rafraîchie toutes les 15s | Tentative #${STATE.retries + 1}</small>
</div></body></html>`);
    }
}).listen(PORT, () => console.log(`\n🌐 Page de connexion: http://localhost:${PORT}`));

// ─── KEEP-ALIVE ───────────────────────────────────────────────────────────────
let keepAliveInterval = null;
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
    console.log('💓 Keep-alive actif (25s)');
}

// ─── BOT ──────────────────────────────────────────────────────────────────────
let sock          = null;
let reconnectTimer = null;
let pairingTimer  = null;

async function connectToWhatsApp() {
    restoreSessionFromEnv();

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version }          = await fetchLatestBaileysVersion();

    console.log(`\n🚀 Baileys v${version.join('.')} | Numéro bot: +${PHONE_NUMBER}`);

    sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        auth: {
            creds: state.creds,
            keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        browser:                    ['Ubuntu', 'Chrome', '121.0.0.0'],
        markOnlineOnConnect:        true,
        generateHighQualityLinkPreview: true,
        syncFullHistory:            false,
        printQRInTerminal:          false,
        connectTimeoutMs:           60000,
        defaultQueryTimeoutMs:      60000,
        keepAliveIntervalMs:        30000
    });
    global.sock = sock;

    // ─── DEMANDER LE PAIRING CODE ────────────────────────────────────────────
    // Si le bot n'est pas encore enregistré, on demande le code tout de suite
    // On le fait dans un setTimeout court pour que le socket soit prêt
    if (!state.creds.registered) {
        if (pairingTimer) clearTimeout(pairingTimer);
        pairingTimer = setTimeout(() => requestCode(false), 3000);
    }

    async function requestCode(isRetry = false) {
        if (STATE.connected) return;
        try {
            if (isRetry) console.log('🔄 Nouveau code de couplage (le précédent a expiré)...');
            const raw  = await sock.requestPairingCode(PHONE_NUMBER);
            const code = raw?.match(/.{1,4}/g)?.join('-') || raw || 'ERREUR';
            STATE.pairingCode = code;
            STATE.pairingAt   = Date.now();
            const bar = '═'.repeat(40);
            console.log(`\n╔${bar}╗`);
            console.log(`║  🔗 CODE DE COUPLAGE ${BOT_NAME.padEnd(17)}║`);
            console.log(`╠${bar}╣`);
            console.log(`║  CODE :  ${code.padEnd(30)}║`);
            console.log(`║  Pour:   +${PHONE_NUMBER.padEnd(29)}║`);
            console.log(`╠${bar}╣`);
            console.log(`║  ⚠️  Tu as 60 secondes pour entrer le code  ║`);
            console.log(`║  📱 Paramètres > Appareils connectés        ║`);
            console.log(`║  > "Coupler avec un numéro de téléphone"    ║`);
            console.log(`║  🌐 Voir aussi: http://localhost:${PORT.toString().padEnd(8)}║`);
            console.log(`╚${bar}╝\n`);

            // Relancer un nouveau code après 55s si pas encore connecté
            if (pairingTimer) clearTimeout(pairingTimer);
            pairingTimer = setTimeout(() => requestCode(true), 55000);
        } catch (e) {
            console.error('❌ Erreur pairing code:', e.message);
            // Réessayer dans 10s
            if (!STATE.connected) {
                if (pairingTimer) clearTimeout(pairingTimer);
                pairingTimer = setTimeout(() => requestCode(false), 10000);
            }
        }
    }

    // ─── CONNEXION UPDATE ─────────────────────────────────────────────────────
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'connecting') {
            console.log('🔄 Connexion aux serveurs WhatsApp...');
        }

        if (connection === 'open') {
            STATE.connected   = true;
            STATE.pairingCode = null;
            STATE.user        = sock.user?.name || `+${sock.user?.id?.split(':')[0]}`;
            if (pairingTimer) { clearTimeout(pairingTimer); pairingTimer = null; }

            console.log(`\n✅ ${BOT_NAME} CONNECTÉ !`);
            console.log(`👤 Compte: ${STATE.user}`);

            loadCommands();
            startKeepAlive();
            await backupSession();
            setTimeout(sendWelcomeMsg, 2500);
        }

        if (connection === 'close') {
            STATE.connected = false;
            if (keepAliveInterval) { clearInterval(keepAliveInterval); keepAliveInterval = null; }

            const code = lastDisconnect?.error?.output?.statusCode;
            console.log(`🔴 Déconnecté (code ${code})`);

            // Session invalide = effacer et recommencer
            if (code === DisconnectReason.loggedOut || code === 401) {
                console.log('🗑️  Session révoquée — réinitialisation...');
                await fs.remove(AUTH_DIR).catch(() => {});
                STATE.pairingCode = null;
                STATE.retries++;
                if (reconnectTimer) clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(connectToWhatsApp, 3000);
            } else {
                STATE.retries++;
                const delay = code === DisconnectReason.restartRequired ? 1000 : 5000;
                console.log(`🔄 Reconnexion dans ${delay / 1000}s...`);
                if (reconnectTimer) clearTimeout(reconnectTimer);
                reconnectTimer = setTimeout(connectToWhatsApp, delay);
            }
        }
    });

    // ─── SAVE CREDS ───────────────────────────────────────────────────────────
    sock.ev.on('creds.update', async (...a) => {
        saveCreds(...a);
        await backupSession();
    });

    // ─── MESSAGES ─────────────────────────────────────────────────────────────
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (!msg.message) continue;

            // Déterminer l'expéditeur
            let sender;
            if (msg.key.remoteJid?.endsWith('@g.us')) {
                sender = msg.key.participant || '';
            } else if (msg.key.fromMe) {
                // Message envoyé par le bot/owner depuis son téléphone
                sender = getOwnerJid();
            } else {
                sender = msg.key.remoteJid || '';
            }

            if (!sender || !isOwner(sender)) continue;

            // Extraire le texte du message
            const mtype = Object.keys(msg.message).find(k => !['senderKeyDistributionMessage','messageContextInfo'].includes(k));
            let text = '';
            if (mtype === 'conversation')          text = msg.message.conversation || '';
            else if (mtype === 'extendedTextMessage') text = msg.message.extendedTextMessage?.text || '';
            else if (mtype === 'imageMessage')     text = msg.message.imageMessage?.caption || '';
            else if (mtype === 'videoMessage')     text = msg.message.videoMessage?.caption || '';
            else if (mtype === 'documentMessage')  text = msg.message.documentMessage?.caption || '';

            text = text.trim();
            if (!text.startsWith(PREFIX)) continue;

            const raw    = text.slice(PREFIX.length).trim();
            const parts  = raw.split(/\s+/);
            const rawCmd = parts[0] || '';
            const args   = parts.slice(1);
            const cmdName = rawCmd.toLowerCase();
            const body    = raw.slice(rawCmd.length).trim();
            const jid     = msg.key.remoteJid;

            const cmdEntry = getCommand(cmdName);
            if (!cmdEntry) continue;

            console.log(`📩 [${new Date().toLocaleTimeString()}] ${PREFIX}${cmdName} | ${sender.split('@')[0]}`);

            try {
                await cmdEntry.handler({
                    sock, msg, sender, args, body, text, cmdName,
                    prefix: PREFIX, botName: BOT_NAME, startTime
                });
            } catch (e) {
                console.error(`❌ Cmd ${cmdName}:`, e.message);
                try {
                    await sock.sendMessage(jid, { text: `❌ Erreur *${PREFIX}${cmdName}*\n_${e.message}_` });
                } catch {}
            }
        }
    });
}

async function sendWelcomeMsg() {
    try {
        const uptime = formatUptime(Math.floor((Date.now() - startTime) / 1000));
        await sock.sendMessage(getOwnerJid(), {
            text: `╔══════════════════════════╗\n║   ✅ ${BOT_NAME} ACTIF  ║\n╠══════════════════════════╣\n║ 🤖 Connecté avec succès\n║ 💾 Session sauvegardée\n║ 💓 Keep-alive actif (25s)\n║ ⏱️  Uptime: ${uptime}\n╠══════════════════════════╣\n║ *!menu* — voir les commandes\n║ *!session* — exporter la session\n║ *!restart* — redémarrer le bot\n╚══════════════════════════╝`
        });
    } catch (e) {
        console.error('Erreur msg bienvenue:', e.message);
    }
}

console.log(`\n🤖 ${BOT_NAME} | Owner: +${OWNER_NUMBER} | Bot: +${PHONE_NUMBER} | Préfixe: ${PREFIX}`);
connectToWhatsApp();
