# Chess Lab — deploy notes

index.html                 the app
engine/                    Stockfish 18 lite (GPLv3) — keep the licence file next to it
functions/api/explain.js   AI endpoint (Cloudflare Pages Function)
_headers                   caching for the 7 MB engine
blogger-embed.html         snippet for the Blogger page

Environment variables (Pages → Settings → Variables and Secrets):
  ANTHROPIC_API_KEY   (secret, required)
  ALLOWED_ORIGINS     https://chess.thescientificdrop.com
  MODEL               optional, defaults to claude-haiku-4-5-20251001
