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

// ---------- Hints (student word translations) ----------
app.post("/api/hints", async (req, res) => {
  try {
    const { student = "" } = req.body || {};
    const studentText = (student || "").trim();
    if (!studentText) return res.json({ card: null });

    const prompt = `
You are a concise English-to-Russian teaching assistant.
Use only the student's transcript below.
Find distinct words that actually appear in the student's speech which are nouns, adjectives, pronouns, adverbs, or prepositions.
Return JSON strictly in this shape:
{
  "translations": [
    {"word": "...", "pos": "noun|adjective|pronoun|adverb|preposition", "translation_ru": "..."}
  ]
}
Rules:
- Provide at most 8 items.
- Use the lowercase base form of the English word.
- Give a short (1-3 word) Russian translation.
- Do not include verbs or any other parts of speech.
- Avoid duplicates.
- If no qualifying words are found, return an empty array.
Student transcript: """${studentText}"""`;

    const chat = await openai.chat.completions.create({
      model: "gpt-4.1-nano", // быстрые подсказки
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    let payload = {};
    try { payload = JSON.parse(chat.choices?.[0]?.message?.content || "{}"); } catch {}
    const card = {
      translations: Array.isArray(payload.translations) ? payload.translations : [],
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
