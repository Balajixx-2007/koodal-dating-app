# Operations, Launch Readiness & Runbook Guide

This document tracks operational requirements, incident management, moderation SOPs, database playbooks, and pre-/post-launch procedures for **Koodal Dating App**.

---

## 1. Authentication Rate Limits & Provider Configuration

> [!IMPORTANT]
> **Environment Clarification**: All rate limits specified in `supabase/config.toml` (e.g., 30 requests per 5 minutes for signups/logins, 150 for token refresh) apply strictly to **local development and CI test runners**. They do not reflect the settings on the hosted Supabase Cloud project.

### Action Items & Pre-Flight Settings:
- [ ] **Read real Auth rate limits from the hosted project dashboard before launch**:
  - Access the hosted Supabase project at `https://supabase.com/dashboard/project/<project-ref>/auth/rate-limits`.
  - Review and document the production token bucket thresholds for `/auth/v1/signup`, `/auth/v1/token`, `/auth/v1/otp`, and password resets.
  - Enable IP Address Forwarding headers (`X-Forwarded-For`) behind Cloudflare edge proxy.
- [ ] **Configure Custom SMTP Provider before opening signups**:
  - The built-in Supabase email service is restricted to low-volume testing (3 emails/hour on free tiers) and blocks delivery to addresses outside the Supabase organization.
  - Set up a production SMTP provider (SendGrid, AWS SES, Resend, or Postmark) under `Authentication > Providers > Email (SMTP)` before admitting members.
- [ ] **Account Security**:
  - Enable two-factor authentication (2FA / MFA) on all administrator accounts for both GitHub and Supabase.

---

## 2. CI/CD Database Verification

- Automated testing runs on every pull request and push via `.github/workflows/supabase-test.yml`.
- Runs `supabase start` in containerized Ubuntu environment.
- Executes the full 14-check pgTAP security test suite (`supabase test db`).
- Runs Vitest parity suite testing the Section 13 admission formula.

---

## 3. Production Deployment & Cloudflare Pages

- Production application is hosted on **Cloudflare Pages** (`wrangler.toml`, `public/_headers`, `public/_redirects`).
- Continuous Deployment runs via `.github/workflows/deploy-cloudflare.yml`.
- **Manual Approval Gate**: The production deployment workflow requires manual approval in GitHub Environments (`production`) before releasing to live users.
- For complete setup instructions, environment variable declarations, and custom domain configuration, see [DEPLOYMENT.md](file:///d:/PROJECTS/Yours/dating-app/docs/DEPLOYMENT.md).

---

## 4. Backup & Disaster Recovery (DR)

- **Automated Tooling**: Automated backup, cryptographic verification, and disaster recovery scripts are provided at `scripts/backup-restore.sh` (POSIX) and `scripts/backup-restore.ps1` (PowerShell).
- **Integrity**: Every backup generates SHA-256 checksums (`checksums.sha256`) and verifies data integrity prior to any restoration attempt.
- **RPO / RTO**: Target Recovery Point Objective is < 24h; Recovery Time Objective is < 15 minutes.

---

## 5. Incident Response & Escalation Matrix

### Severity Tiers & SLAs

| Severity Tier | Definition | Response SLA | Target Resolution SLA | Escalation Path |
| :--- | :--- | :--- | :--- | :--- |
| **Sev-1 (Critical)** | Complete service outage, authentication system unavailable, data corruption threat, security/data breach, or critical vulnerability exposure. | **< 15 minutes** | < 2 hours | Page Incident Commander, Lead Engineer & CTO immediately. Convene incident war room. |
| **Sev-2 (High)** | Major functional degradation affecting significant user cohorts (e.g., chat real-time messaging down, photo uploads failing, waitlist score calculation stalled). | **< 1 hour** | < 6 hours | Notify Tech Lead; assign on-call engineer for hotfix or rollback. |
| **Sev-3 (Medium/Low)** | Minor bug, non-blocking UI anomaly, localized localization typo, or non-critical admin dashboard latency. | **< 24 hours** | Next sprint / scheduled deployment | Log in issue tracker; triage during standard operational review. |

### Incident Lifecycle & Protocol
1. **Detection & Triage**: Identify incident source (Supabase monitoring alert, Cloudflare 5xx spike, user report). Assign Incident Commander (IC).
2. **Containment**: If active exploit or severe corruption occurs, freeze ingress using Cloudflare maintenance rules or deploy emergency bypass.
3. **Remediation**:
   - Application bugs: Push hotfix branch through CI with manual approval gate.
   - Database corruption: Execute verified recovery via `./scripts/backup-restore.sh restore <verified_backup>`.
4. **Post-Mortem**: Document root cause, timeline of events, time to detect/resolve, and mandatory prevention tasks within 48 hours.

---

## 6. User Moderation SOPs (Standard Operating Procedures)

### 6.1 Selfie Verification SOP
All member profiles undergo selfie verification to prevent catfishing and bot accounts:
1. **Access Queue**: Navigate to `/admin/selfies` (restricted to authenticated admin roles).
2. **Verification Checklist**:
   - Compare the verification selfie against the user's primary profile photo gallery.
   - Confirm matching facial features, bone structure, and estimated age.
   - Confirm requested hand gesture or pose is authentic and unmanipulated.
   - Reject any images showing signs of AI generation, deepfakes, or screen photography.
3. **Actioning**:
   - **Approve**: Sets `is_verified = true` in `profiles` table. User receives verified badge.
   - **Reject**: Deletes selfie from `verification-selfies` storage; triggers notification to user requesting re-submission.

### 6.2 Content & Photo Moderation SOP
- **Zero Tolerance Content**: Explicit adult nudity, sexual solicitation, hate speech, violence, weapons, minors, or commercial advertisement.
- **Immediate Action**: Remove offending image from `profile-photos` storage immediately; flag account for review.

### 6.3 Harassment Reporting, Suspension & Ban SOP
- **Report Ingestion**: Harassment reports flagged by users in chat or discover view are routed to the admin moderation queue.
- **Triage Window**: Harassment involving stalking, threats of violence, or blackmail must be triaged within **2 hours**.
- **Disciplinary Actions**:
  - *First Offense (Minor)*: Issue formal warning; 48-hour temporary messaging freeze.
  - *Severe / Repeat Offense*: Immediate permanent ban.
  - *Account Termination*: Execute `delete_user_account(p_user_id)` procedure. This purges storage files from `profile-photos` and `verification-selfies`, deletes likes, matches, messages, and cascades removal across all database tables.

---

## 7. Database Migration & Rollback Playbook

### Zero-Downtime Schema Evolution Rules
1. **Additive Changes First**: Always add new columns as `NULL` or with defaults. Never remove or rename existing columns while active client code depends on them.
2. **Dual-Writing / Backward-Compatible Phase**: If migrating data types or table structures, maintain dual-write triggers until all clients have upgraded.
3. **Pre-Migration Testing**:
   - Every migration must be tested in CI against containerized PostgreSQL using `supabase test db` and pgTAP suites.
   - Migration numbering must be sequential (`20261024000001_...` through `20261024000012_...`).

### Emergency Rollback Playbook
If a migration fails or corrupts data in production:
1. **Stop Traffic**: Pause traffic at Cloudflare if database consistency is compromised.
2. **Locate Latest Verified Backup**: Identify latest backup directory with valid `checksums.sha256`.
3. **Verify Integrity**:
   ```bash
   ./scripts/backup-restore.sh verify backups/backup_YYYYMMDD_HHMMSSZ
   ```
4. **Execute Restoration**:
   ```bash
   ./scripts/backup-restore.sh restore backups/backup_YYYYMMDD_HHMMSSZ --force
   ```
5. **Run Sanity Check**: Run `supabase test db` to confirm schema integrity before opening traffic.

---

## 8. Monitoring, Quotas & Free-Tier Operational Constraints

### Supabase Free-Tier Constraints

| Resource | Free-Tier Limit | Alert Threshold | Operational Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **PostgreSQL Database Storage** | **500 MB** | 400 MB (80%) | Purge soft-deleted records, vacuum tables, archive historical waitlist logs. |
| **Object File Storage** | **1 GB** | 800 MB (80%) | Enforce WebP image compression (< 500KB/photo); purge unverified selfies after 30 days. |
| **Active Users (MAU)** | **50,000 MAU** | 40,000 MAU | Monitor signup growth; plan infrastructure tier upgrade before limit breach. |
| **Database Connections** | **60 direct connections** | 45 connections | Enforce connection pooling via **Supavisor** on port `6543` (transaction pooling mode). |
| **Egress Bandwidth** | **5 GB / month** | 4 GB | Cache static assets and avatar thumbnails on Cloudflare edge CDN. |

---

## 9. Launch Readiness Operational Checklists

### 9.1 Pre-Launch Checklist (T-7 days to T-1 day)
- [ ] **Custom SMTP Configuration**: Hosted Supabase project configured with custom SMTP provider (SES, Resend, SendGrid) and tested.
- [ ] **2FA Enforcement**: Two-factor authentication enabled on all GitHub repository maintainers and Supabase project admins.
- [ ] **DNS & SSL Setup**: Cloudflare custom domain configured with SSL/TLS Full (Strict) mode.
- [ ] **Storage RLS Policies**: Verified that `profile-photos` and `verification-selfies` storage buckets enforce strict user-authenticated access.
- [ ] **Backup Dry Run**: Executed `./scripts/backup-restore.sh backup` and `verify` to confirm automated snapshot generation.
- [ ] **Code Hygiene**: Audited client source code to verify zero hardcoded service role keys and zero role switcher preview components.
- [ ] **Security Headers & CSP**: Validated `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and CSP in `public/_headers`.

### 9.2 Launch Day Checklist (T-0)
- [ ] **Cache Purge**: Purge Cloudflare edge caches prior to public announcements.
- [ ] **End-to-End User Journey Verification**: Complete live test registration, bilingual Tamil/English toggle, waitlist position check, and settings data rights.
- [ ] **Metrics Dashboard Monitoring**: Open real-time Supabase connection pool and auth rate limit graphs.
- [ ] **On-Call Staffing**: Verify Incident Commander and Tech Lead on active standby during launch window.

### 9.3 Post-Launch Checklist (T+1 to T+7 days)
- [ ] **Daily Backups**: Automated execution of daily database snapshots with SHA-256 verification.
- [ ] **Daily Moderation Triage**: Conduct morning (10:00 AM IST) and evening (6:00 PM IST) queue reviews for selfies and reported accounts.
- [ ] **Weekly Admissions Batch**: Run Section 13 admission score formula to admit approved waitlist applicants.
- [ ] **Storage Quota Review**: Monitor weekly database and object storage usage against free-tier thresholds.
