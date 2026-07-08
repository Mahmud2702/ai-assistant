# 🤖 AI Assistant — Railway Deploy Guide

Docker লাগবে না। Laptop এ কিছু install লাগবে না।
GitHub → Railway → চলবে 24/7।

---

## 📁 Structure

```
ai-assistant/
├── api/              ← FastAPI (PDF + Text + WhatsApp summary)
│   ├── main.py
│   ├── requirements.txt
│   └── railway.toml
├── whatsapp-bot/     ← WhatsApp bot
│   ├── bot.js
│   ├── package.json
│   └── railway.toml
├── .gitignore
└── .env.example
```

---

## 🚀 Deploy করার steps

### Step 1 — GitHub এ upload করো

```bash
cd ai-assistant
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/তোমার-username/ai-assistant.git
git push -u origin main
```

### Step 2 — Railway তে API deploy করো

1. [railway.app](https://railway.app) → **Login with GitHub**
2. **New Project** → **Deploy from GitHub repo**
3. তোমার `ai-assistant` repo select করো
4. **Root Directory** → `api` দাও
5. **Variables** tab এ এগুলো add করো:
   ```
   GEMINI_API_KEY    = তোমার Gemini key
   ANTHROPIC_API_KEY = তোমার Anthropic key
   API_KEY           = legallens_secret_2024
   ```
6. Deploy হলে **URL copy করো** (যেমন: `https://ai-assistant-api.up.railway.app`)

### Step 3 — Railway তে WhatsApp Bot deploy করো

1. Same project এ **+ New Service** → **GitHub Repo**
2. Same repo, **Root Directory** → `whatsapp-bot`
3. **Variables** এ add করো:
   ```
   API_URL = https://ai-assistant-api.up.railway.app   ← Step 2 এর URL
   API_KEY = legallens_secret_2024
   ```
4. Deploy করো

### Step 4 — WhatsApp QR Scan করো

Railway dashboard → `whatsapp-bot` service → **Logs** tab খোলো।
QR code দেখাবে — WhatsApp দিয়ে scan করো।

**একবার scan করলেই হবে।** Railway volume এ auth save থাকবে।

---

## 📱 WhatsApp Commands

| Command | কাজ |
|---|---|
| `!সারাংশ [text]` | Summary |
| `!rewrite [text]` | Rewrite |
| `!distribute [text]` | Social/Email/SMS 3 version |
| `!চ্যাট` | এই chat এর last 20 message summary |
| `!status` | Gemini/Claude status দেখো |
| `!help` | সব commands |

---

## 🌐 API Use করতে (PDF summary)

```bash
# PDF summary
curl -X POST https://your-api.up.railway.app/pdf/summary \
  -H "x-api-key: legallens_secret_2024" \
  -F "file=@document.pdf"

# Text summary
curl -X POST https://your-api.up.railway.app/text/process \
  -H "Content-Type: application/json" \
  -H "x-api-key: legallens_secret_2024" \
  -d '{"text": "তোমার text", "mode": "summary"}'
```

Interactive docs: `https://your-api.up.railway.app/docs`

---

## 🔄 AI Fallback Logic

```
Request আসলো
    ↓
Gemini try করো
    ↓ (fail হলে)
Claude try করো
    ↓ (fail হলে)
Error দাও
```

!status command দিয়ে কোনটা active দেখতে পাবে।

---

## 🗑️ GitHub থেকে delete করতে চাইলে

Deploy হয়ে যাওয়ার পর repo delete করলেও Railway চলতে থাকবে।
অথবা repo private করো — Railway তখনও চলবে।
