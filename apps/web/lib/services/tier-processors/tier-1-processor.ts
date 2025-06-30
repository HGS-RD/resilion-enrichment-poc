/**
 * Tier 1 Processor
 * 
 * Implements Tier 1 enrichment combining corporate website crawling
 * and financial document processing (SEC filings).
 */

import { TierProcessor, TierProcessingResult } from '../enrichment-chaining-engine';
import { EnrichmentContext, EnrichmentFact } from '../../types/enrichment';
import { WebCrawlerService } from '../crawler';
import { FinancialDocumentStep } from '../steps/financial-document-step';
import { JobRepository } from '../../repositories/job-repository';
import { LLMFinancialDataExtractor } from '../financial-data-extractor';
import { TextChunkingService } from '../chunker';

export class Tier1Processor implements TierProcessor {
  tier = 1;
  name = 'Tier 1: Corporate Website + Financial Documents';

  private crawler: WebCrawlerService;
  private financialStep: FinancialDocumentStep;
  private chunker: TextChunkingService;
  private extractor: LLMFinancialDataExtractor;
  private jobRepository: JobRepository;

  constructor(jobRepository: JobRepository) {
    this.jobRepository = jobRepository;
    
    this.crawler = new WebCrawlerService({
      max_pages: 5, // Limit for Tier 1
      delay_ms: 1000,
      timeout_ms: 30000,
      respect_robots_txt: true,
    });

    this.financialStep = new FinancialDocumentStep(jobRepository);
    
    this.chunker = new TextChunkingService({
      max_chunk_size: 1000,
      overlap_size: 200,
      min_chunk_size: 100,
    });

    this.extractor = new LLMFinancialDataExtractor();
  }

  canHandle(context: EnrichmentContext): boolean {
    return !!context.job.domain;
  }

  async execute(context: EnrichmentContext): Promise<TierProcessingResult> {
    const startTime = Date.now();
    const sourcesAttempted: string[] = [];
    let pagesCrawled = 0;
    const allFacts: EnrichmentFact[] = [];

    console.log(`Starting Tier 1 processing for domain: ${context.job.domain}`);

    try {
      // Step 1: Crawl corporate website
      console.log('Step 1: Crawling corporate website...');
      sourcesAttempted.push(`https://${context.job.domain}`);
      
      const crawledPages = await this.crawler.crawlDomain(context.job.domain);
      pagesCrawled = crawledPages.length;
      
      console.log(`Crawled ${pagesCrawled} pages from corporate website`);

      // Step 2: Extract facts from crawled content
      if (crawledPages.length > 0) {
        console.log('Step 2: Processing crawled content...');
        
        // Chunk the content
        const textChunks = await this.chunker.chunkPages(crawledPages);
        console.log(`Created ${textChunks.length} text chunks`);

        // Extract facts from chunks using LLM
        for (const chunk of textChunks.slice(0, 10)) { // Limit processing for Tier 1
          try {
            const facts = await this.extractFactsFromChunk(chunk, context.job.id);
            allFacts.push(...facts);
          } catch (error) {
            console.error(`Error processing chunk ${chunk.id}:`, error);
          }
        }
      }

      // Step 3: Process financial documents
      console.log('Step 3: Processing financial documents...');
      sourcesAttempted.push('SEC EDGAR Database');
      
      try {
        const financialContext = await this.financialStep.execute(context);
        
        if (financialContext.extracted_facts) {
          allFacts.push(...financialContext.extracted_facts);
          console.log(`Added ${financialContext.extracted_facts.length} facts from financial documents`);
        }

        // Add financial document sources
        if (financialContext.step_results?.financial_documents?.document_types) {
          sourcesAttempted.push(...financialContext.step_results.financial_documents.document_types);
        }
        
      } catch (error) {
        console.error('Error processing financial documents:', error);
        // Continue processing even if financial documents fail
      }

      // Step 4: Calculate confidence and determine status
      const averageConfidence = allFacts.length > 0 
        ? allFacts.reduce((sum, fact) => sum + fact.confidence_score, 0) / allFacts.length 
        : 0;

      const runtimeSeconds = Math.floor((Date.now() - startTime) / 1000);
      
      let status: 'completed' | 'partial' | 'failed' | 'timeout' = 'completed';
      
      if (allFacts.length === 0) {
        status = 'failed';
      } else if (allFacts.length < 3 || averageConfidence < 0.5) {
        status = 'partial';
      }

      console.log(`Tier 1 completed: ${allFacts.length} facts, confidence: ${averageConfidence.toFixed(3)}, status: ${status}`);

      return {
        tier: this.tier,
        facts: allFacts,
        sources_attempted: sourcesAttempted,
        pages_scraped: pagesCrawled,
        runtime_seconds: runtimeSeconds,
        status,
        average_confidence: averageConfidence
      };

    } catch (error) {
      console.error('Error in Tier 1 processing:', error);
      
      return {
        tier: this.tier,
        facts: allFacts,
        sources_attempted: sourcesAttempted,
        pages_scraped: pagesCrawled,
        runtime_seconds: Math.floor((Date.now() - startTime) / 1000),
        status: 'failed',
        error_message: error instanceof Error ? error.message : String(error),
        average_confidence: 0
      };
    } finally {
      await this.crawler.close();
    }
  }

  /**
   * Extract facts from a text chunk using LLM
   */
  private async extractFactsFromChunk(chunk: any, jobId: string): Promise<EnrichmentFact[]> {
    try {
      // Use the financial data extractor to process the chunk
      const extractionResult = await this.extractor.extractFacts([{
        section_name: 'Website Content',
        section_type: 'business_description',
        content: chunk.content,
        confidence_score: 0.8,
        extraction_method: 'llm'
      }]);

      // Convert financial facts to enrichment facts
      const enrichmentFacts: EnrichmentFact[] = extractionResult.extracted_facts.map(financialFact => ({
        id: `tier1_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        job_id: jobId,
        fact_type: this.mapFactType(financialFact.fact_type),
        fact_data: {
          value: financialFact.value,
          unit: financialFact.unit,
          period: financialFact.period,
          extraction_method: financialFact.extraction_method,
          original_fact_type: financialFact.fact_type
        },
        confidence_score: financialFact.confidence_score,
        source_url: chunk.metadata.source_url,
        source_text: financialFact.source_text,
        created_at: new Date().toISOString(),
        validated: false,
        tier_used: 1
      }));

      return enrichmentFacts;

    } catch (error) {
      console.error(`Error extracting facts from chunk:`, error);
      return [];
    }
  }

  /**
   * Map financial fact types to enrichment fact types
   */
  private mapFactType(financialFactType: string): string {
    const mapping: Record<string, string> = {
      'facility_name': 'site_name',
      'facility_address': 'site_address',
      'facility_type': 'site_type',
      'production_capacity': 'production_capacity',
      'employee_count': 'employee_count',
      'geographic_segment': 'geographic_segment',
      'business_segment': 'business_segment',
      'subsidiary_name': 'subsidiary',
      'subsidiary_location': 'subsidiary_location',
      'major_product': 'major_product',
      'regulatory_id': 'regulatory_id',
      'certification': 'certification',
      'operating_status': 'operating_status',
      'company_name': 'company_name',
      'headquarters_address': 'headquarters_address',
      'industry_sector': 'industry_sector'
    };

    return mapping[financialFactType] || financialFactType;
  }
}
