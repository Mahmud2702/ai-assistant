const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios  = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:8800';
const API_KEY = process.env.API_KEY || 'legallens_secret_2024';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
  timeout: 45000,
});

// ── Commands ──────────────────────────────────────────────────────────────────
const CMDS = {
  '!সারাংশ':    'summary',
  '!summary':    'summary',
  '!rewrite':    'rewrite',
  '!লেখো':      'rewrite',
  '!distribute': 'distribute',
  '!শেয়ার':    'distribute',
};

const HELP = `🤖 *AI Assistant*

*Text commands:*
!সারাংশ [text] — summary
!rewrite [text] — rewrite
!distribute [text] — Social/Email/SMS

*Chat:*
!চ্যাট — এই chat এর শেষ ২০ message এর summary

*Info:*
!status — AI status দেখো`;

// ── Client ────────────────────────────────────────────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: '/app/.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  },
});

client.on('qr', qr => {
  console.log('\n📱 QR Code স্ক্যান করো:\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => console.log('✅ WhatsApp Bot চালু!'));

client.on('disconnected', reason => {
  console.log('🔌 Disconnected:', reason, '— 10s পরে reconnect...');
  setTimeout(() => client.initialize(), 10000);
});

// ── Messages ──────────────────────────────────────────────────────────────────
client.on('message', async msg => {
  try {
    const body = msg.body?.trim();
    if (!body) return;

    // !status
    if (body === '!status') {
      const r = await api.get('/');
      const s = r.data.ai_status;
      return msg.reply(
        `🤖 *AI Status*\nGemini: ${s.gemini}\nClaude: ${s.claude}\nMode: ${s.active}`
      );
    }

    // !help
    if (body === '!help' || body === '!সাহায্য') return msg.reply(HELP);

    // !চ্যাট
    if (body === '!চ্যাট' || body === '!chat') return handleChatSummary(msg);

    // text commands
    for (const [cmd, mode] of Object.entries(CMDS)) {
      if (body.toLowerCase().startsWith(cmd.toLowerCase())) {
        const text = body.slice(cmd.length).trim();
        if (!text) return msg.reply(`⚠️ Text দাও!\nউদাহরণ: ${cmd} তোমার text...`);
        return handleText(msg, text, mode);
      }
    }
  } catch (err) {
    console.error('Handler error:', err.message);
    msg.reply('❌ কিছু সমস্যা হয়েছে। আবার চেষ্টা করো।');
  }
});

// ── Handlers ──────────────────────────────────────────────────────────────────
async function handleText(msg, text, mode) {
  await msg.reply('⏳ প্রক্রিয়া করছি...');
  const r = await api.post('/text/process', { text, mode });
  const labels = { summary: '📋 সারাংশ', rewrite: '✍️ Rewrite', distribute: '📢 Distribution' };
  msg.reply(`${labels[mode] || mode}:\n\n${r.data.result}`);
}

async function handleChatSummary(msg) {
  await msg.reply('⏳ Chat পড়ছি...');
  const chat  = await msg.getChat();
  const all   = await chat.fetchMessages({ limit: 20 });
  const texts = all
    .filter(m => m.body && m.type === 'chat')
    .map(m => `${m.fromMe ? 'আমি' : (m.author || 'অন্যজন')}: ${m.body}`);
  if (!texts.length) return msg.reply('⚠️ কোনো text message পাওয়া যায়নি।');
  const r = await api.post('/whatsapp/summary', { messages: texts, chat_name: chat.name || 'Chat' });
  msg.reply(`📊 *Chat Summary (${texts.length} messages):*\n\n${r.data.summary}`);
}

// ── Start ─────────────────────────────────────────────────────────────────────
console.log('🚀 Starting WhatsApp Bot...');
client.initialize();
