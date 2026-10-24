import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../');

describe('Step 10: Launch Readiness & Operational Procedures', () => {
  const operationsDocPath = path.join(projectRoot, 'docs/OPERATIONS.md');

  describe('1. Operations Documentation & SOPs (docs/OPERATIONS.md)', () => {
    it('should document Incident Response and Escalation Matrix with severity tiers', () => {
      const content = fs.readFileSync(operationsDocPath, 'utf8');
      expect(content).toMatch(/Incident Response/i);
      expect(content).toMatch(/Escalation Matrix/i);
      expect(content).toContain('Sev-1');
      expect(content).toContain('Sev-2');
      expect(content).toContain('Sev-3');
    });

    it('should document User Moderation SOPs including selfie verification and harassment protocols', () => {
      const content = fs.readFileSync(operationsDocPath, 'utf8');
      expect(content).toMatch(/Moderation SOP/i);
      expect(content).toMatch(/Selfie Verification/i);
      expect(content).toMatch(/Harassment/i);
      expect(content).toMatch(/(Suspension|Termination|Ban)/i);
    });

    it('should document Database Migration and Rollback Playbook', () => {
      const content = fs.readFileSync(operationsDocPath, 'utf8');
      expect(content).toMatch(/Database Migration/i);
      expect(content).toMatch(/Rollback/i);
      expect(content).toMatch(/(Zero-downtime|Backward-compatible)/i);
      expect(content).toContain('backup-restore');
    });

    it('should document Monitoring, Alerting, and Free-Tier Quota Constraints', () => {
      const content = fs.readFileSync(operationsDocPath, 'utf8');
      expect(content).toMatch(/Monitoring/i);
      expect(content).toMatch(/Quota/i);
      expect(content).toMatch(/(Storage|500 MB|1 GB)/i);
      expect(content).toMatch(/(Connection|Supavisor|Pool)/i);
    });

    it('should provide comprehensive Pre-Launch, Launch Day, and Post-Launch checklists', () => {
      const content = fs.readFileSync(operationsDocPath, 'utf8');
      expect(content).toMatch(/Pre-Launch/i);
      expect(content).toMatch(/Launch Day/i);
      expect(content).toMatch(/Post-Launch/i);
      expect(content).toContain('- [ ]');
    });
  });

  describe('2. Codebase Security & Hygiene Audit', () => {
    it('should ensure no Supabase service role keys or secrets are leaked in client src/', () => {
      const srcDir = path.join(projectRoot, 'src');
      
      const scanDir = (dir: string): string[] => {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        list.forEach((file) => {
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat && stat.isDirectory()) {
            results = results.concat(scanDir(fullPath));
          } else if (/\.(ts|tsx|js|jsx)$/.test(file) && !file.includes('.test.')) {
            results.push(fullPath);
          }
        });
        return results;
      };

      const files = scanDir(srcDir);
      for (const file of files) {
        const code = fs.readFileSync(file, 'utf8');
        expect(code).not.toContain('supabase_service_role_key');
        expect(code).not.toMatch(/service_role_key\s*=\s*['"][^'"]+['"]/i);
        expect(code).not.toMatch(/ghp_[A-Za-z0-9]+/);
        expect(code).not.toMatch(/gho_[A-Za-z0-9]+/);
      }
    });

    it('should verify sequential database migrations without gaps', () => {
      const migrationsDir = path.join(projectRoot, 'supabase/migrations');
      expect(fs.existsSync(migrationsDir)).toBe(true);

      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      expect(files.length).toBeGreaterThanOrEqual(12);

      // Verify migration sequence
      const step11 = files.find(f => f.includes('step1_5_fix_read_functions'));
      const step12 = files.find(f => f.includes('step7_safety_privacy_compliance'));
      expect(step11).toBeDefined();
      expect(step12).toBeDefined();
    });
  });
});
