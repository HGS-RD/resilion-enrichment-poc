import { BaseEnrichmentStep } from '../base-enrichment-step';
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
  private currentJobId: string | null = null;

  constructor(jobRepository: any) {
    super(jobRepository);
    
    // Default crawler configuration
    this.config = {
      max_pages: parseInt(process.env.CRAWLER_MAX_PAGES || '25'),
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
    // If crawling_status is undefined/null, treat as pending (can handle)
    return !!(context.job && 
             (context.job.crawling_status === undefined || 
              context.job.crawling_status === null || 
              context.job.crawling_status === 'pending' || 
              context.job.crawling_status === 'failed'));
  }

  async execute(context: EnrichmentContext): Promise<EnrichmentContext> {
    const { job } = context;
    
    try {
      console.log(`[WebCrawlerStep] Starting crawl for job ${job.id}, domain: ${job.domain}`);
      
      // Set current job ID for database logging
      this.currentJobId = job.id;
      
      // Update step status to running
      await this.updateStepStatus(job.id, 'crawling_status', 'running');
      console.log(`[WebCrawlerStep] Updated status to running for job ${job.id}`);

      // Validate domain is crawlable
      if (!isDomainCrawlable(job.domain)) {
        console.log(`[WebCrawlerStep] Domain ${job.domain} is not crawlable`);
        throw new Error(`Domain ${job.domain} is not crawlable`);
      }
      console.log(`[WebCrawlerStep] Domain ${job.domain} is crawlable`);

      // Check robots.txt if configured
      if (this.config.respect_robots_txt) {
        console.log(`[WebCrawlerStep] Checking robots.txt for ${job.domain}`);
        const robotsAllowed = await this.checkRobotsTxt(job.domain);
        if (!robotsAllowed) {
          console.log(`[WebCrawlerStep] Crawling not allowed by robots.txt for ${job.domain}`);
          throw new Error(`Crawling not allowed by robots.txt for ${job.domain}`);
        }
        console.log(`[WebCrawlerStep] Robots.txt allows crawling for ${job.domain}`);
      } else {
        console.log(`[WebCrawlerStep] Skipping robots.txt check (disabled)`);
      }

      // Crawl the domain
      console.log(`[WebCrawlerStep] Starting domain crawl for ${job.domain}`);
      const crawledPages = await this.crawlDomain(job.domain);
      console.log(`[WebCrawlerStep] Crawled ${crawledPages.length} pages for ${job.domain}`);

      // Update progress
      await this.updateProgress(job.id, { pages_crawled: crawledPages.length });
      console.log(`[WebCrawlerStep] Updated progress: ${crawledPages.length} pages crawled`);

      // Update step status to completed
      await this.updateStepStatus(job.id, 'crawling_status', 'completed');
      console.log(`[WebCrawlerStep] Completed crawling for job ${job.id}`);

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
      console.error(`[WebCrawlerStep] Error in job ${job.id}:`, error);
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
          
          // Log crawled page to database for observability
          await this.logCrawledPage(page, 1); // Default priority for now
          
          // Extract additional URLs from the page using raw HTML
          const additionalUrls = this.extractUrls(page.rawHtml || page.content, domain);
          for (const additionalUrl of additionalUrls) {
            if (!visitedUrls.has(additionalUrl) && !urlsToVisit.includes(additionalUrl)) {
              urlsToVisit.push(additionalUrl);
            }
          }
        }

      } catch (error) {
        console.warn(`Failed to crawl ${url}:`, error);
        
        // Log failed crawl attempt to database
        await this.logFailedCrawl(url, error instanceof Error ? error.message : 'Unknown error');
        
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
      console.log(`[WebCrawlerStep] Attempting to crawl: ${url}`);
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
        signal: controller.signal,
        redirect: 'follow' // Follow redirects automatically (default behavior)
      });

      clearTimeout(timeoutId);
      console.log(`[WebCrawlerStep] Response received for ${url}: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      console.log(`[WebCrawlerStep] Content-Type for ${url}: ${contentType}`);
      
      if (!contentType.includes('text/html')) {
        console.log(`[WebCrawlerStep] Skipping non-HTML content for ${url}`);
        return null; // Skip non-HTML content
      }

      const html = await response.text();
      console.log(`[WebCrawlerStep] HTML content length for ${url}: ${html.length} characters`);
      
      const $ = cheerio.load(html);

      // Extract title
      const title = $('title').text().trim() || 'Untitled';
      console.log(`[WebCrawlerStep] Page title for ${url}: "${title}"`);

      // Create a copy for content extraction (remove scripts, styles, etc.)
      const $content = cheerio.load(html);
      $content('script, style, nav, header, footer, aside, .nav, .navigation, .menu').remove();
      
      // Get text content
      const content = $content('body').text()
        .replace(/\s+/g, ' ')
        .trim();

      // Calculate word count
      const wordCount = content.split(/\s+/).filter((word: string) => word.length > 0).length;
      console.log(`[WebCrawlerStep] Extracted content for ${url}: ${content.length} chars, ${wordCount} words`);

      return {
        url,
        title,
        content,
        rawHtml: html, // Store raw HTML for URL extraction
        metadata: {
          crawled_at: new Date().toISOString(),
          status_code: response.status,
          content_type: contentType,
          word_count: wordCount
        }
      };

    } catch (error) {
      console.error(`[WebCrawlerStep] Error crawling ${url}:`, error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout for ${url}`);
      }
      throw error;
    }
  }

  /**
   * Extracts URLs from page content with intelligent prioritization
   */
  private extractUrls(html: string, domain: string): string[] {
    const $ = cheerio.load(html);
    const urls: string[] = [];
    const baseUrl = generateCrawlUrl(domain);

    // High-priority keywords for business information
    const highPriorityKeywords = [
      'about', 'company', 'corporate', 'overview',
      'locations', 'facilities', 'manufacturing', 'plants', 'offices',
      'products', 'services', 'solutions', 'business',
      'investors', 'sustainability', 'responsibility',
      'contact', 'global', 'worldwide', 'international'
    ];

    // Medium-priority keywords
    const mediumPriorityKeywords = [
      'careers', 'jobs', 'team', 'leadership',
      'news', 'press', 'media', 'announcements',
      'technology', 'innovation', 'research', 'development'
    ];

    const prioritizedUrls: Array<{ url: string; priority: number }> = [];

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
          // Calculate priority based on URL and link text
          const linkText = $(element).text().toLowerCase();
          const urlPath = new URL(fullUrl).pathname.toLowerCase();
          const combinedText = `${urlPath} ${linkText}`;

          let priority = 0;

          // Check for high-priority keywords
          for (const keyword of highPriorityKeywords) {
            if (combinedText.includes(keyword)) {
              priority += 10;
              break; // Only count once per category
            }
          }

          // Check for medium-priority keywords
          if (priority === 0) {
            for (const keyword of mediumPriorityKeywords) {
              if (combinedText.includes(keyword)) {
                priority += 5;
                break;
              }
            }
          }

          // Default priority for other pages
          if (priority === 0) {
            priority = 1;
          }

          prioritizedUrls.push({ url: fullUrl, priority });
        }

      } catch (error) {
        // Skip invalid URLs
      }
    });

    // Sort by priority (highest first) and extract URLs
    const sortedUrls = prioritizedUrls
      .sort((a, b) => b.priority - a.priority)
      .map(item => item.url);

    // Remove duplicates while preserving priority order
    const uniqueUrls = [...new Set(sortedUrls)];

    console.log(`[WebCrawlerStep] Found ${uniqueUrls.length} unique URLs, prioritized by business relevance`);
    
    return uniqueUrls;
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
   * Logs a successfully crawled page to the database
   */
  private async logCrawledPage(page: CrawledPage, priority: number): Promise<void> {
    if (!this.currentJobId) return;
    
    try {
      // Use the database pool directly
      const { getDatabasePool } = await import('../../utils/database');
      const pool = getDatabasePool();
      
      await pool.query(`
        INSERT INTO crawled_pages (
          job_id, url, title, status_code, content_length, 
          word_count, priority_score, crawled_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (job_id, url) DO UPDATE SET
          title = EXCLUDED.title,
          status_code = EXCLUDED.status_code,
          content_length = EXCLUDED.content_length,
          word_count = EXCLUDED.word_count,
          priority_score = EXCLUDED.priority_score,
          crawled_at = EXCLUDED.crawled_at
      `, [
        this.currentJobId,
        page.url,
        page.title,
        page.metadata.status_code,
        page.content.length,
        page.metadata.word_count,
        priority,
        page.metadata.crawled_at
      ]);
    } catch (error) {
      console.warn(`Failed to log crawled page ${page.url}:`, error);
      // Don't throw - logging failures shouldn't stop crawling
    }
  }

  /**
   * Logs a failed crawl attempt to the database
   */
  private async logFailedCrawl(url: string, errorMessage: string): Promise<void> {
    if (!this.currentJobId) return;
    
    try {
      // Use the database pool directly
      const { getDatabasePool } = await import('../../utils/database');
      const pool = getDatabasePool();
      
      await pool.query(`
        INSERT INTO crawled_pages (
          job_id, url, status_code, error_message, crawled_at
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (job_id, url) DO UPDATE SET
          status_code = EXCLUDED.status_code,
          error_message = EXCLUDED.error_message,
          crawled_at = EXCLUDED.crawled_at
      `, [
        this.currentJobId,
        url,
        0, // Use 0 to indicate failed request
        errorMessage,
        new Date().toISOString()
      ]);
    } catch (error) {
      console.warn(`Failed to log failed crawl for ${url}:`, error);
      // Don't throw - logging failures shouldn't stop crawling
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
