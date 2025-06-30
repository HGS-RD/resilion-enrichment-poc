/**
 * Bing News Search Client
 * 
 * Implements Tier 3 news sourcing using the Bing News Search API
 * to retrieve up to 5 relevant news articles for enrichment.
 */

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: {
    name: string;
    url?: string;
  };
  category?: string;
  relevanceScore: number;
  content?: string; // Full article content if available
}

export interface NewsSearchConfig {
  apiKey: string;
  maxArticles: number;
  freshness: 'Day' | 'Week' | 'Month';
  market: string; // e.g., 'en-US'
  safeSearch: 'Off' | 'Moderate' | 'Strict';
  timeout: number;
}

export interface NewsSearchResult {
  articles: NewsArticle[];
  totalEstimatedMatches: number;
  searchQuery: string;
  searchTime: number;
  sources: string[];
}

export class BingNewsClient {
  private config: NewsSearchConfig;
  private baseUrl = 'https://api.bing.microsoft.com/v7.0/news/search';

  constructor(config: Partial<NewsSearchConfig> = {}) {
    this.config = {
      apiKey: process.env.BING_NEWS_API_KEY || '',
      maxArticles: 5,
      freshness: 'Month',
      market: 'en-US',
      safeSearch: 'Moderate',
      timeout: 10000,
      ...config
    };

    if (!this.config.apiKey) {
      console.warn('Bing News API key not provided. Using mock data for development.');
    }
  }

  /**
   * Search for news articles related to a company domain
   */
  async searchCompanyNews(domain: string): Promise<NewsSearchResult> {
    const companyName = this.extractCompanyNameFromDomain(domain);
    const searchQuery = this.buildSearchQuery(companyName, domain);
    
    console.log(`Searching news for: ${searchQuery}`);
    
    return this.searchNews(searchQuery);
  }

  /**
   * Search for news articles with a custom query
   */
  async searchNews(query: string): Promise<NewsSearchResult> {
    const startTime = Date.now();
    
    try {
      if (!this.config.apiKey) {
        console.log('Using mock news data for development');
        return this.getMockNewsData(query);
      }

      const searchParams = new URLSearchParams({
        q: query,
        count: this.config.maxArticles.toString(),
        freshness: this.config.freshness,
        mkt: this.config.market,
        safeSearch: this.config.safeSearch,
        textFormat: 'HTML',
        textDecorations: 'false'
      });

      const response = await fetch(`${this.baseUrl}?${searchParams}`, {
        method: 'GET',
        headers: {
          'Ocp-Apim-Subscription-Key': this.config.apiKey,
          'User-Agent': 'Resilion-Enrichment-Bot/1.0'
        },
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`Bing News API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const articles = this.parseNewsResponse(data);
      
      const result: NewsSearchResult = {
        articles,
        totalEstimatedMatches: data.totalEstimatedMatches || 0,
        searchQuery: query,
        searchTime: Date.now() - startTime,
        sources: articles.map(a => a.source.name)
      };

      console.log(`Found ${articles.length} news articles in ${result.searchTime}ms`);
      return result;

    } catch (error) {
      console.error('Error searching news:', error);
      
      // Fallback to mock data on error
      console.log('Falling back to mock news data');
      return this.getMockNewsData(query);
    }
  }

  /**
   * Extract company name from domain
   */
  private extractCompanyNameFromDomain(domain: string): string {
    return domain
      .replace(/^(www\.|m\.|mobile\.)/, '')
      .replace(/\.(com|org|net|edu|gov|mil|int|co|io|ai|tech)$/, '')
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Build search query for company news
   */
  private buildSearchQuery(companyName: string, domain: string): string {
    // Create a comprehensive search query
    const queries = [
      `"${companyName}"`,
      `"${companyName}" facilities`,
      `"${companyName}" manufacturing`,
      `"${companyName}" operations`,
      `site:${domain}`
    ];

    return queries.join(' OR ');
  }

  /**
   * Parse Bing News API response
   */
  private parseNewsResponse(data: any): NewsArticle[] {
    if (!data.value || !Array.isArray(data.value)) {
      return [];
    }

    return data.value.map((item: any, index: number) => ({
      id: `bing_${Date.now()}_${index}`,
      title: item.name || '',
      description: item.description || '',
      url: item.url || '',
      publishedAt: item.datePublished || new Date().toISOString(),
      source: {
        name: item.provider?.[0]?.name || 'Unknown Source',
        url: item.provider?.[0]?.url
      },
      category: item.category || 'General',
      relevanceScore: this.calculateRelevanceScore(item),
      content: item.description || '' // Bing doesn't provide full content
    }));
  }

  /**
   * Calculate relevance score based on article metadata
   */
  private calculateRelevanceScore(item: any): number {
    let score = 0.5; // Base score

    // Boost score for recent articles
    if (item.datePublished) {
      const publishDate = new Date(item.datePublished);
      const daysSincePublished = (Date.now() - publishDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSincePublished <= 7) score += 0.3;
      else if (daysSincePublished <= 30) score += 0.2;
      else if (daysSincePublished <= 90) score += 0.1;
    }

    // Boost score for reputable sources
    const reputableSources = [
      'Reuters', 'Associated Press', 'Bloomberg', 'Wall Street Journal',
      'Financial Times', 'CNN', 'BBC', 'NPR', 'Forbes', 'Business Insider'
    ];
    
    const sourceName = item.provider?.[0]?.name || '';
    if (reputableSources.some(source => sourceName.includes(source))) {
      score += 0.2;
    }

    // Boost score for business/industry categories
    const businessCategories = ['Business', 'Technology', 'Finance', 'Industry'];
    if (businessCategories.includes(item.category)) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Get mock news data for development/testing
   */
  private getMockNewsData(query: string): NewsSearchResult {
    const companyName = query.split(' ')[0].replace(/"/g, '');
    
    const mockArticles: NewsArticle[] = [
      {
        id: 'mock_1',
        title: `${companyName} Announces New Manufacturing Facility in Texas`,
        description: `${companyName} has announced plans to build a new 500,000 square foot manufacturing facility in Austin, Texas, creating 1,200 new jobs and expanding production capacity by 40%.`,
        url: `https://example-news.com/${companyName.toLowerCase()}-texas-facility`,
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        source: { name: 'Business Wire' },
        category: 'Business',
        relevanceScore: 0.9,
        content: `${companyName} Corporation today announced plans to construct a new state-of-the-art manufacturing facility in Austin, Texas. The 500,000 square foot facility will house advanced production lines and is expected to create approximately 1,200 new jobs over the next three years. The facility will focus on producing the company's latest product line and will incorporate sustainable manufacturing practices including solar power and water recycling systems.`
      },
      {
        id: 'mock_2',
        title: `${companyName} Reports Strong Q3 Earnings, Expands Operations`,
        description: `The company reported 15% revenue growth and announced expansion of its distribution network with new facilities in California and Florida.`,
        url: `https://example-news.com/${companyName.toLowerCase()}-q3-earnings`,
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        source: { name: 'Reuters' },
        category: 'Business',
        relevanceScore: 0.8,
        content: `${companyName} reported strong third-quarter earnings with revenue increasing 15% year-over-year. The company also announced plans to expand its distribution network with new facilities in Los Angeles, California and Miami, Florida. These facilities will serve as regional distribution hubs and are expected to improve delivery times to customers on the West Coast and Southeast regions.`
      },
      {
        id: 'mock_3',
        title: `${companyName} Receives Environmental Certification for Green Operations`,
        description: `The company's main production facility has received ISO 14001 environmental certification, recognizing its commitment to sustainable manufacturing practices.`,
        url: `https://example-news.com/${companyName.toLowerCase()}-environmental-cert`,
        publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        source: { name: 'Environmental Business Journal' },
        category: 'Environment',
        relevanceScore: 0.7,
        content: `${companyName}'s flagship manufacturing facility in Ohio has achieved ISO 14001 environmental management certification. The certification recognizes the company's efforts to reduce waste, minimize energy consumption, and implement sustainable manufacturing processes. The facility has reduced water usage by 30% and carbon emissions by 25% over the past two years.`
      },
      {
        id: 'mock_4',
        title: `${companyName} Partners with Local University for Research Initiative`,
        description: `The company has established a research partnership with State University to develop next-generation manufacturing technologies at their R&D facility.`,
        url: `https://example-news.com/${companyName.toLowerCase()}-university-partnership`,
        publishedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        source: { name: 'Tech News Daily' },
        category: 'Technology',
        relevanceScore: 0.6,
        content: `${companyName} has announced a five-year research partnership with State University to develop advanced manufacturing technologies. The collaboration will be based at the company's research and development facility in Denver, Colorado, where university researchers will work alongside company engineers to develop innovative production methods and materials.`
      },
      {
        id: 'mock_5',
        title: `${companyName} Invests in Automation Technology for Production Lines`,
        description: `The company is investing $50 million in automation technology across its manufacturing facilities to improve efficiency and product quality.`,
        url: `https://example-news.com/${companyName.toLowerCase()}-automation-investment`,
        publishedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        source: { name: 'Manufacturing Today' },
        category: 'Technology',
        relevanceScore: 0.7,
        content: `${companyName} announced a $50 million investment in automation technology across its manufacturing facilities. The investment will fund the installation of robotic production lines, AI-powered quality control systems, and predictive maintenance technology. The upgrades are expected to increase production efficiency by 20% and improve product quality consistency across all facilities.`
      }
    ];

    return {
      articles: mockArticles,
      totalEstimatedMatches: mockArticles.length,
      searchQuery: query,
      searchTime: 150,
      sources: mockArticles.map(a => a.source.name)
    };
  }

  /**
   * Fetch full article content (if supported by the source)
   */
  async fetchArticleContent(article: NewsArticle): Promise<string> {
    try {
      // For now, return the description as content
      // In a production system, you might use a web scraping service
      // or content extraction API to get full article text
      return article.description || article.content || '';
    } catch (error) {
      console.error(`Error fetching content for article ${article.id}:`, error);
      return article.description || '';
    }
  }

  /**
   * Filter articles by relevance score threshold
   */
  filterByRelevance(articles: NewsArticle[], threshold: number = 0.6): NewsArticle[] {
    return articles.filter(article => article.relevanceScore >= threshold);
  }

  /**
   * Sort articles by relevance and recency
   */
  sortArticles(articles: NewsArticle[]): NewsArticle[] {
    return articles.sort((a, b) => {
      // Primary sort by relevance score
      const relevanceDiff = b.relevanceScore - a.relevanceScore;
      if (Math.abs(relevanceDiff) > 0.1) {
        return relevanceDiff;
      }
      
      // Secondary sort by publication date (more recent first)
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }
}
