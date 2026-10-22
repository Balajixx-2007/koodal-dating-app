# Phase 1: Backend Foundation Checkpoint Report

## 1. Migrations Overview (`supabase/migrations/`)

| Migration File | Description | Security & Integrity Controls |
| :--- | :--- | :--- |
| `20261022000001_extensions_and_enums.sql` | `uuid-ossp`, `pgcrypto`, and 5 core enums | Validated types for intent, status, reports, verification |
| `20261022000002_admins_and_auth_trigger.sql` | `admins` table, `audit_log`, `is_admin()` function | Security Definer helper, search_path isolation, immutable audit logs |
| `20261022000003_core_tables_and_signup_trigger.sql` | `users`, `profiles`, `likes`, `matches`, `messages`, `verifications`, `blocks_and_reports`, `waitlist_entries`, `batches` | 18+ DB constraint check, auth signup trigger, mutual match trigger |
| `20261022000004_storage_buckets.sql` | Private `photos` and `selfies` buckets | 5MB size limit, JPEG/PNG/WebP only, folder-level user isolation |
| `20261022000005_rls_policies.sql` | Explicit RLS policies on all 11 tables | Default Deny on all tables, participant & admin isolation |
| `supabase/seed.sql` | Local development seed data | Chennai & Bangalore seed entries, past batch audit records |

---

## 2. Table-by-Table Row-Level Security (RLS) Policy Audit

| Table | RLS Enabled | Policies Defined | Default Deny Enforced |
| :--- | :---: | :--- | :---: |
| `public.admins` | **YES** | `Admins can view admin table` (via `is_admin()`). Direct client writes revoked. | **YES** |
| `public.audit_log` | **YES** | Admins view & insert only. `UPDATE` and `DELETE` revoked (immutable). | **YES** |
| `public.users` | **YES** | `Users can read own user record` or admins; users can update own non-sensitive fields. | **YES** |
| `public.profiles` | **YES** | `Members view active unpaused profiles` (mutual blocks excluded); owner CRUD. | **YES** |
| `public.preferences` | **YES** | Owner CRUD only (`auth.uid() = user_id`). | **YES** |
| `public.likes` | **YES** | Sender view, insert, delete only (`auth.uid() = from_user`). | **YES** |
| `public.matches` | **YES** | Only matched participants (`user_a`, `user_b`) and admins can select. | **YES** |
| `public.messages` | **YES** | Participants only can select/insert; sender must match `auth.uid()`. | **YES** |
| `public.blocks_and_reports` | **YES** | Reporter can view; only admins can review/update status. | **YES** |
| `public.verifications` | **YES** | Owner and admins only. Only admins can approve/reject. | **YES** |
| `public.waitlist_entries` | **YES** | Public can join (`status = 'waiting'`); only admins can update status/score. | **YES** |
| `public.batches` | **YES** | Public audit read; only admins can insert new admission batches. | **YES** |

---

## 3. Storage Security Audit

* **`selfies` Bucket**: `public = false`. Only the uploading user (`auth.uid()`) and verified admins can view selfies.
* **`photos` Bucket**: `public = false`. Uploads restricted to `photos/{user_id}/*`. Max file size 5MB.
* **MIME Types**: Strict allowlist: `image/jpeg`, `image/png`, `image/webp`.

---

## 4. Auth, SMTP & Redirect URL Configuration

### Recommended Free-Tier SMTP (to avoid Supabase built-in rate limits):
* **Provider**: Resend (free tier: 100 emails/day, 3,000/month) or Brevo (300 emails/day).
* In Supabase Dashboard: **Project Settings > Authentication > SMTP Settings**:
  * Enable Custom SMTP: `smtp.resend.com` (Port 465 or 587)
  * Sender email: `auth@yourdomain.com`

### Redirect URLs to configure in Supabase:
* Local: `http://localhost:5173/**`, `http://localhost:8080/**`
* Preview: `https://*-koodal.pages.dev/**`, `https://*-koodal.vercel.app/**`
* Production: `https://koodal.pages.dev/**`
