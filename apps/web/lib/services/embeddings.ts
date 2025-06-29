import { Pinecone } from '@pinecone-database/pinecone';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
import { TextChunk, EmbeddingResult, EmbeddingConfig } from '../types/enrichment';

export class EmbeddingService {
  private pinecone: Pinecone;
  private config: EmbeddingConfig;
  private indexName: string;

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = {
      model: config.model || 'text-embedding-3-small',
      dimensions: config.dimensions || 1536,
      batch_size: config.batch_size || 10,
    };

    this.indexName = process.env.PINECONE_INDEX_NAME || 'resilion-enrichment';
    
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }

  /**
   * Generate embeddings for text chunks and store them in Pinecone
   */
  async embedAndStoreChunks(
    chunks: TextChunk[], 
    jobId: string, 
    domain: string
  ): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = [];
    const index = this.pinecone.index(this.indexName);

    // Process chunks in batches
    for (let i = 0; i < chunks.length; i += this.config.batch_size) {
      const batch = chunks.slice(i, i + this.config.batch_size);
      
      try {
        console.log(`Processing embedding batch ${Math.floor(i / this.config.batch_size) + 1}/${Math.ceil(chunks.length / this.config.batch_size)}`);
        
        // Generate embeddings for the batch
        const embeddings = await this.generateEmbeddings(batch.map(chunk => chunk.content));
        
        // Prepare vectors for Pinecone
        const vectors = batch.map((chunk, batchIndex) => {
          const embeddingId = `${jobId}-${chunk.id}`;
          
          return {
            id: embeddingId,
            values: embeddings[batchIndex],
            metadata: {
              job_id: jobId,
              chunk_id: chunk.id,
              domain: domain,
              source_url: chunk.metadata.source_url,
              chunk_index: chunk.metadata.chunk_index,
              word_count: chunk.metadata.word_count,
              content: chunk.content.substring(0, 1000), // Store first 1000 chars for reference
              created_at: chunk.metadata.created_at,
              embedded_at: new Date().toISOString(),
            }
          };
        });

        // Upsert vectors to Pinecone
        await index.upsert(vectors);

        // Create results
        const batchResults: EmbeddingResult[] = batch.map((chunk, batchIndex) => ({
          chunk_id: chunk.id,
          embedding_id: `${jobId}-${chunk.id}`,
          vector: embeddings[batchIndex],
          metadata: {
            job_id: jobId,
            domain: domain,
            source_url: chunk.metadata.source_url,
            chunk_index: chunk.metadata.chunk_index,
            word_count: chunk.metadata.word_count,
            embedded_at: new Date().toISOString(),
          }
        }));

        results.push(...batchResults);

        // Add delay between batches to respect rate limits
        if (i + this.config.batch_size < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`Error processing embedding batch ${Math.floor(i / this.config.batch_size) + 1}:`, error);
        throw error;
      }
    }

    console.log(`Successfully embedded and stored ${results.length} chunks in Pinecone`);
    return results;
  }

  /**
   * Generate embeddings using OpenAI's embedding model
   */
  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings: number[][] = [];
      
      // Process each text individually since AI SDK embed function handles single values
      for (const text of texts) {
        const { embedding } = await embed({
          model: openai.embedding(this.config.model),
          value: text,
        });
        embeddings.push(embedding);
      }

      return embeddings;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error}`);
    }
  }

  /**
   * Query similar chunks from Pinecone
   */
  async querySimilarChunks(
    queryText: string, 
    jobId?: string, 
    topK: number = 5
  ): Promise<Array<{
    id: string;
    score: number;
    metadata: Record<string, any>;
  }>> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Generate embedding for query text
      const queryEmbeddings = await this.generateEmbeddings([queryText]);
      const queryVector = queryEmbeddings[0];

      // Build filter if jobId is provided
      const filter = jobId ? { job_id: { $eq: jobId } } : undefined;

      // Query Pinecone
      const queryResponse = await index.query({
        vector: queryVector,
        topK,
        includeMetadata: true,
        filter,
      });

      return queryResponse.matches?.map(match => ({
        id: match.id,
        score: match.score || 0,
        metadata: match.metadata || {},
      })) || [];

    } catch (error) {
      console.error('Error querying similar chunks:', error);
      throw new Error(`Failed to query similar chunks: ${error}`);
    }
  }

  /**
   * Delete embeddings for a specific job
   */
  async deleteJobEmbeddings(jobId: string): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Delete by metadata filter
      await index.deleteMany({
        filter: {
          job_id: { $eq: jobId }
        }
      });

      console.log(`Deleted embeddings for job ${jobId}`);
    } catch (error) {
      console.error(`Error deleting embeddings for job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get embedding statistics for a job
   */
  async getJobEmbeddingStats(jobId: string): Promise<{
    total_embeddings: number;
    avg_word_count: number;
    sources: string[];
  }> {
    try {
      const index = this.pinecone.index(this.indexName);
      
      // Query to get all embeddings for the job
      const queryResponse = await index.query({
        vector: new Array(this.config.dimensions).fill(0), // Dummy vector
        topK: 1000, // Get up to 1000 results
        includeMetadata: true,
        filter: {
          job_id: { $eq: jobId }
        }
      });

      const matches = queryResponse.matches || [];
      const sources = new Set<string>();
      let totalWordCount = 0;

      matches.forEach(match => {
        if (match.metadata?.source_url) {
          sources.add(match.metadata.source_url as string);
        }
        if (match.metadata?.word_count) {
          totalWordCount += match.metadata.word_count as number;
        }
      });

      return {
        total_embeddings: matches.length,
        avg_word_count: matches.length > 0 ? Math.round(totalWordCount / matches.length) : 0,
        sources: Array.from(sources),
      };

    } catch (error) {
      console.error(`Error getting embedding stats for job ${jobId}:`, error);
      return {
        total_embeddings: 0,
        avg_word_count: 0,
        sources: [],
      };
    }
  }

  /**
   * Initialize Pinecone index if it doesn't exist
   */
  async initializeIndex(): Promise<void> {
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
        console.log('Waiting for index to be ready...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

      console.log(`Pinecone index ${this.indexName} is ready`);
    } catch (error) {
      console.error('Error initializing Pinecone index:', error);
      throw error;
    }
  }
}
