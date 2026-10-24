# Deployment & Disaster Recovery Architecture

This document details the production deployment architecture, CI/CD pipeline, and Disaster Recovery (DR) runbooks for **Koodal Dating App**.

---

## 1. Cloudflare Pages Architecture

Koodal Dating App is deployed globally via **Cloudflare Pages** at edge locations with high availability, instant TLS/SSL termination, and DDoS protection.

### Configuration (`wrangler.toml`)
```toml
name = "koodal-dating-app"
pages_build_output_dir = "dist"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
NODE_VERSION = "22"
```

### Build & Routing Settings
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Build Output Directory**: `dist`
- **Node.js Version**: `22`
- **SPA Routing**: `public/_redirects` rewrites `/* /index.html 200` to support client-side deep links on refresh without 404 errors.
- **Security Headers**: `public/_headers` injects strict OWASP security headers:
  - `X-Frame-Options: DENY` (Anti-clickjacking)
  - `X-Content-Type-Options: nosniff` (Anti-MIME sniffing)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy`: Restricts scripts, styles, fonts, images, and API connects to self and Supabase endpoints.

---

## 2. GitHub Actions Deployment Pipeline & Manual Approval Gate

All production releases are automated through `.github/workflows/deploy-cloudflare.yml`.

### Deployment Flow
1. **Push or PR to `main`**:
   - Triggers `verify-and-test` job.
   - Runs `npm ci`, full Vitest test suite (`npm test`), and type-checking production build (`npm run build`).
2. **Manual Approval Gate**:
   - The `deploy-production` job targets the GitHub Environment `production`.
   - GitHub Environment Protection Rules enforce a **required manual reviewer approval** before deployment secrets are decrypted or assets pushed.
3. **Edge Deployment**:
   - Compiles Vite distribution with production Supabase credentials.
   - Deploys immutable assets via `cloudflare/wrangler-action@v3`.
   - Deployment URL: `https://koodal.pages.dev` (or configured custom domain).

---

## 3. Database Backup & Disaster Recovery (DR)

### Recovery Objectives
- **RPO (Recovery Point Objective)**: < 24 hours via daily automated snapshots; real-time write-ahead logs in Supabase.
- **RTO (Recovery Time Objective)**: < 15 minutes to verify integrity and restore schema and data.

### Automation Scripts: `scripts/backup-restore.sh` & `scripts/backup-restore.ps1`

Both POSIX bash and Windows PowerShell implementations are provided with identical feature sets and cryptographic verification.

#### Commands:
```bash
# 1. Create a timestamped backup (schema + data + storage manifest + sha256 checksums)
./scripts/backup-restore.sh backup [optional_dest_dir]
# Or in PowerShell:
.\scripts\backup-restore.ps1 -Action Backup

# 2. Verify cryptographic SHA-256 integrity of an existing backup
./scripts/backup-restore.sh verify backups/backup_YYYYMMDD_HHMMSSZ
# Or in PowerShell:
.\scripts\backup-restore.ps1 -Action Verify -TargetDir "backups/backup_YYYYMMDD_HHMMSSZ"

# 3. Restore database from backup (requires typing CONFIRM unless --force is passed)
./scripts/backup-restore.sh restore backups/backup_YYYYMMDD_HHMMSSZ [--force]
# Or in PowerShell:
.\scripts\backup-restore.ps1 -Action Restore -TargetDir "backups/backup_YYYYMMDD_HHMMSSZ" [-Force]
```

### Backup Artifact Structure
Each backup creates a self-contained directory:
```
backups/backup_YYYYMMDD_HHMMSSZ/
├── schema.sql              # DDL, tables, functions, triggers, RLS policies
├── data.sql                # Table data (inserts)
├── storage_manifest.sql    # Metadata snapshot of storage.objects
├── metadata.json           # Timestamp, Git commit SHA, and project metadata
└── checksums.sha256        # SHA-256 hashes of all artifacts
```

### Disaster Recovery Runbook
1. **Detect & Triage**: Identify data corruption or regional database failure.
2. **Freeze Ingress**: If necessary, set maintenance mode header or toggle Cloudflare page rules.
3. **Select Backup**: Choose the latest verified backup from cold storage.
4. **Integrity Pre-check**: Run `./scripts/backup-restore.sh verify <backup_dir>` to validate SHA-256 signatures.
5. **Execute Restore**: Execute `./scripts/backup-restore.sh restore <backup_dir>` against target instance.
6. **Post-Restore Validation**:
   - Verify table counts (`profiles`, `waitlist_users`, `admissions_config`).
   - Run pgTAP test suite (`supabase test db`).
7. **Unfreeze Ingress**: Resume live production traffic.
