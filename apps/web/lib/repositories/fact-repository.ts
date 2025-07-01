import { Pool } from 'pg';
import { EnrichmentFact, FactRepository as IFactRepository } from '../types/enrichment';
import { getDatabasePool } from '../utils/database';

/**
 * Fact Repository Implementation
 * 
 * Handles all database operations for enrichment facts.
 * Implements the FactRepository interface defined in types.
 */

export class FactRepository implements IFactRepository {
  private pool: Pool;

  constructor() {
    this.pool = getDatabasePool();
  }

  /**
   * Creates a new enrichment fact
   */
  async create(fact: Omit<EnrichmentFact, 'id' | 'created_at'>): Promise<EnrichmentFact> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO enrichment_facts (
          job_id, fact_type, fact_data, confidence_score,
          source_url, source_text, embedding_id, validated, validation_notes,
          tier_used
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        ) RETURNING *
      `;
      
      const values = [
        fact.job_id,
        fact.fact_type,
        JSON.stringify(fact.fact_data),
        fact.confidence_score,
        fact.source_url,
        fact.source_text,
        fact.embedding_id,
        fact.validated,
        fact.validation_notes,
        fact.tier_used
      ];
      
      const result = await client.query(query, values);
      const row = result.rows[0];
      
      return this.mapRowToFact(row);
    } finally {
      client.release();
    }
  }

  /**
   * Creates multiple facts in a batch transaction
   */
  async createBatch(facts: Omit<EnrichmentFact, 'id' | 'created_at'>[]): Promise<EnrichmentFact[]> {
    if (facts.length === 0) {
      return [];
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const createdFacts: EnrichmentFact[] = [];
      
      for (const fact of facts) {
        const query = `
          INSERT INTO enrichment_facts (
            job_id, fact_type, fact_data, confidence_score,
            source_url, source_text, embedding_id, validated, validation_notes,
            tier_used
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
          ) RETURNING *
        `;
        
        const values = [
          fact.job_id,
          fact.fact_type,
          JSON.stringify(fact.fact_data),
          fact.confidence_score,
          fact.source_url,
          fact.source_text,
          fact.embedding_id,
          fact.validated,
          fact.validation_notes,
          fact.tier_used
        ];
        
        const result = await client.query(query, values);
        createdFacts.push(this.mapRowToFact(result.rows[0]));
      }
      
      await client.query('COMMIT');
      return createdFacts;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Finds all facts for a job
   */
  async findByJobId(jobId: string): Promise<EnrichmentFact[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM enrichment_facts 
        WHERE job_id = $1 
        ORDER BY confidence_score DESC, created_at DESC
      `;
      const result = await client.query(query, [jobId]);
      
      return result.rows.map(row => this.mapRowToFact(row));
    } finally {
      client.release();
    }
  }

  /**
   * Finds facts by type
   */
  async findByType(factType: string, limit: number = 100): Promise<EnrichmentFact[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM enrichment_facts 
        WHERE fact_type = $1 
        ORDER BY confidence_score DESC, created_at DESC
        LIMIT $2
      `;
      const result = await client.query(query, [factType, limit]);
      
      return result.rows.map(row => this.mapRowToFact(row));
    } finally {
      client.release();
    }
  }

  /**
   * Finds facts above a confidence threshold
   */
  async findByConfidenceThreshold(threshold: number, limit: number = 100): Promise<EnrichmentFact[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM enrichment_facts 
        WHERE confidence_score >= $1 
        ORDER BY confidence_score DESC, created_at DESC
        LIMIT $2
      `;
      const result = await client.query(query, [threshold, limit]);
      
      return result.rows.map(row => this.mapRowToFact(row));
    } finally {
      client.release();
    }
  }

  /**
   * Updates fact validation status
   */
  async updateValidation(id: string, validated: boolean, notes?: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE enrichment_facts 
        SET validated = $2, validation_notes = $3
        WHERE id = $1
      `;
      
      await client.query(query, [id, validated, notes]);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes a fact by ID
   */
  async delete(id: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = 'DELETE FROM enrichment_facts WHERE id = $1';
      await client.query(query, [id]);
    } finally {
      client.release();
    }
  }

  /**
   * Deletes all facts for a job
   */
  async deleteByJobId(jobId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = 'DELETE FROM enrichment_facts WHERE job_id = $1';
      await client.query(query, [jobId]);
    } finally {
      client.release();
    }
  }

  /**
   * Gets fact statistics for a job
   */
  async getJobStatistics(jobId: string): Promise<{
    total_facts: number;
    validated_facts: number;
    fact_types: Record<string, number>;
    avg_confidence: number;
  }> {
    const client = await this.pool.connect();
    
    try {
      // Get basic stats
      const statsQuery = `
        SELECT 
          COUNT(*) as total_facts,
          COUNT(*) FILTER (WHERE validated = true) as validated_facts,
          AVG(confidence_score) as avg_confidence
        FROM enrichment_facts 
        WHERE job_id = $1
      `;
      const statsResult = await client.query(statsQuery, [jobId]);
      const stats = statsResult.rows[0];
      
      // Get fact type distribution
      const typesQuery = `
        SELECT fact_type, COUNT(*) as count
        FROM enrichment_facts 
        WHERE job_id = $1
        GROUP BY fact_type
        ORDER BY count DESC
      `;
      const typesResult = await client.query(typesQuery, [jobId]);
      
      const fact_types: Record<string, number> = {};
      for (const row of typesResult.rows) {
        fact_types[row.fact_type] = parseInt(row.count);
      }
      
      return {
        total_facts: parseInt(stats.total_facts),
        validated_facts: parseInt(stats.validated_facts),
        fact_types,
        avg_confidence: parseFloat(stats.avg_confidence) || 0
      };
    } finally {
      client.release();
    }
  }

  /**
   * Searches facts by text content
   */
  async searchByText(searchTerm: string, limit: number = 50): Promise<EnrichmentFact[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM enrichment_facts 
        WHERE 
          source_text ILIKE $1 OR 
          fact_data::text ILIKE $1
        ORDER BY confidence_score DESC, created_at DESC
        LIMIT $2
      `;
      const result = await client.query(query, [`%${searchTerm}%`, limit]);
      
      return result.rows.map(row => this.mapRowToFact(row));
    } finally {
      client.release();
    }
  }

  /**
   * Finds facts by tier
   */
  async findByTier(tier: number, limit: number = 100): Promise<EnrichmentFact[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM enrichment_facts 
        WHERE tier_used = $1 
        ORDER BY confidence_score DESC, created_at DESC
        LIMIT $2
      `;
      const result = await client.query(query, [tier, limit]);
      
      return result.rows.map(row => this.mapRowToFact(row));
    } finally {
      client.release();
    }
  }

  /**
   * Gets tier statistics for a job
   */
  async getTierStatistics(jobId: string): Promise<{
    tier_distribution: Record<number, number>;
    tier_confidence: Record<number, number>;
  }> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          tier_used,
          COUNT(*) as count,
          AVG(confidence_score) as avg_confidence
        FROM enrichment_facts 
        WHERE job_id = $1 AND tier_used IS NOT NULL
        GROUP BY tier_used
        ORDER BY tier_used
      `;
      const result = await client.query(query, [jobId]);
      
      const tier_distribution: Record<number, number> = {};
      const tier_confidence: Record<number, number> = {};
      
      for (const row of result.rows) {
        const tier = parseInt(row.tier_used);
        tier_distribution[tier] = parseInt(row.count);
        tier_confidence[tier] = parseFloat(row.avg_confidence) || 0;
      }
      
      return {
        tier_distribution,
        tier_confidence
      };
    } finally {
      client.release();
    }
  }

  /**
   * Maps database row to EnrichmentFact object
   */
  private mapRowToFact(row: any): EnrichmentFact {
    return {
      id: row.id,
      job_id: row.job_id,
      fact_type: row.fact_type,
      fact_data: typeof row.fact_data === 'string' ? JSON.parse(row.fact_data) : row.fact_data,
      confidence_score: parseFloat(row.confidence_score),
      source_url: row.source_url,
      source_text: row.source_text,
      embedding_id: row.embedding_id,
      created_at: row.created_at.toISOString(),
      validated: row.validated,
      validation_notes: row.validation_notes,
      
      // Milestone 1 additions
      tier_used: row.tier_used
    };
  }

  /**
   * Closes the database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
