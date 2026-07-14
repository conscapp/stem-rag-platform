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
10. Copy the URL (looks like `https://xxxxx.up.railway.app`).
11. In the browser open: `https://xxxxx.up.railway.app/api/health`  
    You want: `"qdrant":"ok"` and `"supabase":"ok"`.

**First deploy is usually a few minutes** with the slim Docker image. Wait for “Success”.

---

## STEP C — Vercel (the website)

1. Open [vercel.com](https://vercel.com) → **Login** with GitHub.
2. **Add New Project** → import the same GitHub repo.
3. **Root Directory** → click Edit → type `frontend` → Continue.
4. **Environment Variables** → add one:

- Name: `NEXT_PUBLIC_API_URL`
- Value: your Railway URL from STEP B (**no** trailing slash), e.g. `https://xxxxx.up.railway.app`

5. Click **Deploy**. Wait until it finishes.
6. Click the `.vercel.app` link Vercel gives you.
7. Try **/create** and ask a question.

---

## STEP D — Fix CORS (so the website can talk to the API)

1. Go back to Railway → Variables.
2. Edit `CORS_ORIGINS` to include your Vercel URL, example:

`https://conscrag.com,https://www.conscrag.com,https://your-project.vercel.app`

3. Save (Railway will redeploy).
4. Refresh the Vercel site and try **/create** again.

---

## STEP E — Custom domain later (optional)

Only after STEP C works. Point `conscrag.com` to Vercel in your domain registrar using the DNS records Vercel shows under **Domains**.

---

## If something fails

Reply with:
- Which STEP letter (A/B/C/D)
- Exact error text or a screenshot description

Do not paste API keys or passwords.
