# Go-live checklist (conscrag.com)

## Done in repo (automated / code)

- [x] Backend Dockerfile + railway.toml (slim image, hosted embeddings, BM25 on boot)
- [x] Rate limits on posts/novelty; `publish_consent` required server-side
- [x] LAUNCH.md / README / DEPLOY.md updated for polymath agents
- [x] `deploy/production.env.template` for Railway + Vercel vars
- [x] `scripts/verify_launch_ready.py` passes
- [x] `scripts/smoke_prod.py` for API smoke after deploy
- [x] `supabase/VERIFY_MIGRATIONS.md` for SQL confirmation

## You must do in dashboards (cannot automate without login)

1. [ ] `vercel login` then deploy frontend (`frontend` root) with `NEXT_PUBLIC_API_URL`
2. [ ] Install Railway CLI or use dashboard: deploy from GitHub with root `Dockerfile`, small RAM, paste vars from `deploy/production.env.template`
3. [ ] Run Supabase migrations on **prod** (see `supabase/VERIFY_MIGRATIONS.md`)
4. [ ] Point `conscrag.com` / `www` DNS to Vercel; optional `api.conscrag.com` → Railway
5. [ ] Set `CORS_ORIGINS` to live frontend URLs; redeploy API
6. [ ] `python scripts/smoke_prod.py --base-url https://YOUR-API`
7. [ ] Rotate any keys previously shared in chat

## Smoke after DNS

- [ ] https://conscrag.com/create — lay fusion query works
- [ ] Consent gates submission
- [ ] `/api/health` ok via public API URL
