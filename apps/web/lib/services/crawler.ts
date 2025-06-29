import puppeteer, { Browser, Page } from 'puppeteer';
import { CrawledPage, CrawlerConfig } from '../types/enrichment';

export class WebCrawlerService {
  private config: CrawlerConfig;
  private browser: Browser | null = null;

  constructor(config: Partial<CrawlerConfig> = {}) {
    this.config = {
      max_pages: config.max_pages || 10,
      delay_ms: config.delay_ms || 2000,
      timeout_ms: config.timeout_ms || 30000,
      user_agent: config.user_agent || 'Resilion-Enrichment-Bot/1.0',
      respect_robots_txt: config.respect_robots_txt !== false, // default true
    };
  }

  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
  }

  async crawlDomain(domain: string): Promise<CrawledPage[]> {
    await this.initialize();
    
    if (!this.browser) {
      throw new Error('Failed to initialize browser');
    }

    const crawledPages: CrawledPage[] = [];
    const visitedUrls = new Set<string>();
    const urlsToVisit: string[] = [];

    // Start with the main domain
    const baseUrl = domain.startsWith('http') ? domain : `https://${domain}`;
    urlsToVisit.push(baseUrl);

    // Check robots.txt if configured
    if (this.config.respect_robots_txt) {
      const robotsAllowed = await this.checkRobotsTxt(baseUrl);
      if (!robotsAllowed) {
        console.warn(`Robots.txt disallows crawling for ${domain}`);
        return [];
      }
    }

    const page = await this.browser.newPage();
    
    try {
      // Set user agent
      await page.setUserAgent(this.config.user_agent);
      
      // Set viewport
      await page.setViewport({ width: 1280, height: 800 });

      // Set timeout
      page.setDefaultTimeout(this.config.timeout_ms);

      while (urlsToVisit.length > 0 && crawledPages.length < this.config.max_pages) {
        const currentUrl = urlsToVisit.shift()!;
        
        if (visitedUrls.has(currentUrl)) {
          continue;
        }

        visitedUrls.add(currentUrl);

        try {
          console.log(`Crawling: ${currentUrl}`);
          
          const response = await page.goto(currentUrl, { 
            waitUntil: 'networkidle2',
            timeout: this.config.timeout_ms 
          });

          if (!response || response.status() >= 400) {
            console.warn(`Failed to load ${currentUrl}: ${response?.status()}`);
            continue;
          }

          // Extract page content
          const pageData = await page.evaluate(() => {
            // Remove script and style elements
            const scripts = document.querySelectorAll('script, style, nav, footer, header');
            scripts.forEach(el => el.remove());

            // Get main content
            const mainContent = document.querySelector('main') || 
                               document.querySelector('[role="main"]') || 
                               document.querySelector('.content') ||
                               document.querySelector('#content') ||
                               document.body;

            const title = document.title || '';
            const content = mainContent?.innerText || document.body.innerText || '';

            return {
              title: title.trim(),
              content: content.trim(),
              url: window.location.href
            };
          });

          // Only include pages with substantial content
          if (pageData.content.length > 200) {
            const crawledPage: CrawledPage = {
              url: currentUrl,
              title: pageData.title,
              content: pageData.content,
              metadata: {
                crawled_at: new Date().toISOString(),
                status_code: response.status(),
                content_type: response.headers()['content-type'] || 'text/html',
                word_count: pageData.content.split(/\s+/).length
              }
            };

            crawledPages.push(crawledPage);
          }

          // Extract additional URLs from the same domain
          if (crawledPages.length < this.config.max_pages) {
            const newUrls = await page.evaluate((baseDomain) => {
              const links = Array.from(document.querySelectorAll('a[href]'));
              return links
                .map(link => (link as HTMLAnchorElement).href)
                .filter(href => {
                  try {
                    const url = new URL(href);
                    return url.hostname === baseDomain || url.hostname === `www.${baseDomain}`;
                  } catch {
                    return false;
                  }
                })
                .slice(0, 5); // Limit new URLs per page
            }, new URL(baseUrl).hostname);

            // Add new URLs to visit
            newUrls.forEach(url => {
              if (!visitedUrls.has(url) && !urlsToVisit.includes(url)) {
                urlsToVisit.push(url);
              }
            });
          }

          // Respect delay between requests
          if (this.config.delay_ms > 0) {
            await new Promise(resolve => setTimeout(resolve, this.config.delay_ms));
          }

        } catch (error) {
          console.error(`Error crawling ${currentUrl}:`, error);
          continue;
        }
      }

    } finally {
      await page.close();
    }

    console.log(`Crawled ${crawledPages.length} pages from ${domain}`);
    return crawledPages;
  }

  private async checkRobotsTxt(baseUrl: string): Promise<boolean> {
    try {
      const robotsUrl = new URL('/robots.txt', baseUrl).toString();
      const page = await this.browser!.newPage();
      
      try {
        const response = await page.goto(robotsUrl, { timeout: 10000 });
        
        if (!response || response.status() !== 200) {
          // No robots.txt found, assume allowed
          return true;
        }

        const robotsContent = await page.content();
        const robotsText = await page.evaluate(() => document.body.textContent || '');

        // Simple robots.txt parsing - look for disallow rules for our user agent
        const lines = robotsText.split('\n').map(line => line.trim().toLowerCase());
        let currentUserAgent = '';
        let disallowed = false;

        for (const line of lines) {
          if (line.startsWith('user-agent:')) {
            currentUserAgent = line.split(':')[1].trim();
          } else if (line.startsWith('disallow:') && 
                    (currentUserAgent === '*' || currentUserAgent.includes('resilion'))) {
            const disallowPath = line.split(':')[1].trim();
            if (disallowPath === '/' || disallowPath === '') {
              disallowed = true;
              break;
            }
          }
        }

        return !disallowed;

      } finally {
        await page.close();
      }

    } catch (error) {
      console.warn('Error checking robots.txt:', error);
      // If we can't check robots.txt, assume allowed
      return true;
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
