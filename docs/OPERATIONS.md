# Operations & Launch Checklist

This document tracks operational requirements, environment settings, and pre-launch procedures for Koodal Dating App.

## 1. Authentication Rate Limits & Provider Configuration

> [!IMPORTANT]
> **Environment Clarification**: All rate limits specified in `supabase/config.toml` (e.g., 30 requests per 5 minutes for signups/logins, 150 for token refresh) apply strictly to **local development and CI test runners**. They do not reflect the settings on the hosted Supabase Cloud project.

### Action Items & TODOs:
- [ ] **TODO: Read real Auth rate limits from the hosted project dashboard before launch.**
  - Access the hosted Supabase project at `https://supabase.com/dashboard/project/<project-ref>/auth/rate-limits`.
  - Review and document the production token bucket thresholds for `/auth/v1/signup`, `/auth/v1/token`, `/auth/v1/otp`, and password resets.
  - Enable IP Address Forwarding headers (`X-Forwarded-For`) if deploying behind Cloudflare or a reverse proxy.
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
