import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebCrawlerStep } from '../../../../apps/web/lib/services/steps/web-crawler-step';
import { EnrichmentContext } from '../../../../apps/web/lib/types/enrichment';
import { createMockJob } from '../../../__fixtures__/test-data';

// Mock domain validator
vi.mock('../../../../apps/web/lib/utils/domain-validator', () => ({
  generateCrawlUrl: vi.fn((domain: string) => `https://${domain}`),
  isDomainCrawlable: vi.fn(() => true)
}));

describe('WebCrawlerStep', () => {
  let crawlerStep: WebCrawlerStep;
  let mockJobRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockJobRepository = {
      updateStepStatus: vi.fn().mockResolvedValue(undefined),
      updateProgress: vi.fn().mockResolvedValue(undefined)
    };
    
    crawlerStep = new WebCrawlerStep(mockJobRepository);
    
    // Mock global fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('canHandle', () => {
    it('should return true for jobs with non-completed crawling status', () => {
      const context: EnrichmentContext = {
        job: createMockJob({
          crawling_status: 'pending'
        })
      };

      expect(crawlerStep.canHandle(context)).toBe(true);
    });

    it('should return false for jobs with completed crawling status', () => {
      const context: EnrichmentContext = {
        job: createMockJob({
          crawling_status: 'completed'
        })
      };

      expect(crawlerStep.canHandle(context)).toBe(false);
    });
  });

  describe('execute', () => {
    it('should successfully crawl a domain and return pages', async () => {
      const mockJob = createMockJob({
        domain: 'example.com',
        crawling_status: 'pending'
      });

      const context: EnrichmentContext = {
        job: mockJob
      };

      // Mock successful HTTP response
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('text/html; charset=utf-8')
        },
        text: vi.fn().mockResolvedValue(`
          <html>
            <head><title>Example Company</title></head>
            <body>
              <h1>About Example Company</h1>
              <p>We are a leading manufacturer of widgets.</p>
              <div class="contact">
                <p>Location: 123 Main St, Anytown, USA</p>
                <p>Phone: (555) 123-4567</p>
              </div>
            </body>
          </html>
        `)
      });

      const result = await crawlerStep.execute(context);

      expect(result.crawled_pages).toBeDefined();
      expect(result.crawled_pages!.length).toBeGreaterThan(0);
      expect(result.crawled_pages![0].url).toBe('https://example.com');
      expect(result.crawled_pages![0].title).toBe('Example Company');
      expect(result.crawled_pages![0].content).toContain('About Example Company');
      expect(result.crawled_pages![0].metadata.status_code).toBe(200);
      expect(result.crawled_pages![0].metadata.word_count).toBeGreaterThan(0);
      
      // Verify repository calls
      expect(mockJobRepository.updateStepStatus).toHaveBeenCalledWith(mockJob.id, 'crawling_status', 'running');
      expect(mockJobRepository.updateStepStatus).toHaveBeenCalledWith(mockJob.id, 'crawling_status', 'completed');
      expect(mockJobRepository.updateProgress).toHaveBeenCalled();
    });

    it('should handle crawling errors gracefully', async () => {
      const mockJob = createMockJob({
        domain: 'unreachable-domain.com',
        crawling_status: 'pending'
      });

      const context: EnrichmentContext = {
        job: mockJob
      };

      // Mock fetch error
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await crawlerStep.execute(context);

      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('Network error');
      expect(mockJobRepository.updateStepStatus).toHaveBeenCalledWith(mockJob.id, 'crawling_status', 'failed');
    });

    it('should handle non-crawlable domains', async () => {
      const { isDomainCrawlable } = require('../../../../apps/web/lib/utils/domain-validator');
      isDomainCrawlable.mockReturnValue(false);

      const mockJob = createMockJob({
        domain: 'blocked-domain.com',
        crawling_status: 'pending'
      });

      const context: EnrichmentContext = {
        job: mockJob
      };

      const result = await crawlerStep.execute(context);

      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('not crawlable');
      expect(mockJobRepository.updateStepStatus).toHaveBeenCalledWith(mockJob.id, 'crawling_status', 'failed');
    });

    it('should respect robots.txt when configured', async () => {
      // Set environment variable to enable robots.txt checking
      process.env.CRAWLER_RESPECT_ROBOTS = 'true';
      
      const crawlerStepWithRobots = new WebCrawlerStep(mockJobRepository);

      const mockJob = createMockJob({
        domain: 'example.com',
        crawling_status: 'pending'
      });

      const context: EnrichmentContext = {
        job: mockJob
      };

      // Mock robots.txt response (disallow all)
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('User-agent: *\nDisallow: /')
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: {
            get: vi.fn().mockReturnValue('text/html')
          },
          text: vi.fn().mockResolvedValue('<html><body>Content</body></html>')
        });

      const result = await crawlerStepWithRobots.execute(context);

      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('not allowed by robots.txt');
      
      // Clean up
      delete process.env.CRAWLER_RESPECT_ROBOTS;
    });

    it('should extract clean text content from HTML', async () => {
      const mockJob = createMockJob({
        domain: 'example.com',
        crawling_status: 'pending'
      });

      const context: EnrichmentContext = {
        job: mockJob
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('text/html')
        },
        text: vi.fn().mockResolvedValue(`
          <html>
            <head>
              <title>Test Page</title>
              <script>console.log('test');</script>
              <style>body { color: red; }</style>
            </head>
            <body>
              <nav>Navigation</nav>
              <main>
                <h1>Main Content</h1>
                <p>This is the main content of the page.</p>
                <div class="sidebar">Sidebar content</div>
              </main>
              <footer>Footer content</footer>
            </body>
          </html>
        `)
      });

      const result = await crawlerStep.execute(context);

      expect(result.crawled_pages).toBeDefined();
      const page = result.crawled_pages![0];
      
      // Should extract clean text without scripts, styles, nav, footer
      expect(page.content).toContain('Main Content');
      expect(page.content).toContain('This is the main content');
      expect(page.content).not.toContain('console.log');
      expect(page.content).not.toContain('color: red');
      expect(page.content).not.toContain('Navigation');
      expect(page.content).not.toContain('Footer content');
    });

    it('should handle pages with no content', async () => {
      const mockJob = createMockJob({
        domain: 'example.com',
        crawling_status: 'pending'
      });

      const context: EnrichmentContext = {
        job: mockJob
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('text/html')
        },
        text: vi.fn().mockResolvedValue('<html><head><title>Empty Page</title></head><body></body></html>')
      });

      const result = await crawlerStep.execute(context);

      expect(result.crawled_pages).toBeDefined();
      expect(result.crawled_pages![0].content.trim()).toBe('');
      expect(result.crawled_pages![0].metadata.word_count).toBe(0);
    });

    it('should handle HTTP errors', async () => {
      const mockJob = createMockJob({
        domain: 'example.com',
        crawling_status: 'pending'
      });

      const context: EnrichmentContext = {
        job: mockJob
      };

      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      const result = await crawlerStep.execute(context);

      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('HTTP 404');
    });

    it('should skip non-HTML content', async () => {
      const mockJob = createMockJob({
        domain: 'example.com',
        crawling_status: 'pending'
      });

      const context: EnrichmentContext = {
        job: mockJob
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: vi.fn().mockReturnValue('application/pdf')
        },
        text: vi.fn().mockResolvedValue('PDF content')
      });

      const result = await crawlerStep.execute(context);

      expect(result.crawled_pages).toBeDefined();
      expect(result.crawled_pages!.length).toBe(0); // Should skip non-HTML content
    });

    it('should handle request timeout', async () => {
      const mockJob = createMockJob({
        domain: 'example.com',
        crawling_status: 'pending'
      });

      const context: EnrichmentContext = {
        job: mockJob
      };

      // Mock timeout error
      const abortError = new Error('Request timeout');
      abortError.name = 'AbortError';
      (global.fetch as any).mockRejectedValue(abortError);

      const result = await crawlerStep.execute(context);

      expect(result.error).toBeDefined();
      expect(result.error!.message).toContain('Request timeout');
    });
  });

  describe('name', () => {
    it('should return correct step name', () => {
      expect(crawlerStep.name).toBe('WebCrawler');
    });
  });
});
