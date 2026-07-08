const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');
const fs = require('fs');
const { execSync } = require('child_process');

const API_URL = process.env.API_URL || 'http://localhost:8800';
const API_KEY = process.env.API_KEY || 'legallens_secret_2024';

function findChromium() {
  const paths = ['/usr/bin/chromium','/usr/bin/chromium-browser','/usr/bin/google-chrome'];
  for (const p of paths) { if (fs.existsSync(p)) return p; }
  try { return execSync('which chromium chromium-browser 2>/dev/null | head -1',{encoding:'utf8'}).trim() || null; } catch(e) {}
  try { return execSync('find /nix -name chromium -type f 2>/dev/null | head -1',{encoding:'utf8'}).trim() || null; } catch(e) {}
  return null;
}

const chromiumPath = findChromium();
console.log('Chromium:', chromiumPath || 'auto');

const puppeteerConfig = { headless:true, args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--single-process','--no-zygote'] };
if (chromiumPath) puppeteerConfig.executablePath = chromiumPath;

const api = axios.create({ baseURL:API_URL, headers:{'x-api-key':API_KEY,'Content-Type':'application/json'}, timeout:45000 });
const CMDS = { '!summary':'summary','!rewrite':'rewrite','!distribute':'distribute' };

const client = new Client({ authStrategy: new LocalAuth({ dataPath:'/tmp/.wwebjs_auth' }), puppeteer: puppeteerConfig });

client.on('qr', qr => { console.log('\n📱 QR:\n'); qrcode.generate(qr,{small:true}); });
client.on('ready', () => console.log('✅ Bot ready!'));
client.on('disconnected', () => setTimeout(() => client.initialize(), 10000));

client.on('message', async msg => {
  try {
    const body = msg.body?.trim();
    if (!body) return;
    if (body === '!chat') {
      const chat = await msg.getChat();
      const msgs = (await chat.fetchMessages({limit:20})).filter(m=>m.body&&m.type==='chat').map(m=>`${m.fromMe?'Me':m.author||'Other'}: ${m.body}`);
      const r = await api.post('/whatsapp/summary',{messages:msgs,chat_name:chat.name||'Chat'});
      return msg.reply('📊 Summary:\n\n'+r.data.summary);
    }
    for (const [cmd,mode] of Object.entries(CMDS)) {
      if (body.toLowerCase().startsWith(cmd)) {
        const text = body.slice(cmd.length).trim();
        if (!text) return msg.reply('Please add text.');
        await msg.reply('⏳ Processing...');
        const r = await api.post('/text/process',{text,mode});
        return msg.reply(r.data.result);
      }
    }
  } catch(e) { msg.reply('❌ Error. Try again.'); }
});

console.log('🚀 Starting...');
client.initialize();