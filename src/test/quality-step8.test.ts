import { describe, it, expect } from 'vitest';
import { translations } from '../translations';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Step 8: Quality (Tamil Localization, Accessibility & Production Standards)', () => {
  describe('1. Tamil Typography & Complete Bilingual Localization', () => {
    it('has 100% parity of translation keys between English and Tamil', () => {
      const enKeys = Object.keys(translations.en).sort();
      const taKeys = Object.keys(translations.ta).sort();

      const missingInTamil = enKeys.filter(k => !(k in translations.ta));
      const missingInEnglish = taKeys.filter(k => !(k in translations.en));

      expect(missingInTamil, `Keys missing in Tamil: ${missingInTamil.join(', ')}`).toEqual([]);
      expect(missingInEnglish, `Keys missing in English: ${missingInEnglish.join(', ')}`).toEqual([]);
      expect(enKeys.length).toBeGreaterThanOrEqual(60);
    });

    it('ensures all Tamil translation values are non-empty strings', () => {
      Object.entries(translations.ta).forEach(([key, value]) => {
        expect(typeof value, `Translation for ${key} should be string`).toBe('string');
        expect(value.trim().length, `Tamil translation for ${key} must not be empty`).toBeGreaterThan(0);
      });
    });

    it('loads Noto Sans Tamil and Plus Jakarta Sans fonts in index.html', () => {
      const indexPath = path.resolve(__dirname, '../../index.html');
      const indexHtml = fs.readFileSync(indexPath, 'utf-8');

      expect(indexHtml).toContain('Noto+Sans+Tamil');
      expect(indexHtml).toContain('Plus+Jakarta+Sans');
      expect(indexHtml).toContain('Inter');
    });
  });

  describe('2. Accessibility (WCAG 2.1 AA Standards)', () => {
    it('verifies accessible toggles, switches, and buttons across key components', () => {
      const settingsPath = path.resolve(__dirname, '../pages/Settings.tsx');
      const settingsContent = fs.readFileSync(settingsPath, 'utf-8');

      expect(settingsContent).toContain('role="switch"');
      expect(settingsContent).toContain('aria-checked');
      expect(settingsContent).toContain('aria-label');
      expect(settingsContent).toContain('role="dialog"');
      expect(settingsContent).toContain('aria-modal="true"');
      expect(settingsContent).toContain('aria-labelledby="delete-dialog-title"');
    });

    it('verifies accessible icon buttons in BottomNav and Navbar', () => {
      const navPath = path.resolve(__dirname, '../components/Navbar.tsx');
      const bottomNavPath = path.resolve(__dirname, '../components/BottomNav.tsx');

      const navContent = fs.readFileSync(navPath, 'utf-8');
      const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf-8');

      expect(navContent).toContain('aria-label="Settings & Privacy"');
      expect(navContent).toContain('aria-label="Toggle Language"');

      expect(bottomNavContent).toContain('aria-label="Discover"');
      expect(bottomNavContent).toContain('aria-label="Matches"');
      expect(bottomNavContent).toContain('aria-label="Safety"');
      expect(bottomNavContent).toContain('aria-label="Profile"');
      expect(bottomNavContent).toContain('aria-label="Waitlist Status"');
    });
  });

  describe('3. Production Standards, Clean Code & OWASP Headers', () => {
    it('verifies 0 occurrences of role switchers in codebase', () => {
      const srcDir = path.resolve(__dirname, '..');
      
      function searchFiles(dir: string): string[] {
        let results: string[] = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            results = results.concat(searchFiles(fullPath));
          } else if (/\.(tsx|ts|jsx|js|html)$/.test(entry.name) && !entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (/role\s*switcher|preview\s*role/i.test(content)) {
              results.push(fullPath);
            }
          }
        }
        return results;
      }

      const filesWithRoleSwitcher = searchFiles(srcDir);
      expect(filesWithRoleSwitcher).toEqual([]);
    });

    it('verifies presence of Cloudflare Pages _headers with strict CSP directives', () => {
      const headersPath = path.resolve(__dirname, '../../public/_headers');
      expect(fs.existsSync(headersPath)).toBe(true);

      const content = fs.readFileSync(headersPath, 'utf-8');
      expect(content).toContain('X-Frame-Options: DENY');
      expect(content).toContain('X-Content-Type-Options: nosniff');
      expect(content).toContain('Referrer-Policy: strict-origin-when-cross-origin');
      expect(content).toContain('Permissions-Policy: camera=(self)');
      expect(content).toContain("default-src 'self'");
      expect(content).toContain("frame-ancestors 'none'");
    });
  });
});
