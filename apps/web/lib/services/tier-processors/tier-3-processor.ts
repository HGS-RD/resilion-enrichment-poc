/**
 * Tier 3 Processor
 * 
 * Implements Tier 3 enrichment using news articles from Bing News Search API
 * to extract additional company and site information.
 */

import { TierProcessor, TierProcessingResult } from '../enrichment-chaining-engine';
import { EnrichmentContext, EnrichmentFact } from '../../types/enrichment';
import { BingNewsClient, NewsArticle } from '../bing-news-client';
import { LLMFinancialDataExtractor } from '../financial-data-extractor';

export class Tier3Processor implements TierProcessor {
  tier = 3;
  name = 'Tier 3: News Articles';

  private newsClient: BingNewsClient;
  private extractor: LLMFinancialDataExtractor;

  constructor() {
    this.newsClient = new BingNewsClient({
      maxArticles: 5,
      freshness: 'Month',
      market: 'en-US'
    });

    this.extractor = new LLMFinancialDataExtractor();
  }

  canHandle(context: EnrichmentContext): boolean {
    return !!context.job.domain;
  }

  async execute(context: EnrichmentContext): Promise<TierProcessingResult> {
    const startTime = Date.now();
    const sourcesAttempted: string[] = [];
    const allFacts: EnrichmentFact[] = [];

    console.log(`Starting Tier 3 processing for domain: ${context.job.domain}`);

    try {
      // Step 1: Search for news articles
      console.log('Step 1: Searching for news articles...');
      sourcesAttempted.push('Bing News Search API');
      
      const newsResult = await this.newsClient.searchCompanyNews(context.job.domain);
      console.log(`Found ${newsResult.articles.length} news articles`);

      if (newsResult.articles.length === 0) {
        console.log('No news articles found, returning empty result');
        return {
          tier: this.tier,
          facts: [],
          sources_attempted: sourcesAttempted,
          pages_scraped: 0,
          runtime_seconds: Math.floor((Date.now() - startTime) / 1000),
          status: 'completed',
          average_confidence: 0
        };
      }

      // Step 2: Filter and sort articles by relevance
      const relevantArticles = this.newsClient.filterByRelevance(newsResult.articles, 0.6);
      const sortedArticles = this.newsClient.sortArticles(relevantArticles);
      
      console.log(`Processing ${sortedArticles.length} relevant articles`);

      // Step 3: Process each article
      for (const article of sortedArticles) {
        try {
          sourcesAttempted.push(article.source.name);
          
          const facts = await this.extractFactsFromArticle(article, context.job.id);
          allFacts.push(...facts);
          
          console.log(`Extracted ${facts.length} facts from article: ${article.title.substring(0, 50)}...`);
          
        } catch (error) {
          console.error(`Error processing article ${article.id}:`, error);
        }
      }

      // Step 4: Calculate confidence and determine status
      const averageConfidence = allFacts.length > 0 
        ? allFacts.reduce((sum, fact) => sum + fact.confidence_score, 0) / allFacts.length 
        : 0;

      const runtimeSeconds = Math.floor((Date.now() - startTime) / 1000);
      
      let status: 'completed' | 'partial' | 'failed' | 'timeout' = 'completed';
      
      if (allFacts.length === 0) {
        status = 'partial'; // News articles might not always yield facts
      } else if (averageConfidence < 0.4) {
        status = 'partial'; // Lower threshold for news articles
      }

      console.log(`Tier 3 completed: ${allFacts.length} facts, confidence: ${averageConfidence.toFixed(3)}, status: ${status}`);

      return {
        tier: this.tier,
        facts: allFacts,
        sources_attempted: sourcesAttempted,
        pages_scraped: sortedArticles.length,
        runtime_seconds: runtimeSeconds,
        status,
        average_confidence: averageConfidence
      };

    } catch (error) {
      console.error('Error in Tier 3 processing:', error);
      
      return {
        tier: this.tier,
        facts: allFacts,
        sources_attempted: sourcesAttempted,
        pages_scraped: 0,
        runtime_seconds: Math.floor((Date.now() - startTime) / 1000),
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error),
        average_confidence: 0
      };
    }
  }

  /**
   * Extract facts from a news article
   */
  private async extractFactsFromArticle(article: NewsArticle, jobId: string): Promise<EnrichmentFact[]> {
    try {
      // Get full article content
      const content = await this.newsClient.fetchArticleContent(article);
      
      if (!content || content.length < 100) {
        console.log(`Article ${article.id} has insufficient content, skipping`);
        return [];
      }

      // Use the financial data extractor to process the article
      const extractionResult = await this.extractor.extractFacts([{
        section_name: 'News Article',
        section_type: 'business_description',
        content: content,
        confidence_score: article.relevanceScore,
        extraction_method: 'llm'
      }]);

      // Convert financial facts to enrichment facts with news-specific adjustments
      const enrichmentFacts: EnrichmentFact[] = extractionResult.extracted_facts.map(financialFact => {
        // Adjust confidence based on article relevance and source reputation
        let adjustedConfidence = financialFact.confidence_score * article.relevanceScore;
        
        // Boost confidence for reputable news sources
        const reputableSources = ['Reuters', 'Bloomberg', 'Wall Street Journal', 'Associated Press'];
        if (reputableSources.some(source => article.source.name.includes(source))) {
          adjustedConfidence = Math.min(adjustedConfidence * 1.2, 1.0);
        }

        // Reduce confidence for older articles
        const articleAge = Date.now() - new Date(article.publishedAt).getTime();
        const daysSincePublished = articleAge / (1000 * 60 * 60 * 24);
        if (daysSincePublished > 30) {
          adjustedConfidence *= 0.9;
        }

        return {
          id: `tier3_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          job_id: jobId,
          fact_type: this.mapNewsFactType(financialFact.fact_type),
          fact_data: {
            value: financialFact.value,
            unit: financialFact.unit,
            period: financialFact.period,
            extraction_method: financialFact.extraction_method,
            original_fact_type: financialFact.fact_type,
            article_title: article.title,
            article_date: article.publishedAt,
            news_source: article.source.name,
            article_category: article.category
          },
          confidence_score: adjustedConfidence,
          source_url: article.url,
          source_text: financialFact.source_text,
          created_at: new Date().toISOString(),
          validated: false,
          tier_used: 3
        };
      });

      return enrichmentFacts;

    } catch (error) {
      console.error(`Error extracting facts from article ${article.id}:`, error);
      return [];
    }
  }

  /**
   * Map financial fact types to news-specific enrichment fact types
   */
  private mapNewsFactType(financialFactType: string): string {
    const mapping: Record<string, string> = {
      'facility_name': 'news_facility_name',
      'facility_address': 'news_facility_address',
      'facility_type': 'news_facility_type',
      'production_capacity': 'news_production_capacity',
      'employee_count': 'news_employee_count',
      'geographic_segment': 'news_geographic_segment',
      'business_segment': 'news_business_segment',
      'subsidiary_name': 'news_subsidiary',
      'subsidiary_location': 'news_subsidiary_location',
      'major_product': 'news_major_product',
      'regulatory_id': 'news_regulatory_id',
      'certification': 'news_certification',
      'operating_status': 'news_operating_status',
      'company_name': 'news_company_name',
      'headquarters_address': 'news_headquarters_address',
      'industry_sector': 'news_industry_sector',
      // News-specific fact types
      'expansion_plan': 'news_expansion_plan',
      'investment_announcement': 'news_investment',
      'partnership': 'news_partnership',
      'acquisition': 'news_acquisition',
      'regulatory_approval': 'news_regulatory_approval',
      'environmental_initiative': 'news_environmental_initiative',
      'technology_adoption': 'news_technology_adoption',
      'market_expansion': 'news_market_expansion'
    };

    return mapping[financialFactType] || `news_${financialFactType}`;
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    articlesProcessed: number;
    averageProcessingTime: number;
    successRate: number;
  } {
    // This would be implemented with actual tracking in a production system
    return {
      articlesProcessed: 0,
      averageProcessingTime: 0,
      successRate: 0
    };
  }
}
