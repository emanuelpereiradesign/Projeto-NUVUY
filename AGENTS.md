# Nuvuy Agent Guide

## Essentials
- **Language**: Portuguese (pt-BR) for UI, names, and this file.
- **Hybrid mode**: 
  - **Connected**: Frontend talks to Node.js/Express backend on port 3000 (`Back-end/`), which talks to Supabase and OpenRouter LLM.
  - **Simulation**: If backend is offline, frontend runs fully static, persisting leads in `localStorage` (`nuvuy_simulated_leads`).

## Quick Start
- **Frontend only**: open `Front-end/dashboard.html` in a browser (`start Front-end/dashboard.html` on Windows).
- **Backend (optional)**:
  ```bash
  cd Back-end
  npm install
  npm run dev   # starts server on :3000
  ```
- Requires a `.env` file in `Back-end/` with Supabase and OpenRouter keys.

## Vercel Deployment
- `vercel.json` in repo root defines friendly routes:
  - `/` → `/login`
  - `/dashboard` → `Front-end/dashboard.html`
  - `/login` → `Front-end/login.html`
  - `/configuracoes` → `Front-end/configuracoes.html`
  - `/planos` → `Front-end/planos.html`
  - `/leads-inteligentes` → `Front-end/leads-inteligentes.html`
- Set **Root Directory** to repository root (`.`). Deploy with `git push` to `main`.

## Project Layout
```
PROJETO-NUVUY/
├─ Front-end/
│   ├─ dashboard.html          # Kanban dashboard
│   ├ leads-inteligentes.html  # metrics, leads list, IA approach script
│   ├ login.html               # login/cadastro (glassmorphism, no sidebar)
│   ├ configuracoes.html       # profile, password, agent presets
│   ├ planos.html              # subscription & credit top‑up
│   ├ css/style.css            # global styling (grid, variables, dark/glass)
│   ├ js/script.js             # shared vanilla JS (session, checks, toast)
│   ├ js/supabase.js           # Supabase client init
│   └─ assets/                 # logos, backgrounds
├─ Back-end/
│   ├ server.js                # Express API + Supabase
│   ├ ai.js                    # SDR intelligence (OpenRouter LLM + fallback)
│   ├ scraper.js               # OSM Nominatim scraper (Google Maps & Instagram data)
│   ├ .env                     # API keys & DB URL
│   └─ package.json            # npm scripts & deps
├─ Tabelas/
│   └─ *.sql                   # DDL for 8 tables + trigger
└─ ESTRUTURA B.md              # full ER diagram & relationships
```

## Key Conventions
- **CDNs only** (no npm in frontend):
  - Google Fonts (Inter, Poppins) via `<link>` on all pages.
  - Chart.js via CDN only in `leads-inteligentes.html`.
  - Supabase JS client via CDN on all pages.
- **JS**: Vanilla JS (`DOMContentLoaded`, `querySelector`, `addEventListener`), consistent error fallbacks.
- **CSS**: CSS Grid (`stats-grid`, `leads-grid`), CSS variables in `:root`, dark theme, glassmorphism.
- **Leads UI**: 
  - `quente` = `#00A6FF` (blue)
  - `morno` = `#D900FF` (purple)
  - `frio` = `#8E8E93` (gray)
- **Toast**: `showToast(message, type)` auto‑dismisses after 4 s.
- **Password minimum**: 6 characters (checked in settings UI).

## Architecture & Data Flow
- **Server detection**: Frontend calls `fetch('/api/status')` on load; if reachable uses backend API, else falls back to `localStorage` + direct Supabase client.
- **Session handling**: `checkSession()` looks for `nuvuy_access_token` in `localStorage` (backend mode) or Supabase session (fallback). Redirects to `login.html` if not logged in, otherwise to `dashboard.html`.
- **Logout**: 
  1. Click “Sair” → confirm modal.
  2. Calls `signOut()` on Supabase (if configured).
  3. Removes `nuvuy_user_name`, `nuvuy_access_token`, `nuvuy_refresh_token` from `localStorage`.
  4. Redirects to `login.html`.
  *Important*: If those tokens are not cleared, `checkSession()` will redirect back to dashboard, blocking logout.
- **Web scraper** (`scraper.js`): hits OSM Nominatim API for real Google Maps‑like results; if fewer results than requested, pads with realistic local data.
- **Cross‑page bridge**: `window.addLeadsToIntelligentPanel()` updates the intelligent leads panel and Chart.js graphs after a capture finishes in the dashboard.
- **Justificativa/Abordagem**: Stored as JSON string in `score.justificativa_ia`; frontend parses and renders justification, approach script, Maps comments, Instagram tags separately.
- **Dynamic URLs**: `getPageUrl()` in `script.js` returns `dashboard.html` for `file:` protocol (local) and `/dashboard` for HTTP(S) (Vercel). Sidebar `<a>` tags are rewritten on `DOMContentLoaded` when running on Vercel.

## Database (Supabase / PostgreSQL)
- See `ESTRUTURA B.md` and `Tabelas/*.sql` for full schema (8 tables + trigger).
- Key tables:
  - `usuario` – extends `auth.users` with `id_plano`, `saldo_tokens`, `leads_utilizados`.
  - `plano` – subscription tiers (Free, Basic, Pro).
  - `tarefas` – user‑initiated searches.
  - `fonte` – capture sources (Google Maps, Instagram).
  - `tarefa_fonte` – N‑M link between tasks and sources.
  - `lead` – captured leads.
  - `metrica_google_maps` / `metrica_instagram` – platform‑specific metrics.
  - `score` – lead score (0‑100) & classification; includes `check_classificacao_faixa` constraint.
- **Trigger**: `on_auth_user_created` creates a `public.usuario` row with free plan on Supabase Auth sign‑up.
- **RLS**: All tables have row‑level security policies restricting rows to `auth.uid()`.

## Lead Scoring & Temperature (DB‑enforced)
- Score 0‑100 reflects likelihood of closing.
  - **Cold (0‑40 %)**: Strong digital presence, high Maps rating, Instagram >15k followers & ~150 posts → low close chance.
  - **Warm (41‑70 %)**: Moderate presence, Instagram 3k‑7k followers, slowly growing Maps rating.
  - **Hot (71‑100 %)**: No website, no visual identity, Instagram <2k followers → highest priority for full‑service pitches.
- Constraint `check_classificacao_faixa` guarantees the classification matches the score.

## Testing / Linting / Building
- No build step for frontend (plain HTML/CSS/JS).
- Backend: 
  - Lint: `npm run lint` (if configured in `package.json`).
  - Test: `npm test` (if defined).
  - Dev server: `npm run dev` (already listed above).

## Tips for Agents
- When starting work, first check if backend is reachable (`fetch('/api/status')`).
- For local debugging without backend, rely on `localStorage` key `nuvuy_simulated_leads`.
- Remember to clear the three `nuvuy_*` tokens in `localStorage` on logout to avoid silent redirects.
- All frontend styling lives in `css/style.js`; avoid inline styles.
- Any new page must import `js/supabase.js` and `js/script.js` for session handling.
- When adding a new backend route, update `server.js` and remember to protect it with Supabase auth (check `req.user`).