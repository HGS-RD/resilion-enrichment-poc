import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  validateDomain, 
  normalizeDomain, 
  extractRootDomain,
  isDomainCrawlable,
  generateCrawlUrl,
  validateDomains
} from '../../../apps/web/lib/utils/domain-validator';

describe('Domain Validator Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateDomain', () => {
    it('should validate correct domain formats', () => {
      const validDomains = [
        'example.com',
        'www.example.com',
        'sub.example.com',
        'example-site.com',
        'example123.org',
        'test.co.uk'
      ];

      validDomains.forEach(domain => {
        expect(validateDomain(domain)).toBe(true);
      });
    });

    it('should reject invalid domain formats', () => {
      const invalidDomains = [
        '',
        'invalid',
        'example.com/',
        'example..com',
        '.example.com',
        'example.com.',
        'example .com',
        'example@com',
        'localhost',
        '192.168.1.1'
      ];

      invalidDomains.forEach(domain => {
        expect(validateDomain(domain)).toBe(false);
      });
    });

    it('should handle domains with protocols by cleaning them', () => {
      expect(validateDomain('http://example.com')).toBe(true);
      expect(validateDomain('https://example.com')).toBe(true);
    });

    it('should handle edge cases', () => {
      expect(validateDomain('a.co')).toBe(true);
      expect(validateDomain('very-long-subdomain-name.example.com')).toBe(true);
      expect(validateDomain('123.example.com')).toBe(true);
    });
  });

  describe('normalizeDomain', () => {
    it('should normalize domains correctly', () => {
      expect(normalizeDomain('EXAMPLE.COM')).toBe('example.com');
      expect(normalizeDomain('www.example.com')).toBe('example.com');
      expect(normalizeDomain('https://example.com')).toBe('example.com');
      expect(normalizeDomain('http://www.example.com/path')).toBe('example.com');
    });

    it('should handle empty or invalid input', () => {
      expect(normalizeDomain('')).toBe('');
    });
  });

  describe('extractRootDomain', () => {
    it('should extract root domain from subdomains', () => {
      expect(extractRootDomain('sub.example.com')).toBe('example.com');
      expect(extractRootDomain('www.sub.example.com')).toBe('example.com');
      expect(extractRootDomain('example.com')).toBe('example.com');
    });
  });

  describe('isDomainCrawlable', () => {
    it('should return false for excluded domains', () => {
      const excludedDomains = [
        'facebook.com',
        'twitter.com',
        'google.com'
      ];

      excludedDomains.forEach(domain => {
        expect(isDomainCrawlable(domain)).toBe(false);
      });
    });

    it('should return true for crawlable domains', () => {
      expect(isDomainCrawlable('example.com')).toBe(true);
      expect(isDomainCrawlable('manufacturing-company.com')).toBe(true);
    });

    it('should return false for invalid domains', () => {
      expect(isDomainCrawlable('invalid')).toBe(false);
      expect(isDomainCrawlable('')).toBe(false);
    });
  });

  describe('generateCrawlUrl', () => {
    it('should generate HTTPS URLs by default', () => {
      expect(generateCrawlUrl('example.com')).toBe('https://example.com');
    });

    it('should generate HTTP URLs when specified', () => {
      expect(generateCrawlUrl('example.com', false)).toBe('http://example.com');
    });

    it('should normalize domains in URLs', () => {
      expect(generateCrawlUrl('www.example.com')).toBe('https://example.com');
    });
  });

  describe('validateDomains', () => {
    it('should separate valid and invalid domains', () => {
      const domains = [
        'example.com',
        'invalid',
        'test.org',
        'localhost',
        'manufacturing.co.uk'
      ];

      const result = validateDomains(domains);
      
      expect(result.valid).toContain('example.com');
      expect(result.valid).toContain('test.org');
      expect(result.valid).toContain('manufacturing.co.uk');
      expect(result.invalid).toContain('invalid');
      expect(result.invalid).toContain('localhost');
    });

    it('should normalize valid domains', () => {
      const domains = ['WWW.EXAMPLE.COM', 'https://test.org'];
      const result = validateDomains(domains);
      
      expect(result.valid).toContain('example.com');
      expect(result.valid).toContain('test.org');
    });
  });
});
