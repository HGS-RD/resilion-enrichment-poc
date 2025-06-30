import { BaseEnrichmentStep } from '../base-enrichment-step';
import { EnrichmentContext, TextChunk, ChunkingConfig } from '../../types/enrichment';

/**
 * Text Chunking Step
 * 
 * Second step in the enrichment chain. Takes crawled pages and splits
 * them into manageable chunks for embedding and processing.
 */

export class TextChunkingStep extends BaseEnrichmentStep {
  private config: ChunkingConfig;

  constructor(jobRepository: any) {
    super(jobRepository);
    
    // Default chunking configuration
    this.config = {
      max_chunk_size: parseInt(process.env.CHUNK_MAX_SIZE || '1000'),
      overlap_size: parseInt(process.env.CHUNK_OVERLAP_SIZE || '200'),
      min_chunk_size: parseInt(process.env.CHUNK_MIN_SIZE || '100')
    };
  }

  get name(): string {
    return 'TextChunking';
  }

  canHandle(context: EnrichmentContext): boolean {
    // Can handle if crawling is completed and chunking hasn't been completed
    return !!(
      context.job && 
      context.job.crawling_status === 'completed' &&
      (context.job.chunking_status === undefined || 
       context.job.chunking_status === null || 
       context.job.chunking_status === 'pending' || 
       context.job.chunking_status === 'failed') &&
      context.crawled_pages &&
      context.crawled_pages.length > 0
    );
  }

  async execute(context: EnrichmentContext): Promise<EnrichmentContext> {
    const { job, crawled_pages } = context;
    
    if (!crawled_pages || crawled_pages.length === 0) {
      return {
        ...context,
        error: new Error('No crawled pages available for chunking')
      };
    }

    try {
      // Update step status to running
      await this.updateStepStatus(job.id, 'chunking_status', 'running');

      // Process all crawled pages into chunks
      const textChunks: TextChunk[] = [];
      let chunkIdCounter = 0;

      for (const page of crawled_pages) {
        const pageChunks = await this.chunkPageContent(page, chunkIdCounter);
        textChunks.push(...pageChunks);
        chunkIdCounter += pageChunks.length;
      }

      // Filter out chunks that are too small
      const validChunks = textChunks.filter(chunk => 
        chunk.content.length >= this.config.min_chunk_size
      );

      // Update progress
      await this.updateProgress(job.id, { chunks_created: validChunks.length });

      // Update step status to completed
      await this.updateStepStatus(job.id, 'chunking_status', 'completed');

      // Return updated context
      return {
        ...context,
        text_chunks: validChunks,
        step_results: {
          ...context.step_results,
          chunking: {
            total_chunks: validChunks.length,
            filtered_chunks: textChunks.length - validChunks.length,
            average_chunk_size: validChunks.reduce((sum, chunk) => sum + chunk.content.length, 0) / validChunks.length,
            completed_at: new Date().toISOString()
          }
        }
      };

    } catch (error) {
      // Update step status to failed
      await this.updateStepStatus(job.id, 'chunking_status', 'failed');
      
      return {
        ...context,
        error: error instanceof Error ? error : new Error('Text chunking failed')
      };
    }
  }

  /**
   * Chunks the content of a single page
   */
  private async chunkPageContent(page: any, startingChunkId: number): Promise<TextChunk[]> {
    const chunks: TextChunk[] = [];
    const content = page.content;
    
    if (!content || content.length === 0) {
      return chunks;
    }

    // Split content into sentences first for better chunk boundaries
    const sentences = this.splitIntoSentences(content);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;
      
      // If adding this sentence would exceed max size, finalize current chunk
      if (potentialChunk.length > this.config.max_chunk_size && currentChunk.length > 0) {
        // Create chunk with overlap from previous chunk if applicable
        const chunkContent = this.addOverlapIfNeeded(currentChunk, chunks[chunks.length - 1]);
        
        chunks.push({
          id: `${startingChunkId + chunkIndex}`,
          content: chunkContent,
          metadata: {
            source_url: page.url,
            chunk_index: chunkIndex,
            word_count: this.countWords(chunkContent),
            created_at: new Date().toISOString()
          }
        });
        
        chunkIndex++;
        currentChunk = sentence; // Start new chunk with current sentence
      } else {
        currentChunk = potentialChunk;
      }
    }
    
    // Add the final chunk if it has content
    if (currentChunk.length >= this.config.min_chunk_size) {
      const chunkContent = this.addOverlapIfNeeded(currentChunk, chunks[chunks.length - 1]);
      
      chunks.push({
        id: `${startingChunkId + chunkIndex}`,
        content: chunkContent,
        metadata: {
          source_url: page.url,
          chunk_index: chunkIndex,
          word_count: this.countWords(chunkContent),
          created_at: new Date().toISOString()
        }
      });
    }
    
    return chunks;
  }

  /**
   * Splits text into sentences using basic punctuation rules
   */
  private splitIntoSentences(text: string): string[] {
    // Basic sentence splitting - can be improved with more sophisticated NLP
    const sentences = text
      .split(/[.!?]+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);
    
    return sentences;
  }

  /**
   * Adds overlap from previous chunk if configured
   */
  private addOverlapIfNeeded(currentContent: string, previousChunk?: TextChunk): string {
    if (!previousChunk || this.config.overlap_size === 0) {
      return currentContent;
    }

    // Get the last N characters from previous chunk for overlap
    const previousContent = previousChunk.content;
    const overlapText = previousContent.slice(-this.config.overlap_size);
    
    // Find a good break point (word boundary) for the overlap
    const wordBoundaryIndex = overlapText.lastIndexOf(' ');
    const cleanOverlap = wordBoundaryIndex > 0 ? 
      overlapText.slice(wordBoundaryIndex + 1) : 
      overlapText;

    return cleanOverlap + ' ' + currentContent;
  }

  /**
   * Counts words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((word: string) => word.length > 0).length;
  }

  /**
   * Validates chunk quality
   */
  private isValidChunk(chunk: TextChunk): boolean {
    const content = chunk.content.trim();
    
    // Check minimum length
    if (content.length < this.config.min_chunk_size) {
      return false;
    }
    
    // Check if chunk is mostly whitespace or special characters
    const alphanumericRatio = (content.match(/[a-zA-Z0-9]/g) || []).length / content.length;
    if (alphanumericRatio < 0.5) {
      return false;
    }
    
    // Check if chunk has meaningful content (not just navigation, etc.)
    const meaninglessPatterns = [
      /^(home|about|contact|privacy|terms|menu|navigation)/i,
      /^(click here|read more|learn more|see more)/i,
      /^(copyright|all rights reserved)/i
    ];
    
    for (const pattern of meaninglessPatterns) {
      if (pattern.test(content)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Optimizes chunks by merging small adjacent chunks
   */
  private optimizeChunks(chunks: TextChunk[]): TextChunk[] {
    const optimized: TextChunk[] = [];
    let i = 0;
    
    while (i < chunks.length) {
      let currentChunk = chunks[i];
      
      // Try to merge with next chunk if both are small
      while (
        i + 1 < chunks.length &&
        currentChunk.content.length < this.config.max_chunk_size * 0.7 &&
        chunks[i + 1].content.length < this.config.max_chunk_size * 0.7 &&
        currentChunk.content.length + chunks[i + 1].content.length <= this.config.max_chunk_size
      ) {
        const nextChunk = chunks[i + 1];
        
        // Merge chunks
        currentChunk = {
          ...currentChunk,
          content: currentChunk.content + ' ' + nextChunk.content,
          metadata: {
            ...currentChunk.metadata,
            word_count: this.countWords(currentChunk.content + ' ' + nextChunk.content)
          }
        };
        
        i++; // Skip the merged chunk
      }
      
      optimized.push(currentChunk);
      i++;
    }
    
    return optimized;
  }
}
