import { BaseEnrichmentStep } from '../enrichment-agent';
import { EnrichmentContext, CrawledPage, CrawlerConfig } from '../../types/enrichment';
import { generateCrawlUrl, isDomainCrawlable } from '../../utils/domain-validator';
import * as cheerio from 'cheerio';

/**
 * Web Crawler Step
 * 
 * First step in the enrichment chain. Crawls the target domain
 * and extracts HTML content from accessible pages.
 */

export class WebCrawlerStep extends BaseEnrichmentStep {
  private config: CrawlerConfig;

  constructor(jobRepository: any) {
    super(jobRepository);
    
    // Default crawler configuration
    this.config = {
      max_pages: parseInt(process.env.CRAWLER_MAX_PAGES || '10'),
      delay_ms: parseInt(process.env.CRAWLER_DELAY_MS || '1000'),
      timeout_ms: parseInt(process.env.CRAWLER_TIMEOUT_MS || '30000'),
      user_agent: process.env.CRAWLER_USER_AGENT || 'Resilion-Enrichment-Bot/1.0',
      respect_robots_txt: process.env.CRAWLER_RESPECT_ROBOTS === 'true'
    };
  }

  get name(): string {
    return 'WebCrawler';
  }

  canHandle(context: EnrichmentContext): boolean {
    // Can handle if job exists and crawling hasn't been completed
    return !!(context.job && context.job.crawling_status !== 'completed');
  }

  async execute(context: EnrichmentContext): Promise<EnrichmentContext> {
    const { job } = context;
    
    try {
      // Update step status to running
      await this.updateStepStatus(job.id, 'crawling_status', 'running');

      // Validate domain is crawlable
      if (!isDomainCrawlable(job.domain)) {
        throw new Error(`Domain ${job.domain} is not crawlable`);
      }

      // Check robots.txt if configured
      if (this.config.respect_robots_txt) {
        const robotsAllowed = await this.checkRobotsTxt(job.domain);
        if (!robotsAllowed) {
          throw new Error(`Crawling not allowed by robots.txt for ${job.domain}`);
        }
      }

      // Crawl the domain
      const crawledPages = await this.crawlDomain(job.domain);

      // Update progress
      await this.updateProgress(job.id, { pages_crawled: crawledPages.length });

      // Update step status to completed
      await this.updateStepStatus(job.id, 'crawling_status', 'completed');

      // Return updated context
      return {
        ...context,
        crawled_pages: crawledPages,
        step_results: {
          ...context.step_results,
          crawling: {
            pages_found: crawledPages.length,
            total_content_length: crawledPages.reduce((sum, page) => sum + page.content.length, 0),
            completed_at: new Date().toISOString()
          }
        }
      };

    } catch (error) {
      // Update step status to failed
      await this.updateStepStatus(job.id, 'crawling_status', 'failed');
      
      return {
        ...context,
        error: error instanceof Error ? error : new Error('Crawling failed')
      };
    }
  }

  /**
   * Crawls the domain and returns extracted pages
   */
  private async crawlDomain(domain: string): Promise<CrawledPage[]> {
    const crawledPages: CrawledPage[] = [];
    const visitedUrls = new Set<string>();
    const urlsToVisit = [generateCrawlUrl(domain)];

    while (urlsToVisit.length > 0 && crawledPages.length < this.config.max_pages) {
      const url = urlsToVisit.shift()!;
      
      if (visitedUrls.has(url)) {
        continue;
      }

      visitedUrls.add(url);

      try {
        // Add delay between requests
        if (crawledPages.length > 0) {
          await this.delay(this.config.delay_ms);
        }

        const page = await this.crawlPage(url);
        if (page) {
          crawledPages.push(page);
          
          // Extract additional URLs from the page (simple implementation)
          const additionalUrls = this.extractUrls(page.content, domain);
          for (const additionalUrl of additionalUrls) {
            if (!visitedUrls.has(additionalUrl) && !urlsToVisit.includes(additionalUrl)) {
              urlsToVisit.push(additionalUrl);
            }
          }
        }

      } catch (error) {
        console.warn(`Failed to crawl ${url}:`, error);
        // Continue with other URLs
      }
    }

    return crawledPages;
  }

  /**
   * Crawls a single page
   */
  private async crawlPage(url: string): Promise<CrawledPage | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout_ms);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.user_agent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return null; // Skip non-HTML content
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract title
      const title = $('title').text().trim() || 'Untitled';

      // Extract main content (remove scripts, styles, etc.)
      $('script, style, nav, header, footer, aside, .nav, .navigation, .menu').remove();
      
      // Get text content
      const content = $('body').text()
        .replace(/\s+/g, ' ')
        .trim();

      // Calculate word count
      const wordCount = content.split(/\s+/).filter((word: string) => word.length > 0).length;

      return {
        url,
        title,
        content,
        metadata: {
          crawled_at: new Date().toISOString(),
          status_code: response.status,
          content_type: contentType,
          word_count: wordCount
        }
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout for ${url}`);
      }
      throw error;
    }
  }

  /**
   * Extracts URLs from page content
   */
  private extractUrls(html: string, domain: string): string[] {
    const $ = cheerio.load(html);
    const urls: string[] = [];
    const baseUrl = generateCrawlUrl(domain);

    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;

      try {
        let fullUrl: string;
        
        if (href.startsWith('http')) {
          fullUrl = href;
        } else if (href.startsWith('/')) {
          fullUrl = new URL(href, baseUrl).toString();
        } else if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
          return; // Skip anchors and special links
        } else {
          fullUrl = new URL(href, baseUrl).toString();
        }

        // Only include URLs from the same domain
        const urlDomain = new URL(fullUrl).hostname.replace(/^www\./, '');
        const targetDomain = domain.replace(/^www\./, '');
        
        if (urlDomain === targetDomain) {
          urls.push(fullUrl);
        }

      } catch (error) {
        // Skip invalid URLs
      }
    });

    return [...new Set(urls)]; // Remove duplicates
  }

  /**
   * Checks robots.txt for crawling permissions
   */
  private async checkRobotsTxt(domain: string): Promise<boolean> {
    try {
      const robotsUrl = `${generateCrawlUrl(domain)}/robots.txt`;
      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': this.config.user_agent }
      });

      if (!response.ok) {
        return true; // If robots.txt doesn't exist, assume crawling is allowed
      }

      const robotsText = await response.text();
      
      // Simple robots.txt parsing (basic implementation)
      const lines = robotsText.split('\n').map(line => line.trim().toLowerCase());
      let currentUserAgent = '';
      let disallowed = false;

      for (const line of lines) {
        if (line.startsWith('user-agent:')) {
          currentUserAgent = line.substring(11).trim();
        } else if (line.startsWith('disallow:') && 
                   (currentUserAgent === '*' || currentUserAgent.includes('resilion'))) {
          const disallowPath = line.substring(9).trim();
          if (disallowPath === '/' || disallowPath === '') {
            disallowed = true;
          }
        }
      }

      return !disallowed;

    } catch (error) {
      console.warn(`Failed to check robots.txt for ${domain}:`, error);
      return true; // Assume allowed if check fails
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
