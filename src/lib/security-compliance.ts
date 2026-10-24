/**
 * Koodal Security & Compliance Headers Engine
 * Generates strict Content Security Policy (CSP), anti-clickjacking,
 * MIME sniff protection, and sensor permission policies in line with
 * OWASP Top 10 guidelines and production launch standards.
 */

export class SecurityCompliance {
  /**
   * Generates strict Content Security Policy directives string.
   */
  static getCspString(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'wasm-unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.brevo.com https://api.resend.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];

    return directives.join('; ');
  }

  /**
   * Returns complete production security headers conforming to OWASP standards.
   */
  static getRequiredSecurityHeaders(): Record<string, string> {
    return {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(self)',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Content-Security-Policy': this.getCspString()
    };
  }

  /**
   * Validates whether a given headers object meets the mandatory security standards.
   */
  static validateSecurityHeaders(headers: Record<string, string>): {
    valid: boolean;
    missingDirectives: string[];
  } {
    const missing: string[] = [];
    const requiredKeys = [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Content-Security-Policy'
    ];

    for (const key of requiredKeys) {
      if (!headers[key]) {
        missing.push(key);
      }
    }

    return {
      valid: missing.length === 0,
      missingDirectives: missing
    };
  }
}
