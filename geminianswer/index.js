require('dotenv/config');
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json());

// ---- ENV ----
const GEMINI_API_KEY = process.env.GOOGLE_GENAI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('Missing GOOGLE_GENAI_API_KEY in .env');
  process.exit(1);
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// ---- Helper to clamp history ----
function trimHistory(messages = [], maxTokensish = 3000) {
  const MAX = 12;
  return messages.slice(-MAX);
}

// ---- Route: astrology chat ----
// server/index.js  (keep imports/app setup as-is; replace only the handler body)

app.post('/api/gemini/astrology', async (req, res) => {
  try {
    const {
      question,
      kundliSummary,        // REQUIRED: compact context
      panchangSummary,      // optional
      conversationHistory,  // optional
      intent                // 'career'|'relationship'|'health'|'investments'|'auspicious' (optional)
    } = req.body || {};

    if (!question || !kundliSummary) {
      return res.status(400).json({ error: 'question and kundliSummary are required' });
    }

    const history = Array.isArray(conversationHistory) ? conversationHistory.slice(-12) : [];

    const allowed = new Set(['career','relationship','health','investments','auspicious']);
    const resolvedIntent = allowed.has(intent) ? intent : 'career'; // safe default

    const systemPreamble = `
You are a Vedic astrology assistant.

Hard rules:
- Always produce a best-effort, personalized answer using ONLY the provided kundli/panchang context.
- Never ask for more data, never say "not enough data" or similar. When info is missing, infer from what's present (Moon/Sun sign, nakshatra qualities, yogas, dasha, general sign lords, natural significators).
- Keep 4–6 concise bullets (120–180 words total). Plain text. No tables, no disclaimers.
- Each bullet MUST end with "Because: <chart anchor>" referencing something in the context (e.g., Moon sign, nakshatra, dasha name, Venus/Jupiter mentions in summary, yoga names, dosha flags).
- Use probabilistic language (tilts/likelihoods) not hard certainties.
`.trim();

    const intentInstruction = {
      career: `Intent: career — focus on 10th house themes but if absent, infer from Sun, Saturn, Mercury, Jupiter, dasha, nakshatra qualities.`,
      relationship: `Intent: relationship — focus on 7th house/Venus/Jupiter, but if absent, infer from Venus/Moon condition, nakshatra, yogas, dasha.`,
      health: `Intent: health — focus on 1st/6th/8th, but if absent, infer from Saturn/Mars/Moon tone, nakshatra health qualities, yogas, dasha.`,
      investments: `Intent: investments — focus on 2nd/11th/5th/9th, but if absent, infer from Jupiter/Saturn/Mercury tone, nakshatra luck/speculation qualities, yogas, dasha; give timing posture.`,
      auspicious: `Intent: auspicious — give today's helpful color/time windows based on Panchang or Moon sign/nakshatra color lore.`
    }[resolvedIntent];

    const userContextBlock = `
[KUNDLI SUMMARY]
${kundliSummary}

${panchangSummary ? `[PANCHANG]\n${panchangSummary}\n` : ''}

[QUESTION]
${question}
`.trim();

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: systemPreamble }] },
        { role: 'user', parts: [{ text: intentInstruction }] },
        ...history.map(m => ({ role: m.role, parts: [{ text: m.content }]})),
        { role: 'user', parts: [{ text: userContextBlock }] },
      ],
      generationConfig: {
        temperature: 0.55,
        topP: 0.9,
        maxOutputTokens: 512
      }
    });

    const text = result.response.text();
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Gemini intent]', resolvedIntent);
      console.log('[Gemini ctx <=]', userContextBlock.slice(0, 600));
      console.log('[Gemini out =>]', (text || '').slice(0, 300));
    }
    return res.json({ text });
  } catch (err) {
    console.error('[Gemini backend error]', err);
    return res.status(500).json({ error: 'Gemini request failed', details: err?.message });
  }
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Gemini proxy running on http://localhost:${PORT}`));
