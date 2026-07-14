# Supabase production verification

Run these in the Supabase SQL Editor after applying migrations.

## 1. Confirm consent + domain columns

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'public_posts'
  and column_name in (
    'domain',
    'terms_accepted_at',
    'terms_version',
    'publish_consent',
    'novelty_score',
    'status'
  )
order by column_name;
```

Expect all six rows.

## 2. Apply order (if any missing)

1. `schema.sql`
2. `migration_domain.sql`
3. `migration_legal_consent.sql`

## 3. DNS (conscrag.com)

| Host | Type | Target |
|------|------|--------|
| `@` / `conscrag.com` | per Vercel | Vercel A/CNAME |
| `www` | CNAME | Vercel |
| `api` (optional) | CNAME | Railway |

Then set `NEXT_PUBLIC_API_URL` and `CORS_ORIGINS` as in [DEPLOY.md](../DEPLOY.md).
