import { TextChunk, ChunkingConfig, CrawledPage } from '../types/enrichment';
import { v4 as uuidv4 } from 'uuid';

export class TextChunkingService {
  private config: ChunkingConfig;

  constructor(config: Partial<ChunkingConfig> = {}) {
    this.config = {
      max_chunk_size: config.max_chunk_size || 1000,
      overlap_size: config.overlap_size || 200,
      min_chunk_size: config.min_chunk_size || 100,
    };
  }

  /**
   * Chunks crawled pages into smaller text segments for embedding
   */
  async chunkPages(crawledPages: CrawledPage[]): Promise<TextChunk[]> {
    const allChunks: TextChunk[] = [];

    for (const page of crawledPages) {
      const pageChunks = await this.chunkSinglePage(page);
      allChunks.push(...pageChunks);
    }

    console.log(`Created ${allChunks.length} chunks from ${crawledPages.length} pages`);
    return allChunks;
  }

  private async chunkSinglePage(page: CrawledPage): Promise<TextChunk[]> {
    const chunks: TextChunk[] = [];
    
    // Clean and prepare the text
    const cleanedContent = this.cleanText(page.content);
    
    if (cleanedContent.length < this.config.min_chunk_size) {
      // If content is too short, create a single chunk
      const chunk: TextChunk = {
        id: uuidv4(),
        content: cleanedContent,
        metadata: {
          source_url: page.url,
          chunk_index: 0,
          word_count: cleanedContent.split(/\s+/).length,
          created_at: new Date().toISOString(),
        }
      };
      chunks.push(chunk);
      return chunks;
    }

    // Split content into sentences for better chunking boundaries
    const sentences = this.splitIntoSentences(cleanedContent);
    
    let currentChunk = '';
    let chunkIndex = 0;
    let sentenceIndex = 0;

    while (sentenceIndex < sentences.length) {
      const sentence = sentences[sentenceIndex];
      
      // Check if adding this sentence would exceed max chunk size
      if (currentChunk.length + sentence.length > this.config.max_chunk_size && currentChunk.length > 0) {
        // Create chunk from current content
        if (currentChunk.trim().length >= this.config.min_chunk_size) {
          const chunk: TextChunk = {
            id: uuidv4(),
            content: currentChunk.trim(),
            metadata: {
              source_url: page.url,
              chunk_index: chunkIndex,
              word_count: currentChunk.trim().split(/\s+/).length,
              created_at: new Date().toISOString(),
            }
          };
          chunks.push(chunk);
          chunkIndex++;
        }

        // Start new chunk with overlap
        currentChunk = this.createOverlap(currentChunk) + sentence;
      } else {
        // Add sentence to current chunk
        currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentence;
      }

      sentenceIndex++;
    }

    // Add final chunk if it has content
    if (currentChunk.trim().length >= this.config.min_chunk_size) {
      const chunk: TextChunk = {
        id: uuidv4(),
        content: currentChunk.trim(),
        metadata: {
          source_url: page.url,
          chunk_index: chunkIndex,
          word_count: currentChunk.trim().split(/\s+/).length,
          created_at: new Date().toISOString(),
        }
      };
      chunks.push(chunk);
    }

    return chunks;
  }

  private cleanText(text: string): string {
    return text
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters that might interfere with processing
      .replace(/[^\w\s\.,!?;:()\-"']/g, '')
      // Remove multiple consecutive punctuation
      .replace(/[.]{2,}/g, '.')
      .replace(/[!]{2,}/g, '!')
      .replace(/[?]{2,}/g, '?')
      // Trim
      .trim();
  }

  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - could be enhanced with more sophisticated NLP
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .filter(sentence => sentence.trim().length > 0)
      .map(sentence => sentence.trim());

    // Merge very short sentences with the next one
    const mergedSentences: string[] = [];
    let currentSentence = '';

    for (const sentence of sentences) {
      if (currentSentence.length === 0) {
        currentSentence = sentence;
      } else if (currentSentence.length < 50 && sentence.length < 50) {
        // Merge short sentences
        currentSentence += ' ' + sentence;
      } else {
        mergedSentences.push(currentSentence);
        currentSentence = sentence;
      }
    }

    if (currentSentence.length > 0) {
      mergedSentences.push(currentSentence);
    }

    return mergedSentences;
  }

  private createOverlap(previousChunk: string): string {
    if (previousChunk.length <= this.config.overlap_size) {
      return previousChunk + ' ';
    }

    // Take the last overlap_size characters, but try to break at word boundary
    const overlapText = previousChunk.slice(-this.config.overlap_size);
    const lastSpaceIndex = overlapText.indexOf(' ');
    
    if (lastSpaceIndex > 0) {
      return overlapText.slice(lastSpaceIndex + 1) + ' ';
    }
    
    return overlapText + ' ';
  }

  /**
   * Utility method to get chunking statistics
   */
  getChunkingStats(chunks: TextChunk[]): {
    total_chunks: number;
    avg_chunk_size: number;
    min_chunk_size: number;
    max_chunk_size: number;
    total_words: number;
  } {
    if (chunks.length === 0) {
      return {
        total_chunks: 0,
        avg_chunk_size: 0,
        min_chunk_size: 0,
        max_chunk_size: 0,
        total_words: 0,
      };
    }

    const chunkSizes = chunks.map(chunk => chunk.content.length);
    const totalWords = chunks.reduce((sum, chunk) => sum + chunk.metadata.word_count, 0);

    return {
      total_chunks: chunks.length,
      avg_chunk_size: Math.round(chunkSizes.reduce((sum, size) => sum + size, 0) / chunks.length),
      min_chunk_size: Math.min(...chunkSizes),
      max_chunk_size: Math.max(...chunkSizes),
      total_words: totalWords,
    };
  }
}

// Add uuid dependency to package.json if not already present
// This would typically be done via: npm install uuid @types/uuid
