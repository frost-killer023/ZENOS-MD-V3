const axios = require('axios');
const { randomInt } = require('../lib/helper');
const crypto = require('crypto');

const commands = {
    calc: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !calc <expression>\nEx: !calc 5*8+2' });
        try {
            const math = require('mathjs');
            const result = math.evaluate(body);
            await sock.sendMessage(msg.key.remoteJid, { text: `🧮 *Calculatrice*\n\n📝 Expression: ${body}\n✅ Résultat: *${result}*` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Expression mathématique invalide!' });
        }
    },

    translate: async ({ sock, msg, args, body }) => {
        if (args.length < 2) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !translate <lang> <texte>\nEx: !translate en Bonjour tout le monde' });
        const lang = args[0];
        const text = args.slice(1).join(' ');
        try {
            const res = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=fr|${lang}`);
            const translated = res.data.responseData.translatedText;
            await sock.sendMessage(msg.key.remoteJid, { text: `🌐 *Traduction*\n\n📝 Original (fr): ${text}\n✅ Traduit (${lang}): *${translated}*` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur de traduction. Vérifiez le code de langue (ex: en, es, ar, zh).' });
        }
    },

    weather: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !weather <ville>' });
        try {
            const res = await axios.get(`https://wttr.in/${encodeURIComponent(body)}?format=j1`, { timeout: 10000 });
            const w = res.data.current_condition[0];
            const desc = w.weatherDesc[0].value;
            const temp = w.temp_C;
            const feels = w.FeelsLikeC;
            const humidity = w.humidity;
            const wind = w.windspeedKmph;
            await sock.sendMessage(msg.key.remoteJid, { text: `🌤️ *Météo - ${body}*\n\n🌡️ Température: ${temp}°C\n🤔 Ressenti: ${feels}°C\n💧 Humidité: ${humidity}%\n💨 Vent: ${wind} km/h\n☁️ Conditions: ${desc}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Impossible de récupérer la météo pour "${body}"` });
        }
    },

    time: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !time <ville/pays>' });
        try {
            const res = await axios.get(`https://worldtimeapi.org/api/timezone`, { timeout: 8000 });
            const zones = res.data.filter(z => z.toLowerCase().includes(body.toLowerCase()));
            if (!zones.length) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Ville/pays non trouvé' });
            const tzRes = await axios.get(`https://worldtimeapi.org/api/timezone/${zones[0]}`);
            const dt = new Date(tzRes.data.datetime);
            await sock.sendMessage(msg.key.remoteJid, { text: `🕐 *Heure - ${zones[0]}*\n\n⏰ ${dt.toLocaleString('fr-FR')}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur récupération heure' });
        }
    },

    currency: async ({ sock, msg, args }) => {
        if (args.length < 3) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !currency <montant> <DE> <VERS>\nEx: !currency 100 USD EUR' });
        const [amount, from, to] = [parseFloat(args[0]), args[1].toUpperCase(), args[2].toUpperCase()];
        if (isNaN(amount)) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Montant invalide' });
        try {
            const res = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`, { timeout: 8000 });
            const rate = res.data.rates[to];
            if (!rate) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Devise non trouvée' });
            const result = (amount * rate).toFixed(2);
            await sock.sendMessage(msg.key.remoteJid, { text: `💱 *Conversion de devises*\n\n${amount} ${from} = *${result} ${to}*\n📊 Taux: 1 ${from} = ${rate.toFixed(4)} ${to}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur conversion de devises' });
        }
    },

    shorturl: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !shorturl <url>' });
        try {
            const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(body)}`, { timeout: 8000 });
            await sock.sendMessage(msg.key.remoteJid, { text: `🔗 *URL Raccourcie*\n\n📎 Original: ${body}\n✅ Court: ${res.data}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Impossible de raccourcir l\'URL' });
        }
    },

    password: async ({ sock, msg, args }) => {
        const len = parseInt(args[0]) || 16;
        if (len < 4 || len > 64) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Longueur entre 4 et 64 caractères' });
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
        let pwd = '';
        for (let i = 0; i < len; i++) pwd += chars[randomInt(0, chars.length - 1)];
        await sock.sendMessage(msg.key.remoteJid, { text: `🔑 *Mot de passe généré (${len} caractères):*\n\n\`\`\`${pwd}\`\`\`` });
    },

    base64: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !base64 <texte>' });
        const encoded = Buffer.from(body).toString('base64');
        await sock.sendMessage(msg.key.remoteJid, { text: `🔐 *Base64:*\n\n${encoded}` });
    },

    hash: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !hash <texte>' });
        const md5 = crypto.createHash('md5').update(body).digest('hex');
        const sha256 = crypto.createHash('sha256').update(body).digest('hex');
        const sha1 = crypto.createHash('sha1').update(body).digest('hex');
        await sock.sendMessage(msg.key.remoteJid, { text: `#️⃣ *Hashes de:* "${body}"\n\n🔑 MD5:\n${md5}\n\n🔐 SHA1:\n${sha1}\n\n🔒 SHA256:\n${sha256}` });
    },

    ip: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !ip <adresse_ip>' });
        try {
            const res = await axios.get(`http://ip-api.com/json/${body}?lang=fr`, { timeout: 8000 });
            const d = res.data;
            if (d.status === 'fail') return sock.sendMessage(msg.key.remoteJid, { text: '❌ IP invalide' });
            await sock.sendMessage(msg.key.remoteJid, { text: `🌐 *Infos IP: ${body}*\n\n🏳️ Pays: ${d.country}\n🏙️ Ville: ${d.city}\n📍 Région: ${d.regionName}\n🌍 Coordonnées: ${d.lat}, ${d.lon}\n📡 ISP: ${d.isp}\n🔗 AS: ${d.as}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur lookup IP' });
        }
    },

    define: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !define <mot>' });
        try {
            const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(body)}`, { timeout: 8000 });
            const data = res.data[0];
            const meanings = data.meanings.slice(0, 2).map(m => `• ${m.partOfSpeech}: ${m.definitions[0].definition}`).join('\n');
            await sock.sendMessage(msg.key.remoteJid, { text: `📖 *Définition: ${data.word}*\n\n${meanings}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Définition non trouvée pour "${body}"` });
        }
    },

    bmi: async ({ sock, msg, args }) => {
        if (args.length < 2) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !bmi <poids_kg> <taille_cm>' });
        const weight = parseFloat(args[0]);
        const height = parseFloat(args[1]) / 100;
        if (isNaN(weight) || isNaN(height)) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Valeurs invalides' });
        const bmi = (weight / (height * height)).toFixed(1);
        let category = '';
        if (bmi < 18.5) category = '⚠️ Insuffisance pondérale';
        else if (bmi < 25) category = '✅ Poids normal';
        else if (bmi < 30) category = '⚠️ Surpoids';
        else category = '❌ Obésité';
        await sock.sendMessage(msg.key.remoteJid, { text: `⚖️ *Calcul IMC*\n\n🧍 Poids: ${weight} kg\n📏 Taille: ${parseFloat(args[1])} cm\n\n📊 IMC: *${bmi}*\n🏷️ Catégorie: ${category}` });
    },

    age: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !age <DD/MM/YYYY>' });
        const [d, m, y] = body.split('/').map(Number);
        if (!d || !m || !y) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Format: DD/MM/YYYY' });
        const birth = new Date(y, m - 1, d);
        const now = new Date();
        const years = Math.floor((now - birth) / (365.25 * 24 * 60 * 60 * 1000));
        if (years < 0 || years > 150) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Date invalide' });
        const nextBirthday = new Date(now.getFullYear(), m - 1, d);
        if (nextBirthday < now) nextBirthday.setFullYear(now.getFullYear() + 1);
        const daysUntil = Math.ceil((nextBirthday - now) / (24 * 60 * 60 * 1000));
        await sock.sendMessage(msg.key.remoteJid, { text: `🎂 *Calcul d'âge*\n\n📅 Naissance: ${body}\n🎉 Âge: *${years} ans*\n🎁 Prochain anniversaire dans: ${daysUntil} jours` });
    },

    color: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !color #RRGGBB' });
        const hex = body.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        if (isNaN(r) || isNaN(g) || isNaN(b)) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Code hex invalide' });
        await sock.sendMessage(msg.key.remoteJid, { text: `🎨 *Couleur #${hex.toUpperCase()}*\n\n🔴 Rouge: ${r}\n🟢 Vert: ${g}\n🔵 Bleu: ${b}\n\n🎨 RGB: rgb(${r}, ${g}, ${b})` });
    },

    unit: async ({ sock, msg, args }) => {
        if (args.length < 3) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !unit <valeur> <de> <vers>\nEx: !unit 100 km miles' });
        const val = parseFloat(args[0]);
        const from = args[1].toLowerCase();
        const to = args[2].toLowerCase();
        const conversions = {
            'km-miles': v => (v * 0.621371).toFixed(4),
            'miles-km': v => (v * 1.60934).toFixed(4),
            'kg-lbs': v => (v * 2.20462).toFixed(4),
            'lbs-kg': v => (v * 0.453592).toFixed(4),
            'c-f': v => ((v * 9 / 5) + 32).toFixed(2),
            'f-c': v => (((v - 32) * 5) / 9).toFixed(2),
            'cm-inch': v => (v * 0.393701).toFixed(4),
            'inch-cm': v => (v * 2.54).toFixed(4),
            'm-ft': v => (v * 3.28084).toFixed(4),
            'ft-m': v => (v * 0.3048).toFixed(4),
            'l-gallon': v => (v * 0.264172).toFixed(4),
            'gallon-l': v => (v * 3.78541).toFixed(4)
        };
        const key = `${from}-${to}`;
        if (!conversions[key]) {
            const available = Object.keys(conversions).map(k => k.replace('-', ' → ')).join('\n• ');
            return sock.sendMessage(msg.key.remoteJid, { text: `❌ Conversion non supportée\n\n✅ Disponibles:\n• ${available}` });
        }
        const result = conversions[key](val);
        await sock.sendMessage(msg.key.remoteJid, { text: `📐 *Conversion:*\n\n${val} ${from} = *${result} ${to}*` });
    },

    qr: async ({ sock, msg, body }) => {
        if (!body) return sock.sendMessage(msg.key.remoteJid, { text: '❌ Usage: !qr <texte_ou_url>' });
        try {
            const QRCode = require('qrcode');
            const buf = await QRCode.toBuffer(body, { width: 512, margin: 2 });
            await sock.sendMessage(msg.key.remoteJid, { image: buf, caption: `📱 *QR Code généré pour:*\n${body}` });
        } catch {
            await sock.sendMessage(msg.key.remoteJid, { text: '❌ Erreur génération QR code' });
        }
    }
};

const aliases = {
    'trt': 'translate',
    'meteo': 'weather',
    'calculatrice': 'calc',
    'mdp': 'password',
    'imc': 'bmi'
};

module.exports = { commands, aliases };
