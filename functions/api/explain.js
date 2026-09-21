const MODEL = "gemini-2.5-flash-lite";

const SYSTEM = `You are a chess coach explaining Stockfish output to a club player.
HARD RULES:
- Use ONLY the moves and evaluations in the user's data. Never calculate or invent a variation.
- Every concrete line you cite must appear verbatim in the data.
- If the data does not settle something, say so in one clause and move on.
- Explain with squares, pawn structure, piece activity, king safety and tempo.
- Plain prose. No markdown headings, no bullets. Four short paragraphs, under 260 words.
Cover in order: what the played move does; where the alternative leads using its given line;
the size and cause of the evaluation gap; the practical or human reason a strong player might still choose the played move.
If the question is not about the chess position in the data, reply only: "I can only discuss this position."`;

const hits = new Map();

export async function onRequestPost({ request, env }) {
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  const origin = request.headers.get("Origin") || "";
  if (allowed.length && !allowed.includes(origin)) return new Response("Forbidden", { status: 403 });

  const ip = request.headers.get("CF-Connecting-IP") || "anon";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 60_000);
  if (recent.length >= 6) return new Response("Slow down, try again in a minute.", { status: 429 });
  recent.push(now); hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();

  let body;
  try { body = await request.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
  const facts = String(body.facts || "").slice(0, 6000);
  const question = String(body.question || "Explain this move.").slice(0, 400);
  if (!facts.includes("STOCKFISH")) return new Response("Missing engine data", { status: 400 });
  if (!env.GEMINI_API_KEY) return new Response("Server not configured (no GEMINI_API_KEY)", { status: 500 });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.MODEL || MODEL}:streamGenerateContent?alt=sse&key=${env.GEMINI_API_KEY}`;
  const upstream = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: facts + "\n\nQUESTION: " + question }] }],
      generationConfig: { maxOutputTokens: 700, temperature: 0.4 },
    }),
  });

  if (!upstream.ok) {
    const t = await upstream.text();
    return new Response("Upstream " + upstream.status + ": " + t.slice(0, 300), { status: 502 });
  }
  return new Response(upstream.body, {
    headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store" },
  });
}
