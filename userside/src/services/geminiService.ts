export type ChatTurn = { role: 'user'|'model', content: string };

function classifyIntent(q: string): 'career'|'relationship'|'health'|'investments'|'auspicious' {
  const s = q.toLowerCase();

  if (/(career|job|promotion|work|profession|10th\s*house|recognition)/.test(s)) return 'career';
  if (/(relationship|marriage|partner|love|7th\s*house|compatib)/.test(s)) return 'relationship';
  if (/(health|wellness|diet|stress|illness|1st\s*house|6th\s*house|8th\s*house)/.test(s)) return 'health';
  if (/(invest|finance|money|wealth|stocks|trading|2nd\s*house|11th\s*house)/.test(s)) return 'investments';
  if (/(auspicious|lucky\s*(color|time)|good\s*time|muhurta|today)/.test(s)) return 'auspicious';

  // reasonable defaults: map “color/time today” to auspicious; “money” to investments, etc.
  if (/(color|time).*today/.test(s)) return 'auspicious';
  if (/(money|income|gain|loss)/.test(s)) return 'investments';
  return 'career'; // safe default
}

export async function askGeminiAstrology(opts: {
  question: string;
  kundliSummary: string;
  panchangSummary?: string;
  conversationHistory?: ChatTurn[];
}) {
  const intent = classifyIntent(opts.question);
  const res = await fetch(`${import.meta.env.VITE_API_BASE || ''}/api/gemini/astrology`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...opts, intent }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error('Gemini proxy HTTP error', res.status, t);
    throw new Error(`Gemini API failed (${res.status})`);
  }
  const data = await res.json();
  if (data.error) {
    console.error('Gemini proxy payload error', data);
    throw new Error(data.error);
  }
  return data.text as string;
}
