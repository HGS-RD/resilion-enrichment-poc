/**
 * Domain Validation Utilities
 * 
 * Provides functions to validate domain names for the enrichment process.
 * Ensures domains are properly formatted and accessible for crawling.
 */

/**
 * Validates if a string is a valid domain name
 * @param domain - The domain string to validate
 * @returns boolean indicating if the domain is valid
 */
export function validateDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') {
    return false;
  }

  // Remove protocol if present
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  
  // Basic domain regex pattern
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  // Check basic format
  if (!domainRegex.test(cleanDomain)) {
    return false;
  }

  // Additional validation rules
  const parts = cleanDomain.split('.');
  
  // Must have at least 2 parts (domain.tld)
  if (parts.length < 2) {
    return false;
  }

  // Each part must be valid
  for (const part of parts) {
    if (part.length === 0 || part.length > 63) {
      return false;
    }
    
    // Cannot start or end with hyphen
    if (part.startsWith('-') || part.endsWith('-')) {
      return false;
    }
  }

  // TLD must be at least 2 characters and contain only letters
  const tld = parts[parts.length - 1];
  if (tld.length < 2 || !/^[a-zA-Z]+$/.test(tld)) {
    return false;
  }

  // Exclude localhost and IP addresses
  if (cleanDomain === 'localhost' || isIPAddress(cleanDomain)) {
    return false;
  }

  return true;
}

/**
 * Checks if a string is an IP address
 * @param str - String to check
 * @returns boolean indicating if it's an IP address
 */
function isIPAddress(str: string): boolean {
  // IPv4 pattern
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  
  // IPv6 pattern (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(str) || ipv6Regex.test(str);
}

/**
 * Normalizes a domain name for consistent processing
 * @param domain - The domain to normalize
 * @returns normalized domain string
 */
export function normalizeDomain(domain: string): string {
  if (!domain) return '';
  
  // Remove protocol and trailing paths
  let normalized = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  
  // Remove www. prefix
  normalized = normalized.replace(/^www\./, '');
  
  // Convert to lowercase
  normalized = normalized.toLowerCase();
  
  return normalized;
}

/**
 * Extracts the root domain from a subdomain
 * @param domain - The domain to extract root from
 * @returns root domain string
 */
export function extractRootDomain(domain: string): string {
  const normalized = normalizeDomain(domain);
  const parts = normalized.split('.');
  
  if (parts.length <= 2) {
    return normalized;
  }
  
  // Return last two parts (domain.tld)
  return parts.slice(-2).join('.');
}

/**
 * Checks if a domain is likely to be crawlable
 * @param domain - The domain to check
 * @returns boolean indicating crawlability
 */
export function isDomainCrawlable(domain: string): boolean {
  if (!validateDomain(domain)) {
    return false;
  }

  const normalized = normalizeDomain(domain);
  
  // Exclude common non-crawlable domains
  const excludedDomains = [
    'facebook.com',
    'twitter.com',
    'instagram.com',
    'linkedin.com',
    'youtube.com',
    'google.com',
    'amazon.com'
  ];
  
  const rootDomain = extractRootDomain(normalized);
  
  return !excludedDomains.includes(rootDomain);
}

/**
 * Generates the full URL for crawling
 * @param domain - The domain to generate URL for
 * @param useHttps - Whether to use HTTPS (default: true)
 * @returns full URL string
 */
export function generateCrawlUrl(domain: string, useHttps: boolean = true): string {
  const normalized = normalizeDomain(domain);
  const protocol = useHttps ? 'https://' : 'http://';
  
  return `${protocol}${normalized}`;
}

/**
 * Validates multiple domains at once
 * @param domains - Array of domains to validate
 * @returns object with valid and invalid domains
 */
export function validateDomains(domains: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  for (const domain of domains) {
    if (validateDomain(domain)) {
      valid.push(normalizeDomain(domain));
    } else {
      invalid.push(domain);
    }
  }
  
  return { valid, invalid };
}
