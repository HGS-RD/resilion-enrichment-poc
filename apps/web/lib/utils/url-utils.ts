/**
 * Extracts the domain name from a URL or returns the input if it's already a domain
 * @param input - URL or domain string
 * @returns Clean domain name (e.g., "conagrabrands.com")
 */
export function extractDomain(input: string): string {
  if (!input || typeof input !== 'string') {
    return input
  }

  const trimmed = input.trim()
  
  // If it doesn't contain protocol or www, it might already be a domain
  if (!trimmed.includes('://') && !trimmed.startsWith('www.')) {
    // Check if it looks like a domain (contains a dot and no spaces)
    if (trimmed.includes('.') && !trimmed.includes(' ')) {
      return trimmed
    }
  }

  try {
    // Handle cases where protocol is missing
    let urlString = trimmed
    if (!urlString.includes('://')) {
      urlString = 'https://' + urlString
    }

    const url = new URL(urlString)
    let hostname = url.hostname

    // Remove www. prefix if present
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4)
    }

    return hostname
  } catch (error) {
    // If URL parsing fails, try to extract domain manually
    let cleaned = trimmed
    
    // Remove protocol
    cleaned = cleaned.replace(/^https?:\/\//, '')
    
    // Remove www.
    cleaned = cleaned.replace(/^www\./, '')
    
    // Remove path, query, and fragment
    cleaned = cleaned.split('/')[0]
    cleaned = cleaned.split('?')[0]
    cleaned = cleaned.split('#')[0]
    
    return cleaned
  }
}
