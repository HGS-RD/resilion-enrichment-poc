import { BaseEnrichmentStep } from '../base-enrichment-step';
import { EnrichmentContext, EnrichmentFact, ExtractionConfig } from '../../types/enrichment';
import { FactRepository } from '../../repositories/fact-repository';
import { promptBuilder } from '../prompt-templates';
import { factSchemaValidator } from '../schema-validator';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

/**
 * Enhanced Fact Extraction Step
 * 
 * Final step in the enrichment chain. Uses AI SDK with structured output
 * to extract facts from text chunks, validates against schema, and persists
 * to database with confidence scoring.
 */

export class FactExtractionStep extends BaseEnrichmentStep {
  private config: ExtractionConfig;
  private factRepository: FactRepository;

  constructor(jobRepository: any) {
    super(jobRepository);
    this.factRepository = new FactRepository();
    
    // Enhanced extraction configuration
    this.config = {
      model: process.env.EXTRACTION_MODEL || 'gpt-4o-mini',
      temperature: parseFloat(process.env.EXTRACTION_TEMPERATURE || '0.1'),
      max_tokens: parseInt(process.env.EXTRACTION_MAX_TOKENS || '3000'),
      confidence_threshold: parseFloat(process.env.EXTRACTION_CONFIDENCE_THRESHOLD || '0.7')
    };
  }

  get name(): string {
    return 'FactExtraction';
  }

  canHandle(context: EnrichmentContext): boolean {
    // Can handle if embedding is completed and extraction hasn't been completed
    return !!(
      context.job && 
      context.job.embedding_status === 'completed' &&
      (context.job.extraction_status === undefined || 
       context.job.extraction_status === null || 
       context.job.extraction_status === 'pending' || 
       context.job.extraction_status === 'failed') &&
      context.embeddings &&
      context.embeddings.length > 0
    );
  }

  async execute(context: EnrichmentContext): Promise<EnrichmentContext> {
    const { job, text_chunks, embeddings } = context;
    
    if (!text_chunks || text_chunks.length === 0) {
      return {
        ...context,
        error: new Error('No text chunks available for fact extraction')
      };
    }

    try {
      // Update step status to running
      await this.updateStepStatus(job.id, 'extraction_status', 'running');

      // Extract facts from text chunks
      const extractedFacts: EnrichmentFact[] = [];
      
      // Process chunks in batches to avoid overwhelming the LLM
      const batchSize = 5;
      const batches = this.createBatches(text_chunks, batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing extraction batch ${i + 1}/${batches.length}`);

        try {
          const batchFacts = await this.extractFactsFromBatch(batch, job);
          extractedFacts.push(...batchFacts);

          // Add delay between batches to respect rate limits
          if (i < batches.length - 1) {
            await this.delay(2000);
          }

        } catch (error) {
          console.error(`Failed to process extraction batch ${i + 1}:`, error);
          // Continue with other batches
        }
      }

      // Filter facts by confidence threshold
      const validFacts = extractedFacts.filter(fact => 
        fact.confidence_score >= this.config.confidence_threshold
      );

      // Persist facts to database
      const persistedFacts = await this.persistFacts(validFacts);

      // Update progress
      await this.updateProgress(job.id, { facts_extracted: persistedFacts.length });

      // Update step status to completed
      await this.updateStepStatus(job.id, 'extraction_status', 'completed');

      console.log(`Successfully extracted and persisted ${persistedFacts.length} facts for job ${job.id}`);

      // Return updated context
      return {
        ...context,
        extracted_facts: persistedFacts,
        step_results: {
          ...context.step_results,
          extraction: {
            total_facts: persistedFacts.length,
            filtered_facts: extractedFacts.length - persistedFacts.length,
            confidence_threshold: this.config.confidence_threshold,
            model_used: this.config.model,
            validation_enabled: true,
            completed_at: new Date().toISOString()
          }
        }
      };

    } catch (error) {
      // Update step status to failed
      await this.updateStepStatus(job.id, 'extraction_status', 'failed');
      
      return {
        ...context,
        error: error instanceof Error ? error : new Error('Fact extraction failed')
      };
    }
  }

  /**
   * Creates batches from text chunks
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Extracts facts from a batch of text chunks using AI SDK
   */
  private async extractFactsFromBatch(chunks: any[], job: any): Promise<EnrichmentFact[]> {
    const facts: EnrichmentFact[] = [];

    try {
      // Combine chunks into a single context for the LLM
      const combinedText = chunks.map(chunk => chunk.content).join('\n\n');
      
      // Build extraction prompt using template system
      const { systemPrompt, userPrompt, schema } = promptBuilder.buildExtractionPrompt(
        combinedText,
        job.domain
      );

      console.log(`Extracting facts from ${chunks.length} chunks for domain: ${job.domain}`);

      // Use AI SDK for structured extraction
      const extractionResult = await this.callAISDK(systemPrompt, userPrompt, schema);
      
      // Validate and process the extracted facts
      const processedFacts = await this.processExtractionResult(
        extractionResult,
        chunks,
        job.id
      );
      
      facts.push(...processedFacts);

    } catch (error) {
      console.error('Failed to extract facts from batch:', error);
      // Continue processing - don't fail the entire step
    }

    return facts;
  }

  /**
   * Calls AI SDK for structured fact extraction
   */
  private async callAISDK(systemPrompt: string, userPrompt: string, schema: any): Promise<any> {
    try {
      // Define the extraction schema for AI SDK
      const extractionSchema = z.object({
        facts: z.array(z.object({
          fact_type: z.enum([
            'company_info', 'product', 'service', 'location', 'contact',
            'person', 'technology', 'metric', 'certification', 'partnership', 'capability'
          ]),
          fact_data: z.record(z.any()),
          confidence_score: z.number().min(0.7).max(1.0),
          source_text: z.string().min(1).max(200)
        }))
      });

      const result = await generateObject({
        model: openai(this.config.model),
        system: systemPrompt,
        prompt: userPrompt,
        schema: extractionSchema,
        temperature: this.config.temperature,
        maxTokens: this.config.max_tokens,
      });

      return result.object;

    } catch (error) {
      console.error('AI SDK extraction failed:', error);
      throw new Error(`AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Processes and validates extraction results
   */
  private async processExtractionResult(
    extractionResult: any,
    chunks: any[],
    jobId: string
  ): Promise<EnrichmentFact[]> {
    const facts: EnrichmentFact[] = [];

    try {
      // Validate the extraction result against our schema
      const validation = factSchemaValidator.validateExtractionResult(extractionResult);
      
      if (!validation.isValid) {
        console.warn('Schema validation errors:', validation.errors);
      }

      // Process valid facts
      for (const validFact of validation.validFacts) {
        // Apply confidence threshold filter
        if (validFact.confidence_score < this.config.confidence_threshold) {
          console.log(`Filtering out low-confidence fact: ${validFact.confidence_score}`);
          continue;
        }

        // Find the best matching source chunk
        const sourceChunk = this.findBestSourceChunk(validFact.source_text, chunks);

        const fact: EnrichmentFact = {
          id: this.generateFactId(),
          job_id: jobId,
          fact_type: validFact.fact_type,
          fact_data: validFact.fact_data,
          confidence_score: validFact.confidence_score,
          source_url: sourceChunk?.metadata?.source_url,
          source_text: validFact.source_text,
          embedding_id: sourceChunk?.id,
          created_at: new Date().toISOString(),
          validated: false
        };

        facts.push(fact);
      }

      // Log validation results
      console.log(`Extraction validation: ${validation.validFacts.length} valid, ${validation.invalidFacts.length} invalid facts`);

    } catch (error) {
      console.error('Failed to process extraction result:', error);
    }

    return facts;
  }

  /**
   * Finds the best matching source chunk for a fact
   */
  private findBestSourceChunk(sourceText: string, chunks: any[]): any {
    if (!sourceText || chunks.length === 0) {
      return chunks[0];
    }

    // Simple text matching - could be improved with fuzzy matching
    let bestMatch = chunks[0];
    let bestScore = 0;

    for (const chunk of chunks) {
      if (chunk.content && chunk.content.includes(sourceText.substring(0, 50))) {
        const score = this.calculateTextSimilarity(sourceText, chunk.content);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = chunk;
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calculates simple text similarity score
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  /**
   * Persists facts to database with validation
   */
  private async persistFacts(facts: EnrichmentFact[]): Promise<EnrichmentFact[]> {
    if (facts.length === 0) {
      return [];
    }

    try {
      // Prepare facts for persistence (remove id and created_at as they'll be generated)
      const factsForPersistence = facts.map(fact => ({
        job_id: fact.job_id,
        fact_type: fact.fact_type,
        fact_data: fact.fact_data,
        confidence_score: fact.confidence_score,
        source_url: fact.source_url,
        source_text: fact.source_text,
        embedding_id: fact.embedding_id,
        validated: fact.validated,
        validation_notes: fact.validation_notes
      }));

      // Validate facts for persistence
      const validation = factSchemaValidator.validateForPersistence(factsForPersistence);
      
      if (validation.errors.length > 0) {
        console.warn('Fact persistence validation errors:', validation.errors);
      }

      // Persist valid facts to database (cast to proper type after validation)
      const persistedFacts = await this.factRepository.createBatch(
        validation.validFacts as Omit<EnrichmentFact, 'id' | 'created_at'>[]
      );
      
      console.log(`Persisted ${persistedFacts.length} facts to database`);
      
      return persistedFacts;

    } catch (error) {
      console.error('Failed to persist facts:', error);
      throw new Error(`Fact persistence failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates a unique fact ID
   */
  private generateFactId(): string {
    return `fact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Enhanced fact validation with schema validation
   */
  private validateFact(fact: EnrichmentFact): boolean {
    // Use schema validator for comprehensive validation
    const validation = factSchemaValidator.validateSingleFact({
      fact_type: fact.fact_type,
      fact_data: fact.fact_data,
      confidence_score: fact.confidence_score,
      source_text: fact.source_text || ''
    });

    return validation.isValid;
  }

  /**
   * Deduplicates similar facts using improved hashing
   */
  private deduplicateFacts(facts: EnrichmentFact[]): EnrichmentFact[] {
    const deduplicated: EnrichmentFact[] = [];
    const seen = new Set<string>();

    for (const fact of facts) {
      // Create a more sophisticated hash for deduplication
      const hash = this.createFactHash(fact);
      
      if (!seen.has(hash)) {
        seen.add(hash);
        deduplicated.push(fact);
      } else {
        console.log(`Deduplicated similar fact: ${fact.fact_type}`);
      }
    }

    return deduplicated;
  }

  /**
   * Creates an improved hash for fact deduplication
   */
  private createFactHash(fact: EnrichmentFact): string {
    // Create hash based on fact type and key data fields
    const keyData = { ...fact.fact_data };
    
    // Normalize data for better deduplication
    if (keyData.name) {
      keyData.name = keyData.name.toLowerCase().trim();
    }
    
    const key = `${fact.fact_type}-${JSON.stringify(keyData, Object.keys(keyData).sort())}`;
    return Buffer.from(key).toString('base64');
  }

  /**
   * Cleanup method to close database connections
   */
  async cleanup(): Promise<void> {
    try {
      await this.factRepository.close();
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}
