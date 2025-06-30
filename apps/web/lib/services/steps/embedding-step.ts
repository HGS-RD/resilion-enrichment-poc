import { BaseEnrichmentStep } from '../base-enrichment-step';
import { EnrichmentContext, EmbeddingResult, EmbeddingConfig } from '../../types/enrichment';
import { Pinecone } from '@pinecone-database/pinecone';

/**
 * Embedding Step
 * 
 * Third step in the enrichment chain. Takes text chunks and creates
 * embeddings, then stores them in Pinecone vector database.
 */

export class EmbeddingStep extends BaseEnrichmentStep {
  private config: EmbeddingConfig;
  private pinecone: Pinecone;
  private indexName: string;

  constructor(jobRepository: any) {
    super(jobRepository);
    
    // Default embedding configuration
    this.config = {
      model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '1536'),
      batch_size: parseInt(process.env.EMBEDDING_BATCH_SIZE || '10')
    };

    // Initialize Pinecone
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!
    });
    
    this.indexName = process.env.PINECONE_INDEX_NAME || 'enrichment-embeddings';
  }

  get name(): string {
    return 'Embedding';
  }

  canHandle(context: EnrichmentContext): boolean {
    // Can handle if chunking is completed and embedding hasn't been completed
    return !!(
      context.job && 
      context.job.chunking_status === 'completed' &&
      (context.job.embedding_status === undefined || 
       context.job.embedding_status === null || 
       context.job.embedding_status === 'pending' || 
       context.job.embedding_status === 'failed') &&
      context.text_chunks &&
      context.text_chunks.length > 0
    );
  }

  async execute(context: EnrichmentContext): Promise<EnrichmentContext> {
    const { job, text_chunks } = context;
    
    if (!text_chunks || text_chunks.length === 0) {
      return {
        ...context,
        error: new Error('No text chunks available for embedding')
      };
    }

    try {
      // Update step status to running
      await this.updateStepStatus(job.id, 'embedding_status', 'running');

      // Ensure Pinecone index exists
      await this.ensureIndexExists();

      // Process chunks in batches
      const embeddings: EmbeddingResult[] = [];
      const batches = this.createBatches(text_chunks, this.config.batch_size);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        console.log(`Processing embedding batch ${i + 1}/${batches.length}`);

        try {
          const batchEmbeddings = await this.processBatch(batch, job.domain);
          embeddings.push(...batchEmbeddings);

          // Add delay between batches to respect rate limits
          if (i < batches.length - 1) {
            await this.delay(1000);
          }

        } catch (error) {
          console.error(`Failed to process batch ${i + 1}:`, error);
          // Continue with other batches
        }
      }

      // Update progress
      await this.updateProgress(job.id, { embeddings_generated: embeddings.length });

      // Update step status to completed
      await this.updateStepStatus(job.id, 'embedding_status', 'completed');

      // Return updated context
      return {
        ...context,
        embeddings,
        step_results: {
          ...context.step_results,
          embedding: {
            total_embeddings: embeddings.length,
            failed_embeddings: text_chunks.length - embeddings.length,
            model_used: this.config.model,
            dimensions: this.config.dimensions,
            completed_at: new Date().toISOString()
          }
        }
      };

    } catch (error) {
      // Update step status to failed
      await this.updateStepStatus(job.id, 'embedding_status', 'failed');
      
      return {
        ...context,
        error: error instanceof Error ? error : new Error('Embedding generation failed')
      };
    }
  }

  /**
   * Ensures the Pinecone index exists
   */
  private async ensureIndexExists(): Promise<void> {
    try {
      const indexList = await this.pinecone.listIndexes();
      const indexExists = indexList.indexes?.some(index => index.name === this.indexName);

      if (!indexExists) {
        console.log(`Creating Pinecone index: ${this.indexName}`);
        
        await this.pinecone.createIndex({
          name: this.indexName,
          dimension: this.config.dimensions,
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });

        // Wait for index to be ready
        await this.waitForIndexReady();
      }
    } catch (error) {
      console.error('Failed to ensure index exists:', error);
      throw new Error(`Failed to initialize Pinecone index: ${error}`);
    }
  }

  /**
   * Waits for the Pinecone index to be ready
   */
  private async waitForIndexReady(): Promise<void> {
    const maxAttempts = 30;
    const delayMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const indexStats = await this.pinecone.index(this.indexName).describeIndexStats();
        if (indexStats) {
          console.log('Pinecone index is ready');
          return;
        }
      } catch (error) {
        // Index might not be ready yet
      }

      await this.delay(delayMs);
    }

    throw new Error('Timeout waiting for Pinecone index to be ready');
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
   * Processes a batch of text chunks
   */
  private async processBatch(chunks: any[], domain: string): Promise<EmbeddingResult[]> {
    const embeddings: EmbeddingResult[] = [];

    // Generate embeddings using OpenAI
    const embeddingVectors = await this.generateEmbeddings(chunks.map(chunk => chunk.content));

    // Prepare vectors for Pinecone
    const vectors = chunks.map((chunk, index) => ({
      id: `${domain}-${chunk.id}`,
      values: embeddingVectors[index],
      metadata: {
        chunk_id: chunk.id,
        source_url: chunk.metadata.source_url,
        chunk_index: chunk.metadata.chunk_index,
        word_count: chunk.metadata.word_count,
        content: chunk.content.substring(0, 1000), // Store first 1000 chars for reference
        domain: domain,
        created_at: new Date().toISOString()
      }
    }));

    // Store in Pinecone
    const index = this.pinecone.index(this.indexName);
    await index.upsert(vectors);

    // Create embedding results
    for (let i = 0; i < chunks.length; i++) {
      embeddings.push({
        chunk_id: chunks[i].id,
        embedding_id: vectors[i].id,
        vector: embeddingVectors[i],
        metadata: vectors[i].metadata
      });
    }

    return embeddings;
  }

  /**
   * Generates embeddings using OpenAI API
   */
  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          input: texts,
          encoding_format: 'float'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      
      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from OpenAI API');
      }

      return data.data.map((item: any) => item.embedding);

    } catch (error) {
      console.error('Failed to generate embeddings:', error);
      throw new Error(`Embedding generation failed: ${error}`);
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Queries similar embeddings from Pinecone
   */
  async querySimilar(
    queryText: string, 
    domain: string, 
    topK: number = 5
  ): Promise<any[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbeddings([queryText]);
      
      // Query Pinecone
      const index = this.pinecone.index(this.indexName);
      const queryResponse = await index.query({
        vector: queryEmbedding[0],
        topK,
        filter: { domain: { $eq: domain } },
        includeMetadata: true,
        includeValues: false
      });

      return queryResponse.matches || [];

    } catch (error) {
      console.error('Failed to query similar embeddings:', error);
      throw error;
    }
  }

  /**
   * Deletes embeddings for a domain
   */
  async deleteEmbeddingsForDomain(domain: string): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Delete by metadata filter
      await index.deleteMany({
        filter: { domain: { $eq: domain } }
      });

      console.log(`Deleted embeddings for domain: ${domain}`);

    } catch (error) {
      console.error('Failed to delete embeddings:', error);
      throw error;
    }
  }
}
