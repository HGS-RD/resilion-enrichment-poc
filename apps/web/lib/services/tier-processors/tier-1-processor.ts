/**
 * Tier 1 Processor - Corporate Website + Financial Reports
 * 
 * Handles the primary data sources for enrichment:
 * - Corporate website crawling and analysis
 * - Financial reports and SEC filings
 * - Official company documentation
 */

import { EnrichmentContext, EnrichmentFact } from '../../types/enrichment';
import { TierProcessor, TierProcessingResult } from '../unified-enrichment-orchestrator';
import { JobRepository } from '../../repositories/job-repository';
import { WebCrawlerStep } from '../steps/web-crawler-step';
import { TextChunkingStep } from '../steps/text-chunking-step';
import { EmbeddingStep } from '../steps/embedding-step';
import { FactExtractionStep } from '../steps/fact-extraction-step';

export class Tier1Processor implements TierProcessor {
  public readonly tier = 1;
  public readonly name = 'Corporate Website + Financial Reports';
  
  private jobRepo: JobRepository;
  private webCrawlerStep: WebCrawlerStep;
  private textChunkingStep: TextChunkingStep;
  private embeddingStep: EmbeddingStep;
  private factExtractionStep: FactExtractionStep;

  constructor(jobRepository: JobRepository) {
    this.jobRepo = jobRepository;
    this.webCrawlerStep = new WebCrawlerStep(jobRepository);
    this.textChunkingStep = new TextChunkingStep(jobRepository);
    this.embeddingStep = new EmbeddingStep(jobRepository);
    this.factExtractionStep = new FactExtractionStep(jobRepository);
  }

  /**
   * Check if this processor can handle the given context
   */
  canHandle(context: EnrichmentContext): boolean {
    // Tier 1 can always handle any domain - it's the primary processor
    return true;
  }

  /**
   * Execute Tier 1 processing
   */
  async execute(context: EnrichmentContext): Promise<TierProcessingResult> {
    const startTime = Date.now();
    const jobId = context.job.id;
    const domain = context.job.domain;
    
    console.log(`Starting Tier 1 processing for job ${jobId}, domain: ${domain}`);
    
    let facts: EnrichmentFact[] = [];
    let sourcesAttempted: string[] = [];
    let pagesScraped = 0;
    let status: 'completed' | 'partial' | 'failed' | 'timeout' = 'failed';
    let errorMessage: string | undefined;

    try {
      // Step 1: Web Crawling
      console.log(`Tier 1: Starting web crawling for ${domain}`);
      const crawlResult = await this.webCrawlerStep.execute(context);
      
      if (!crawlResult.error) {
        pagesScraped = crawlResult.crawled_pages?.length || 0;
        sourcesAttempted.push(`https://${domain}`);
        
        // Update context with crawl results
        context = crawlResult;
        
        console.log(`Tier 1: Web crawling completed. Pages: ${pagesScraped}`);
        
        // Step 2: Text Chunking
        console.log(`Tier 1: Starting text chunking`);
        const chunkResult = await this.textChunkingStep.execute(context);
        
        if (!chunkResult.error) {
          context = chunkResult;
          const chunksCreated = chunkResult.text_chunks?.length || 0;
          
          console.log(`Tier 1: Text chunking completed. Chunks: ${chunksCreated}`);
          
          // Step 3: Embedding Generation
          console.log(`Tier 1: Starting embedding generation`);
          const embeddingResult = await this.embeddingStep.execute(context);
          
          if (!embeddingResult.error) {
            context = embeddingResult;
            const embeddingsGenerated = context.embeddings?.length || 0;
            
            console.log(`Tier 1: Embedding generation completed. Embeddings: ${embeddingsGenerated}`);
            
            // Step 4: Fact Extraction
            console.log(`Tier 1: Starting fact extraction`);
            const extractionResult = await this.factExtractionStep.execute(context);
            
            if (!extractionResult.error) {
              facts = extractionResult.extracted_facts || [];
              context = extractionResult;
              
              console.log(`Tier 1: Fact extraction completed. Facts: ${facts.length}`);
              
              // Determine overall status
              if (facts.length > 0) {
                status = 'completed';
              } else {
                status = 'partial';
                errorMessage = 'No facts extracted despite successful processing';
              }
            } else {
              status = 'partial';
              errorMessage = `Fact extraction failed: ${extractionResult.error?.message}`;
            }
          } else {
            status = 'partial';
            errorMessage = `Embedding generation failed: ${embeddingResult.error?.message}`;
          }
        } else {
          status = 'partial';
          errorMessage = `Text chunking failed: ${chunkResult.error?.message}`;
        }
      } else {
        status = 'failed';
        errorMessage = `Web crawling failed: ${crawlResult.error?.message}`;
      }
      
    } catch (error) {
      console.error(`Tier 1 processing error for job ${jobId}:`, error);
      status = 'failed';
      errorMessage = error instanceof Error ? error.message : 'Unknown error in Tier 1 processing';
    }

    // Calculate average confidence
    const averageConfidence = facts.length > 0 
      ? facts.reduce((sum, fact) => sum + fact.confidence_score, 0) / facts.length 
      : 0;

    const runtimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    const result: TierProcessingResult = {
      tier: this.tier,
      facts,
      sources_attempted: sourcesAttempted,
      pages_scraped: pagesScraped,
      runtime_seconds: runtimeSeconds,
      status,
      error_message: errorMessage,
      average_confidence: averageConfidence
    };

    console.log(`Tier 1 processing completed for job ${jobId}:`);
    console.log(`- Status: ${status}`);
    console.log(`- Facts extracted: ${facts.length}`);
    console.log(`- Pages scraped: ${pagesScraped}`);
    console.log(`- Average confidence: ${averageConfidence.toFixed(3)}`);
    console.log(`- Runtime: ${runtimeSeconds}s`);

    return result;
  }

  /**
   * Get processor capabilities and configuration
   */
  getCapabilities(): {
    name: string;
    tier: number;
    data_sources: string[];
    expected_fact_types: string[];
    confidence_range: { min: number; max: number };
  } {
    return {
      name: this.name,
      tier: this.tier,
      data_sources: [
        'Corporate Website',
        'About Us Pages',
        'Contact Information',
        'Product/Service Pages',
        'News/Press Releases',
        'Investor Relations',
        'SEC Filings (if available)'
      ],
      expected_fact_types: [
        'company_name',
        'headquarters_address',
        'industry_sector',
        'business_description',
        'key_products',
        'contact_information',
        'executive_leadership',
        'company_size',
        'founding_date',
        'stock_symbol'
      ],
      confidence_range: {
        min: 0.6,
        max: 0.95
      }
    };
  }

  /**
   * Health check for Tier 1 processor
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      web_crawler: 'healthy' | 'unhealthy';
      text_chunking: 'healthy' | 'unhealthy';
      embeddings: 'healthy' | 'unhealthy';
      fact_extraction: 'healthy' | 'unhealthy';
    };
    last_successful_run?: Date;
  }> {
    try {
      // Basic health checks for each component
      const components = {
        web_crawler: 'healthy' as const,
        text_chunking: 'healthy' as const,
        embeddings: 'healthy' as const,
        fact_extraction: 'healthy' as const
      };

      // TODO: Add actual health checks for each step
      // For now, assume all components are healthy

      return {
        status: 'healthy',
        components,
        last_successful_run: new Date()
      };

    } catch (error) {
      console.error('Tier 1 health check failed:', error);
      return {
        status: 'unhealthy',
        components: {
          web_crawler: 'unhealthy',
          text_chunking: 'unhealthy',
          embeddings: 'unhealthy',
          fact_extraction: 'unhealthy'
        }
      };
    }
  }
}
