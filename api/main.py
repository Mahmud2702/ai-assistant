from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, tempfile, fitz
from typing import Optional

app = FastAPI(title="AI Assistant API", version="2.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

API_KEY = os.getenv("API_KEY", "legallens_secret_2024")

# ── AI Client: Gemini primary, Claude fallback ────────────────────────────────
def ask_ai(prompt: str) -> str:
    """Try Gemini first, fall back to Claude if it fails."""

    # 1️⃣ Try Gemini
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key:
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            r = client.models.generate_content(
                model="gemini-2.0-flash", contents=prompt
            )
            return r.text
        except Exception as e:
            print(f"[Gemini failed] {e} → trying Claude...")

    # 2️⃣ Fallback to Claude
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=anthropic_key)
            msg = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}],
            )
            return msg.content[0].text
        except Exception as e:
            print(f"[Claude failed] {e}")

    raise HTTPException(503, "কোনো AI service পাওয়া যাচ্ছে না। API keys চেক করো।")


# ── Helpers ───────────────────────────────────────────────────────────────────
def verify_key(x_api_key: str):
    if x_api_key != API_KEY:
        raise HTTPException(401, "Invalid API Key")

def extract_pdf(data: bytes) -> str:
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        f.write(data); path = f.name
    doc = fitz.open(path)
    text = "".join(p.get_text() for p in doc)
    doc.close(); os.unlink(path)
    return text


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    gemini_ok = bool(os.getenv("GEMINI_API_KEY"))
    claude_ok  = bool(os.getenv("ANTHROPIC_API_KEY"))
    return {
        "service": "AI Assistant API 🤖",
        "ai_status": {
            "gemini": "✅ ready" if gemini_ok else "❌ no key",
            "claude":  "✅ ready" if claude_ok  else "❌ no key",
            "active":  "gemini→claude fallback" if (gemini_ok and claude_ok)
                       else ("gemini only" if gemini_ok else "claude only"),
        },
        "endpoints": ["/pdf/summary", "/pdf/rewrite", "/text/process", "/whatsapp/summary"],
    }

@app.get("/health")
def health():
    return {"status": "ok"}


# PDF endpoints
@app.post("/pdf/summary")
async def pdf_summary(file: UploadFile = File(...), x_api_key: str = Header(None)):
    verify_key(x_api_key)
    text = extract_pdf(await file.read())
    if not text.strip():
        raise HTTPException(400, "PDF এ text পাওয়া যায়নি")
    summary = ask_ai(
        f"নিচের document টা বাংলায় bullet points এ সংক্ষেপ করো। "
        f"মূল বিষয়গুলো clearly দাও:\n\n{text[:8000]}"
    )
    return {"status": "ok", "filename": file.filename, "summary": summary}

@app.post("/pdf/rewrite")
async def pdf_rewrite(
    file: UploadFile = File(...),
    style: str = "professional",
    x_api_key: str = Header(None),
):
    verify_key(x_api_key)
    text = extract_pdf(await file.read())
    styles = {
        "professional": "formal ও professional বাংলায়",
        "simple":       "সহজ ও সাধারণ বাংলায়",
        "academic":     "academic বাংলায়",
        "creative":     "creative ও engaging বাংলায়",
    }
    result = ask_ai(
        f"নিচের text টা {styles.get(style, 'professional বাংলায়')} rewrite করো। "
        f"অর্থ একই রাখো:\n\n{text[:6000]}"
    )
    return {"status": "ok", "style": style, "rewritten": result}


# Text endpoint
class TextReq(BaseModel):
    text: str
    mode: Optional[str] = "summary"  # summary | rewrite | distribute

@app.post("/text/process")
def process_text(req: TextReq, x_api_key: str = Header(None)):
    verify_key(x_api_key)
    prompts = {
        "summary":    f"নিচের text টার বাংলায় সংক্ষিপ্ত summary দাও:\n\n{req.text}",
        "rewrite":    f"নিচের text টা সুন্দর করে বাংলায় rewrite করো:\n\n{req.text}",
        "distribute": (
            f"নিচের text থেকে তিনটা আলাদা version বানাও বাংলায়:\n"
            f"1. Social Media Post\n2. Email\n3. SMS\n\n{req.text}"
        ),
    }
    result = ask_ai(prompts.get(req.mode, prompts["summary"]))
    return {"status": "ok", "mode": req.mode, "result": result}


# WhatsApp endpoint
class WAReq(BaseModel):
    messages: list[str]
    chat_name: Optional[str] = "Chat"

@app.post("/whatsapp/summary")
def wa_summary(req: WAReq, x_api_key: str = Header(None)):
    verify_key(x_api_key)
    joined = "\n".join(f"- {m}" for m in req.messages)
    result = ask_ai(
        f"'{req.chat_name}' WhatsApp chat এর summary বাংলায় দাও। "
        f"কী আলোচনা হয়েছে এবং কোনো decision বা action item আছে কিনা বলো:\n\n{joined}"
    )
    return {"status": "ok", "chat": req.chat_name, "count": len(req.messages), "summary": result}
