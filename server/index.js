// server/index.js
import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import OpenAI from "openai";
import { toFile } from "openai/uploads";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use(express.static(path.join(__dirname, "..", "client")));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ---------- Speech-to-Text (Student) ----------
app.post("/api/stt_student", async (req, res) => {
  try {
    const { audioBase64, mime } = req.body || {};
    if (!audioBase64) return res.status(400).json({ error: "no audioBase64" });

    const buf = Buffer.from(audioBase64, "base64");
    const isWav = mime === "audio/wav";
    const file = await toFile(buf, isWav ? "chunk.wav" : "chunk.webm", {
      type: isWav ? "audio/wav" : "audio/webm",
    });

    let text = "";
    // try {
    //   const r = await openai.audio.transcriptions.create({
    //     file,
    //     model: "gpt-4o-mini-transcribe", // быстрый STT
    //     language: "en",
    //   });
    //   text = (r?.text || "").trim();
    // } catch {
      const r2 = await openai.audio.transcriptions.create({
        file,
        model: "whisper-1",
        language: "en",
      });
      text = (r2?.text || "").trim();
    // }

    return res.json({ text });
  } catch (err) {
    console.error("STT error:", err?.response?.data || err.message);
    return res.status(err?.status || 500).send(err?.message || "STT error");
  }
});

// ---------- Hints (3 columns) ----------
app.post("/api/hints", async (req, res) => {
  try {
    const { teacher = "", student = "" } = req.body || {};
    const input = (teacher + " " + student).trim();
    if (!input) return res.json({ card: null });

    const prompt = `
You are a concise English-teaching assistant. From the input text, produce a JSON with:
{
  "errors": [{"title": "...", "wrong": "...", "fix": "...", "explanation": "..."}],
  "definitions": [{"word": "...", "pos": "noun|verb|adj", "simple_def": "...", "example": "Use the word in a simple sentence."}],
  "synonyms": [{"word": "...", "pos": "noun|verb|adj", "list": ["...","..."]}]
}
Rules for definitions:
- Keep the example very short and in simple English.
- Ensure the example is a natural sentence using the word correctly.
- Do not include quotes around the example.
Keep it short overall. Choose a few relevant nouns/verbs/adjectives.
Input: """${input}"""`;

    const chat = await openai.chat.completions.create({
      model: "gpt-4.1-nano", // быстрые подсказки
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    let payload = {};
    try { payload = JSON.parse(chat.choices?.[0]?.message?.content || "{}"); } catch {}
    const card = {
      errors: Array.isArray(payload.errors) ? payload.errors : [],
      definitions: Array.isArray(payload.definitions) ? payload.definitions : [],
      synonyms: Array.isArray(payload.synonyms) ? payload.synonyms : [],
    };
    return res.json({ card });
  } catch (err) {
    console.error("hints error:", err?.response?.data || err.message);
    return res.status(500).json({ card: null });
  }
});

// ---------- SPA ----------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "client", "teacher.html"));
});

const HOST = process.env.HOST || "0.0.0.0";
const PORT = process.env.PORT || 10000;

function getLanIPv4() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) results.push(net.address);
    }
  }
  return results;
}

app.listen(PORT, HOST, () => {
  const localUrl = `http://localhost:${PORT}/teacher.html`;
  const lanIps = getLanIPv4();
  const lanUrls = lanIps.map(ip => `http://${ip}:${PORT}/teacher.html`);
  console.log(`Teacher-only AI Tutor running:`);
  console.log(`- Local: ${localUrl}`);
  if (lanUrls.length) {
    console.log(`- LAN:   ${lanUrls.join(", ")}`);
  }
});
