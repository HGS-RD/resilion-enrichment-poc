import { BaseEnrichmentStep } from '../enrichment-agent';
import { EnrichmentContext, EnrichmentFact, ExtractionConfig } from '../../types/enrichment';

/**
 * Fact Extraction Step
 * 
 * Final step in the enrichment chain. Uses LLM to extract structured
 * facts from the embedded text chunks.
 */

export class FactExtractionStep extends BaseEnrichmentStep {
  private config: ExtractionConfig;

  constructor(jobRepository: any) {
    super(jobRepository);
    
    // Default extraction configuration
    this.config = {
      model: process.env.EXTRACTION_MODEL || 'gpt-4o-mini',
      temperature: parseFloat(process.env.EXTRACTION_TEMPERATURE || '0.1'),
      max_tokens: parseInt(process.env.EXTRACTION_MAX_TOKENS || '2000'),
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
      context.job.extraction_status !== 'completed' &&
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

      // Update progress
      await this.updateProgress(job.id, { facts_extracted: validFacts.length });

      // Update step status to completed
      await this.updateStepStatus(job.id, 'extraction_status', 'completed');

      // Return updated context
      return {
        ...context,
        extracted_facts: validFacts,
        step_results: {
          ...context.step_results,
          extraction: {
            total_facts: validFacts.length,
            filtered_facts: extractedFacts.length - validFacts.length,
            confidence_threshold: this.config.confidence_threshold,
            model_used: this.config.model,
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
   * Extracts facts from a batch of text chunks
   */
  private async extractFactsFromBatch(chunks: any[], job: any): Promise<EnrichmentFact[]> {
    const facts: EnrichmentFact[] = [];

    // Combine chunks into a single context for the LLM
    const combinedText = chunks.map(chunk => chunk.content).join('\n\n');
    
    // Create extraction prompt
    const prompt = this.createExtractionPrompt(combinedText, job.domain);

    try {
      // Call LLM for fact extraction
      const extractionResult = await this.callLLM(prompt);
      
      // Parse and validate the extracted facts
      const parsedFacts = this.parseExtractionResult(extractionResult, chunks, job.id);
      
      facts.push(...parsedFacts);

    } catch (error) {
      console.error('Failed to extract facts from batch:', error);
      // Continue processing - don't fail the entire step
    }

    return facts;
  }

  /**
   * Creates the extraction prompt for the LLM
   */
  private createExtractionPrompt(text: string, domain: string): string {
    return `You are an expert fact extraction system. Extract structured facts from the following text content from the domain "${domain}".

INSTRUCTIONS:
1. Extract factual information that would be valuable for business intelligence
2. Focus on: company information, products/services, locations, contact details, key people, business metrics, technologies used
3. Each fact should have a clear type and high confidence
4. Return facts in JSON format with the specified schema
5. Only include facts you are confident about (confidence >= 0.7)

TEXT CONTENT:
${text}

REQUIRED JSON SCHEMA:
{
  "facts": [
    {
      "fact_type": "string (e.g., 'company_info', 'product', 'location', 'contact', 'person', 'technology', 'metric')",
      "fact_data": {
        "key": "value pairs with the actual fact information"
      },
      "confidence_score": "number between 0 and 1",
      "source_text": "the specific text snippet that supports this fact"
    }
  ]
}

EXAMPLE OUTPUT:
{
  "facts": [
    {
      "fact_type": "company_info",
      "fact_data": {
        "name": "Acme Corp",
        "industry": "Software Development",
        "description": "Leading provider of cloud solutions"
      },
      "confidence_score": 0.95,
      "source_text": "Acme Corp is a leading provider of cloud solutions in the software development industry"
    }
  ]
}

Extract facts now:`;
  }

  /**
   * Calls the LLM for fact extraction
   */
  private async callLLM(prompt: string): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert fact extraction system. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.max_tokens,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI API');
      }

      return data.choices[0].message.content;

    } catch (error) {
      console.error('Failed to call LLM:', error);
      throw new Error(`LLM call failed: ${error}`);
    }
  }

  /**
   * Parses and validates the extraction result
   */
  private parseExtractionResult(result: string, chunks: any[], jobId: string): EnrichmentFact[] {
    const facts: EnrichmentFact[] = [];

    try {
      const parsed = JSON.parse(result);
      
      if (!parsed.facts || !Array.isArray(parsed.facts)) {
        console.warn('Invalid extraction result format');
        return facts;
      }

      for (const factData of parsed.facts) {
        // Validate required fields
        if (!factData.fact_type || !factData.fact_data || !factData.confidence_score) {
          console.warn('Skipping invalid fact:', factData);
          continue;
        }

        // Find the source chunk (simplified - could be improved)
        const sourceChunk = chunks[0]; // For now, use first chunk as source

        const fact: EnrichmentFact = {
          id: this.generateFactId(),
          job_id: jobId,
          fact_type: factData.fact_type,
          fact_data: factData.fact_data,
          confidence_score: Math.min(Math.max(factData.confidence_score, 0), 1), // Clamp to 0-1
          source_url: sourceChunk?.metadata?.source_url,
          source_text: factData.source_text || sourceChunk?.content?.substring(0, 500),
          embedding_id: undefined, // Could link to specific embedding
          created_at: new Date().toISOString(),
          validated: false
        };

        facts.push(fact);
      }

    } catch (error) {
      console.error('Failed to parse extraction result:', error);
    }

    return facts;
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
   * Validates extracted facts for quality
   */
  private validateFact(fact: EnrichmentFact): boolean {
    // Check confidence threshold
    if (fact.confidence_score < this.config.confidence_threshold) {
      return false;
    }

    // Check for required data
    if (!fact.fact_data || Object.keys(fact.fact_data).length === 0) {
      return false;
    }

    // Check fact type is valid
    const validFactTypes = [
      'company_info', 'product', 'service', 'location', 'contact', 
      'person', 'technology', 'metric', 'event', 'partnership'
    ];
    
    if (!validFactTypes.includes(fact.fact_type)) {
      return false;
    }

    return true;
  }

  /**
   * Deduplicates similar facts
   */
  private deduplicateFacts(facts: EnrichmentFact[]): EnrichmentFact[] {
    const deduplicated: EnrichmentFact[] = [];
    const seen = new Set<string>();

    for (const fact of facts) {
      // Create a simple hash for deduplication
      const hash = this.createFactHash(fact);
      
      if (!seen.has(hash)) {
        seen.add(hash);
        deduplicated.push(fact);
      }
    }

    return deduplicated;
  }

  /**
   * Creates a hash for fact deduplication
   */
  private createFactHash(fact: EnrichmentFact): string {
    const key = `${fact.fact_type}-${JSON.stringify(fact.fact_data)}`;
    return Buffer.from(key).toString('base64');
  }
}
