# Beginner launch — what YOU do (in order)

The code is ready. You only need accounts and buttons. Do **one step**, then stop and check.

---

## Already done (you or the project)

- Supabase database: OK (you saw 6 columns)
- App code, Docker, deploy docs: ready in the project folder

---

## STEP A — Put the code on GitHub (required for Railway + Vercel)

Your project folder is prepared for git. You still need a GitHub repo to host it.

1. Open [github.com](https://github.com) → sign in.
2. Click the **+** (top right) → **New repository**.
3. Repository name: `stem-rag-platform`
4. Public is fine.
5. **Do not** check “Add a README” (leave empty).
6. Click **Create repository**.
7. GitHub will show commands. Copy the repo URL (looks like `https://github.com/YOURNAME/stem-rag-platform.git`).
8. Open **PowerShell** on your PC and run these **3 lines** (paste YOUR real URL):

```powershell
cd C:\Users\Martin-PC\Projects\stem-rag-platform
git remote add origin https://github.com/YOURNAME/stem-rag-platform.git
git push -u origin main
```

9. If GitHub asks you to sign in, finish that login, then run `git push -u origin main` again.
10. Refresh the GitHub page — you should see files (backend, frontend, etc.).

---

## STEP B — Railway (the brain / API)

1. Open [railway.app](https://railway.app) → **Login** (use GitHub login — easiest).
2. Click **New Project**.
3. Click **Deploy from GitHub repo**.
4. Choose your `stem-rag-platform` repo. Approve Railway if GitHub asks.
5. Wait until a service appears.
6. Click the service → **Variables** → **Add variable** (or Raw Editor).
7. Open on your PC:  
   `C:\Users\Martin-PC\Projects\stem-rag-platform\backend\.env`  
   Copy these **names and values** into Railway (same as your working local app):

- `QDRANT_URL`
- `QDRANT_API_KEY`
- `COLLECTION_NAME` → use `stem_vectors` if missing
- `DEEPSEEK_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `EMBEDDING_PROVIDER` → `openai`
- `OPENAI_API_KEY` → your OpenAI key
- `EMBEDDING_MODEL` → `text-embedding-3-large`
- `EMBEDDING_DIMENSIONS` → `1024`
- `HYBRID_SEARCH_ENABLED` → `true`
- `CORS_ORIGINS` → `https://conscrag.com,https://www.conscrag.com`
- `CORS_ORIGIN_REGEX` → `https://.*\.vercel\.app`
- `ADMIN_API_KEY` → invent a long password and save it in a note app

8. **Settings** → memory around **1 GB** is enough (hosted embeddings).
9. **Settings** → **Networking** → **Generate domain**.
10. Copy the URL (this project: `https://stem-rag-platform-production.up.railway.app`).
11. In the browser open: `https://stem-rag-platform-production.up.railway.app/api/health`  
    You want: `"qdrant":"ok"` and `"supabase":"ok"`.

**First deploy is usually a few minutes** with the slim Docker image. Wait for “Success”.

---

## STEP C — Vercel (the website)

**Already deployed:** https://stem-rag-platform.vercel.app  
(Homepage / `/create` load in ~1–5 seconds. The site alone is live.)

**Production API URL is set:** `NEXT_PUBLIC_API_URL=https://stem-rag-platform-production.up.railway.app` (CLI redeploy done).

What is still missing: **STEP D — CORS on Railway** so the browser can call the API.

1. Open [vercel.com](https://vercel.com) → project **stem-rag-platform**.
2. **Settings → Environment Variables** → add (Production + Preview):

- Name: `NEXT_PUBLIC_API_URL`
- Value: `https://stem-rag-platform-production.up.railway.app` (**no** trailing slash)

3. **Deployments → … → Redeploy** (required after changing `NEXT_PUBLIC_*`).
4. Open https://stem-rag-platform.vercel.app/create and ask a short fusion question.
5. If the spinner runs **10–60+ seconds**, that is normal LLM time — not the website cold-starting.

*(CLI alternative after you paste the Railway URL in chat: we can set the env and redeploy for you.)*

---

## STEP D — Fix CORS (so the website can talk to the API)

1. Go back to Railway → your **stem-rag-platform** service → **Variables**.
2. Set or update these (paste exactly — Railway CLI was not logged in on the deploy machine):

```text
CORS_ORIGINS=https://conscrag.com,https://www.conscrag.com,https://stem-rag-platform.vercel.app
CORS_ORIGIN_REGEX=https://.*\.vercel\.app
```

3. **Save** (Railway will redeploy).
4. Confirm CORS: in browser DevTools on `/create`, or run:

```powershell
curl.exe -sS -D - -o NUL -H "Origin: https://stem-rag-platform.vercel.app" "https://stem-rag-platform-production.up.railway.app/api/health"
```

You should see `access-control-allow-origin: https://stem-rag-platform.vercel.app`.

5. Refresh https://stem-rag-platform.vercel.app/create and try a short fusion question (first answer may take **10–60+ seconds**).

---

## STEP E — Optional: UptimeRobot (keep API warm / alert)

1. Open [uptimerobot.com](https://uptimerobot.com) → free account.
2. Add monitor → **HTTP(s)**.
3. URL: `https://stem-rag-platform-production.up.railway.app/api/health` (same URL that returns `"qdrant":"ok"`).
4. Interval: **every 5 minutes**.

This is **not** required for Hobby, but it warns you if Railway is down and can reduce idle surprises.

---

## Cold starts vs slow answers (read once)

| Piece | What to expect |
|-------|----------------|
| Vercel site load | Usually **1–5 seconds** — **not** 1–2 minutes |
| Railway Hobby | Stays warmer than the old free trial |
| First answer on `/create` | Often **10–60+ seconds** — LLM/agents, not “site cold start” |

If the homepage is fast but `/create` spins a long time, that is normal query latency.

---

## STEP F — Custom domain (conscrag.com)

**Already done on Vercel:** `conscrag.com` and `www.conscrag.com` are added to project **stem-rag-platform**.  
**Already done on Railway:** CORS allows `https://conscrag.com` and `https://www.conscrag.com`.

**You only need to update DNS** at your domain registrar (current nameservers: `dns1.registrar-servers.com` / `dns2.registrar-servers.com` — typical Namecheap).

### Option A — DNS records (recommended)

In your registrar’s **Advanced DNS** (or DNS zone), add or replace:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| **A** | `@` | `76.76.21.21` | Automatic / 300 |
| **A** | `www` | `76.76.21.21` | Automatic / 300 |

Remove conflicting old **A** or **CNAME** rows for `@` and `www` if they point elsewhere.

### Option B — Vercel nameservers (alternative)

Point the domain’s nameservers to:

- `ns1.vercel-dns.com`
- `ns2.vercel-dns.com`

Vercel then manages all DNS. Use this only if you want Vercel to host DNS for the whole domain.

### After DNS propagates (5–60 minutes, sometimes up to 24h)

1. Vercel → **stem-rag-platform** → **Domains** — both domains should show **Valid**.
2. Open https://conscrag.com and https://www.conscrag.com/create
3. Ask a short fusion question (10–60s for first answer is normal).

No Railway or Vercel env changes needed — API URL stays `https://stem-rag-platform-production.up.railway.app`.

---

## If something fails

Reply with:
- Which STEP letter (A/B/C/D/E)
- Exact error text or a screenshot description
- Your Railway public URL (e.g. `https://….up.railway.app`) — **no** API keys

Do not paste API keys or passwords.
