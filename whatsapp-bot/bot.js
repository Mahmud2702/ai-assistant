import{rmSync,existsSync}from 'fs';
if(existsSync('/tmp/auth'))rmSync('/tmp/auth',{recursive:true,force:true});
import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import axios from 'axios';
import pino from 'pino';

const API_URL = process.env.API_URL || 'http://localhost:8800';
const API_KEY = process.env.API_KEY || 'legallens_secret_2024';
const PHONE = process.env.PHONE_NUMBER || '';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
  timeout: 45000,
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('/tmp/auth');
  
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr && PHONE && !sock.authState.creds.registered) {
      console.log('Requesting pairing code for:', PHONE);
      try {
        const code = await sock.requestPairingCode(PHONE);
        console.log('PAIRING CODE:', code);
      } catch(e) {
        console.error('Pairing error:', e.message);
      }
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) setTimeout(startBot, 5000);
    }
    if (connection === 'open') console.log('✅ WhatsApp Connected!');
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    const from = msg.key.remoteJid;
    const reply = async (t) => sock.sendMessage(from, { text: t });
    const cmds = { '!summary': 'summary', '!rewrite': 'rewrite', '!distribute': 'distribute' };
    for (const [cmd, mode] of Object.entries(cmds)) {
      if (text.toLowerCase().startsWith(cmd)) {
        const content = text.slice(cmd.length).trim();
        if (!content) return reply('Text দাও!');
        await reply('⏳ Processing...');
        const r = await api.post('/text/process', { text: content, mode });
        return reply(r.data.result);
      }
    }
    if (text === '!help') reply('Commands:\n!summary [text]\n!rewrite [text]\n!distribute [text]');
  });
}

console.log('🚀 Starting...');
startBot();