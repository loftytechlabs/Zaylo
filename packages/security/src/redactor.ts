export class SecretRedactor {
  private static readonly PATTERNS: RegExp[] = [
    /lcl_[a-zA-Z0-9_-]{16,64}/g,
    /Bearer\s+[a-zA-Z0-9._-]+/gi,
    /"(?:authorization|apiKey|secret|password|token)":\s*"[^"]+"/gi,
  ];

  public static redact(text: string): string {
    if (!text || typeof text !== 'string') return text;
    let redacted = text;

    redacted = redacted.replace(/lcl_[a-zA-Z0-9_-]{16,64}/g, 'lcl_••••••••••••');
    redacted = redacted.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer ••••••••');
    redacted = redacted.replace(/"(authorization|apiKey|secret|password|token)":\s*"[^"]+"/gi, '"$1": "••••••••"');

    return redacted;
  }

  public static sanitizeHeaders(headers: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(headers)) {
      const lower = k.toLowerCase();
      if (lower === 'authorization' || lower === 'x-api-key' || lower.includes('secret') || lower.includes('password')) {
        sanitized[k] = '••••••••';
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }
}
