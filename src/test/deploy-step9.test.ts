import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

describe('Step 9: Production Deployment & Disaster Recovery', () => {
  describe('1. Cloudflare Pages Configuration (wrangler.toml & public assets)', () => {
    it('should have a valid wrangler.toml configured for Cloudflare Pages', () => {
      const wranglerPath = path.join(projectRoot, 'wrangler.toml');
      expect(fs.existsSync(wranglerPath), 'wrangler.toml must exist in repo root').toBe(true);

      const content = fs.readFileSync(wranglerPath, 'utf8');
      expect(content).toContain('name = "koodal-dating-app"');
      expect(content).toContain('pages_build_output_dir = "dist"');
      expect(content).toMatch(/compatibility_date\s*=\s*"\d{4}-\d{2}-\d{2}"/);
      expect(content).toContain('compatibility_flags');
      expect(content).toContain('nodejs_compat');
    });

    it('should have public/_redirects for client-side SPA routing', () => {
      const redirectsPath = path.join(projectRoot, 'public/_redirects');
      expect(fs.existsSync(redirectsPath), 'public/_redirects must exist for SPA routing').toBe(true);

      const content = fs.readFileSync(redirectsPath, 'utf8');
      expect(content).toMatch(/\/\*\s+\/index\.html\s+200/);
    });

    it('should have comprehensive OWASP security headers and CSP in public/_headers', () => {
      const headersPath = path.join(projectRoot, 'public/_headers');
      expect(fs.existsSync(headersPath), 'public/_headers must exist').toBe(true);

      const content = fs.readFileSync(headersPath, 'utf8');
      expect(content).toContain('X-Frame-Options: DENY');
      expect(content).toContain('X-Content-Type-Options: nosniff');
      expect(content).toContain('Referrer-Policy: strict-origin-when-cross-origin');
      expect(content).toContain('Content-Security-Policy:');
      expect(content).toContain('Permissions-Policy:');
    });
  });

  describe('2. GitHub Actions Deployment Workflow (.github/workflows/deploy-cloudflare.yml)', () => {
    it('should have a production deployment workflow with manual approval environment gate', () => {
      const workflowPath = path.join(projectRoot, '.github/workflows/deploy-cloudflare.yml');
      expect(fs.existsSync(workflowPath), 'deploy-cloudflare.yml workflow must exist').toBe(true);

      const content = fs.readFileSync(workflowPath, 'utf8');
      // Triggers
      expect(content).toContain('branches: [ main ]');
      expect(content).toContain('workflow_dispatch:');

      // Manual approval environment
      expect(content).toContain('environment:');
      expect(content).toContain('production');

      // Steps
      expect(content).toContain('actions/checkout');
      expect(content).toContain('actions/setup-node');
      expect(content).toContain('npm ci');
      expect(content).toContain('npm test');
      expect(content).toContain('npm run build');

      // Cloudflare deployment
      expect(content).toContain('CLOUDFLARE_API_TOKEN');
      expect(content).toContain('CLOUDFLARE_ACCOUNT_ID');
      expect(content).toMatch(/(wrangler\s+pages\s+deploy|cloudflare\/wrangler-action|wrangler-action)/i);
    });
  });

  describe('3. Automated Database Backup & Disaster Recovery Scripts', () => {
    it('should provide a POSIX shell backup & restore script (scripts/backup-restore.sh)', () => {
      const scriptPath = path.join(projectRoot, 'scripts/backup-restore.sh');
      expect(fs.existsSync(scriptPath), 'scripts/backup-restore.sh must exist').toBe(true);

      const content = fs.readFileSync(scriptPath, 'utf8');
      expect(content).toContain('#!/usr/bin/env bash');
      expect(content).toContain('backup()');
      expect(content).toContain('restore()');
      expect(content).toContain('verify()');
      expect(content).toContain('sha256sum');
      expect(content).toMatch(/(pg_dump|supabase\s+db\s+dump)/);
      expect(content).toMatch(/(--force|-f|CONFIRM|read -p)/);
    });

    it('should provide a PowerShell backup & restore script (scripts/backup-restore.ps1)', () => {
      const scriptPath = path.join(projectRoot, 'scripts/backup-restore.ps1');
      expect(fs.existsSync(scriptPath), 'scripts/backup-restore.ps1 must exist').toBe(true);

      const content = fs.readFileSync(scriptPath, 'utf8');
      expect(content).toMatch(/(param\s*\(|function\s+Backup|function\s+Restore)/i);
      expect(content).toContain('Get-FileHash');
      expect(content).toMatch(/(pg_dump|supabase\s+db\s+dump)/);
      expect(content).toMatch(/(-Force|\$Force|Read-Host)/i);
    });
  });

  describe('4. Operations & Disaster Recovery Documentation', () => {
    it('should document deployment procedures, backup schedule, and recovery runbook in docs/DEPLOYMENT.md or docs/OPERATIONS.md', () => {
      const deployDocPath = path.join(projectRoot, 'docs/DEPLOYMENT.md');
      const opsDocPath = path.join(projectRoot, 'docs/OPERATIONS.md');

      const docPath = fs.existsSync(deployDocPath) ? deployDocPath : opsDocPath;
      const content = fs.readFileSync(docPath, 'utf8');

      expect(content).toContain('Cloudflare Pages');
      expect(content).toContain('Manual Approval');
      expect(content).toMatch(/(Disaster Recovery|Backup & Restore|RTO|RPO)/i);
      expect(content).toContain('scripts/backup-restore');
    });
  });
});
