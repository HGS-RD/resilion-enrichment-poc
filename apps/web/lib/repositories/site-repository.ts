/**
 * Site Repository
 * 
 * Repository implementation for Site data model operations
 */

import { Pool } from 'pg';
import { Site, SiteRepository } from '../types/data-model';

export class PostgresSiteRepository implements SiteRepository {
  constructor(private pool: Pool) {}

  async create(site: Omit<Site, 'siteId' | 'lastVerifiedDate'>): Promise<Site> {
    const query = `
      INSERT INTO sites (
        organization_id, site_name, address, city, state_province, country, postal_code,
        geo_coordinates, site_type, site_purpose, certifications, operating_status,
        production_capacity, employee_count, plant_manager, regulatory_ids,
        supply_chain_dependencies, major_products, evidence_text, source,
        confidence_score, enrichment_job_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING 
        site_id as "siteId",
        organization_id as "organizationId",
        site_name as "siteName",
        address,
        city,
        state_province as "stateProvince",
        country,
        postal_code as "postalCode",
        geo_coordinates as "geoCoordinates",
        site_type as "siteType",
        site_purpose as "sitePurpose",
        certifications,
        operating_status as "operatingStatus",
        production_capacity as "productionCapacity",
        employee_count as "employeeCount",
        plant_manager as "plantManager",
        regulatory_ids as "regulatoryIds",
        supply_chain_dependencies as "supplyChainDependencies",
        major_products as "majorProducts",
        evidence_text as "evidenceText",
        source,
        confidence_score as "confidenceScore",
        last_verified_date as "lastVerifiedDate",
        enrichment_job_id as "enrichmentJobId"
    `;

    const values = [
      site.organizationId,
      site.siteName,
      site.address,
      site.city,
      site.stateProvince,
      site.country,
      site.postalCode,
      site.geoCoordinates ? JSON.stringify(site.geoCoordinates) : null,
      site.siteType,
      site.sitePurpose,
      JSON.stringify(site.certifications),
      site.operatingStatus,
      site.productionCapacity,
      site.employeeCount,
      site.plantManager,
      JSON.stringify(site.regulatoryIds),
      JSON.stringify(site.supplyChainDependencies),
      JSON.stringify(site.majorProducts),
      site.evidenceText,
      site.source,
      site.confidenceScore,
      site.enrichmentJobId
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findById(siteId: string): Promise<Site | null> {
    const query = `
      SELECT 
        site_id as "siteId",
        organization_id as "organizationId",
        site_name as "siteName",
        address,
        city,
        state_province as "stateProvince",
        country,
        postal_code as "postalCode",
        geo_coordinates as "geoCoordinates",
        site_type as "siteType",
        site_purpose as "sitePurpose",
        certifications,
        operating_status as "operatingStatus",
        production_capacity as "productionCapacity",
        employee_count as "employeeCount",
        plant_manager as "plantManager",
        regulatory_ids as "regulatoryIds",
        supply_chain_dependencies as "supplyChainDependencies",
        major_products as "majorProducts",
        evidence_text as "evidenceText",
        source,
        confidence_score as "confidenceScore",
        last_verified_date as "lastVerifiedDate",
        enrichment_job_id as "enrichmentJobId"
      FROM sites 
      WHERE site_id = $1
    `;

    const result = await this.pool.query(query, [siteId]);
    return result.rows[0] || null;
  }

  async findByOrganizationId(organizationId: string): Promise<Site[]> {
    const query = `
      SELECT 
        site_id as "siteId",
        organization_id as "organizationId",
        site_name as "siteName",
        address,
        city,
        state_province as "stateProvince",
        country,
        postal_code as "postalCode",
        geo_coordinates as "geoCoordinates",
        site_type as "siteType",
        site_purpose as "sitePurpose",
        certifications,
        operating_status as "operatingStatus",
        production_capacity as "productionCapacity",
        employee_count as "employeeCount",
        plant_manager as "plantManager",
        regulatory_ids as "regulatoryIds",
        supply_chain_dependencies as "supplyChainDependencies",
        major_products as "majorProducts",
        evidence_text as "evidenceText",
        source,
        confidence_score as "confidenceScore",
        last_verified_date as "lastVerifiedDate",
        enrichment_job_id as "enrichmentJobId"
      FROM sites 
      WHERE organization_id = $1
      ORDER BY confidence_score DESC, site_name
    `;

    const result = await this.pool.query(query, [organizationId]);
    return result.rows;
  }

  async findByEnrichmentJobId(enrichmentJobId: string): Promise<Site[]> {
    const query = `
      SELECT 
        site_id as "siteId",
        organization_id as "organizationId",
        site_name as "siteName",
        address,
        city,
        state_province as "stateProvince",
        country,
        postal_code as "postalCode",
        geo_coordinates as "geoCoordinates",
        site_type as "siteType",
        site_purpose as "sitePurpose",
        certifications,
        operating_status as "operatingStatus",
        production_capacity as "productionCapacity",
        employee_count as "employeeCount",
        plant_manager as "plantManager",
        regulatory_ids as "regulatoryIds",
        supply_chain_dependencies as "supplyChainDependencies",
        major_products as "majorProducts",
        evidence_text as "evidenceText",
        source,
        confidence_score as "confidenceScore",
        last_verified_date as "lastVerifiedDate",
        enrichment_job_id as "enrichmentJobId"
      FROM sites 
      WHERE enrichment_job_id = $1
      ORDER BY confidence_score DESC, site_name
    `;

    const result = await this.pool.query(query, [enrichmentJobId]);
    return result.rows;
  }

  async update(siteId: string, updates: Partial<Site>): Promise<Site> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic update query
    const updateableFields = [
      'siteName', 'address', 'city', 'stateProvince', 'country', 'postalCode',
      'geoCoordinates', 'siteType', 'sitePurpose', 'certifications', 'operatingStatus',
      'productionCapacity', 'employeeCount', 'plantManager', 'regulatoryIds',
      'supplyChainDependencies', 'majorProducts', 'evidenceText', 'source', 'confidenceScore'
    ];

    const fieldMapping = {
      siteName: 'site_name',
      stateProvince: 'state_province',
      postalCode: 'postal_code',
      geoCoordinates: 'geo_coordinates',
      siteType: 'site_type',
      sitePurpose: 'site_purpose',
      operatingStatus: 'operating_status',
      productionCapacity: 'production_capacity',
      employeeCount: 'employee_count',
      plantManager: 'plant_manager',
      regulatoryIds: 'regulatory_ids',
      supplyChainDependencies: 'supply_chain_dependencies',
      majorProducts: 'major_products',
      evidenceText: 'evidence_text',
      confidenceScore: 'confidence_score'
    };

    for (const field of updateableFields) {
      if (updates[field as keyof Site] !== undefined) {
        const dbField = fieldMapping[field as keyof typeof fieldMapping] || field;
        setClause.push(`${dbField} = $${paramIndex++}`);
        
        const value = updates[field as keyof Site];
        if (['certifications', 'regulatoryIds', 'supplyChainDependencies', 'majorProducts', 'geoCoordinates'].includes(field)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(siteId);

    const query = `
      UPDATE sites 
      SET ${setClause.join(', ')}, last_verified_date = CURRENT_TIMESTAMP
      WHERE site_id = $${paramIndex}
      RETURNING 
        site_id as "siteId",
        organization_id as "organizationId",
        site_name as "siteName",
        address,
        city,
        state_province as "stateProvince",
        country,
        postal_code as "postalCode",
        geo_coordinates as "geoCoordinates",
        site_type as "siteType",
        site_purpose as "sitePurpose",
        certifications,
        operating_status as "operatingStatus",
        production_capacity as "productionCapacity",
        employee_count as "employeeCount",
        plant_manager as "plantManager",
        regulatory_ids as "regulatoryIds",
        supply_chain_dependencies as "supplyChainDependencies",
        major_products as "majorProducts",
        evidence_text as "evidenceText",
        source,
        confidence_score as "confidenceScore",
        last_verified_date as "lastVerifiedDate",
        enrichment_job_id as "enrichmentJobId"
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`Site with ID ${siteId} not found`);
    }
    return result.rows[0];
  }

  async delete(siteId: string): Promise<void> {
    const query = 'DELETE FROM sites WHERE site_id = $1';
    const result = await this.pool.query(query, [siteId]);
    
    if (result.rowCount === 0) {
      throw new Error(`Site with ID ${siteId} not found`);
    }
  }

  // Query methods for analysis
  async findByConfidenceThreshold(threshold: number): Promise<Site[]> {
    const query = `
      SELECT 
        site_id as "siteId",
        organization_id as "organizationId",
        site_name as "siteName",
        address,
        city,
        state_province as "stateProvince",
        country,
        postal_code as "postalCode",
        geo_coordinates as "geoCoordinates",
        site_type as "siteType",
        site_purpose as "sitePurpose",
        certifications,
        operating_status as "operatingStatus",
        production_capacity as "productionCapacity",
        employee_count as "employeeCount",
        plant_manager as "plantManager",
        regulatory_ids as "regulatoryIds",
        supply_chain_dependencies as "supplyChainDependencies",
        major_products as "majorProducts",
        evidence_text as "evidenceText",
        source,
        confidence_score as "confidenceScore",
        last_verified_date as "lastVerifiedDate",
        enrichment_job_id as "enrichmentJobId"
      FROM sites 
      WHERE confidence_score >= $1
      ORDER BY confidence_score DESC, site_name
    `;

    const result = await this.pool.query(query, [threshold]);
    return result.rows;
  }

  async findByOperatingStatus(status: Site['operatingStatus']): Promise<Site[]> {
    const query = `
      SELECT 
        site_id as "siteId",
        organization_id as "organizationId",
        site_name as "siteName",
        address,
        city,
        state_province as "stateProvince",
        country,
        postal_code as "postalCode",
        geo_coordinates as "geoCoordinates",
        site_type as "siteType",
        site_purpose as "sitePurpose",
        certifications,
        operating_status as "operatingStatus",
        production_capacity as "productionCapacity",
        employee_count as "employeeCount",
        plant_manager as "plantManager",
        regulatory_ids as "regulatoryIds",
        supply_chain_dependencies as "supplyChainDependencies",
        major_products as "majorProducts",
        evidence_text as "evidenceText",
        source,
        confidence_score as "confidenceScore",
        last_verified_date as "lastVerifiedDate",
        enrichment_job_id as "enrichmentJobId"
      FROM sites 
      WHERE operating_status = $1
      ORDER BY confidence_score DESC, site_name
    `;

    const result = await this.pool.query(query, [status]);
    return result.rows;
  }

  async findBySiteType(siteType: string): Promise<Site[]> {
    const query = `
      SELECT 
        site_id as "siteId",
        organization_id as "organizationId",
        site_name as "siteName",
        address,
        city,
        state_province as "stateProvince",
        country,
        postal_code as "postalCode",
        geo_coordinates as "geoCoordinates",
        site_type as "siteType",
        site_purpose as "sitePurpose",
        certifications,
        operating_status as "operatingStatus",
        production_capacity as "productionCapacity",
        employee_count as "employeeCount",
        plant_manager as "plantManager",
        regulatory_ids as "regulatoryIds",
        supply_chain_dependencies as "supplyChainDependencies",
        major_products as "majorProducts",
        evidence_text as "evidenceText",
        source,
        confidence_score as "confidenceScore",
        last_verified_date as "lastVerifiedDate",
        enrichment_job_id as "enrichmentJobId"
      FROM sites 
      WHERE site_type ILIKE $1
      ORDER BY confidence_score DESC, site_name
    `;

    const result = await this.pool.query(query, [`%${siteType}%`]);
    return result.rows;
  }

  // Additional utility methods
  async getSiteStats(): Promise<{
    total: number;
    byOperatingStatus: Record<string, number>;
    bySiteType: Record<string, number>;
    averageConfidence: number;
    withCoordinates: number;
    withEmployeeCount: number;
  }> {
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        AVG(confidence_score) as average_confidence,
        COUNT(CASE WHEN geo_coordinates IS NOT NULL THEN 1 END) as with_coordinates,
        COUNT(CASE WHEN employee_count IS NOT NULL THEN 1 END) as with_employee_count
      FROM sites
    `;

    const statusQuery = `
      SELECT operating_status, COUNT(*) as count
      FROM sites
      WHERE operating_status IS NOT NULL
      GROUP BY operating_status
    `;

    const typeQuery = `
      SELECT site_type, COUNT(*) as count
      FROM sites
      WHERE site_type IS NOT NULL
      GROUP BY site_type
      ORDER BY count DESC
    `;

    const [statsResult, statusResult, typeResult] = await Promise.all([
      this.pool.query(statsQuery),
      this.pool.query(statusQuery),
      this.pool.query(typeQuery)
    ]);

    const stats = statsResult.rows[0];
    const byOperatingStatus: Record<string, number> = {};
    const bySiteType: Record<string, number> = {};

    statusResult.rows.forEach(row => {
      byOperatingStatus[row.operating_status] = parseInt(row.count);
    });

    typeResult.rows.forEach(row => {
      bySiteType[row.site_type] = parseInt(row.count);
    });

    return {
      total: parseInt(stats.total),
      byOperatingStatus,
      bySiteType,
      averageConfidence: parseFloat(stats.average_confidence) || 0,
      withCoordinates: parseInt(stats.with_coordinates),
      withEmployeeCount: parseInt(stats.with_employee_count)
    };
  }

  async findByLocation(city?: string, stateProvince?: string, country?: string): Promise<Site[]> {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (city) {
      conditions.push(`city ILIKE $${paramIndex++}`);
      values.push(`%${city}%`);
    }
    if (stateProvince) {
      conditions.push(`state_province ILIKE $${paramIndex++}`);
      values.push(`%${stateProvince}%`);
    }
    if (country) {
      conditions.push(`country ILIKE $${paramIndex++}`);
      values.push(`%${country}%`);
    }

    if (conditions.length === 0) {
      throw new Error('At least one location parameter must be provided');
    }

    const query = `
      SELECT 
        site_id as "siteId",
        organization_id as "organizationId",
        site_name as "siteName",
        address,
        city,
        state_province as "stateProvince",
        country,
        postal_code as "postalCode",
        geo_coordinates as "geoCoordinates",
        site_type as "siteType",
        site_purpose as "sitePurpose",
        certifications,
        operating_status as "operatingStatus",
        production_capacity as "productionCapacity",
        employee_count as "employeeCount",
        plant_manager as "plantManager",
        regulatory_ids as "regulatoryIds",
        supply_chain_dependencies as "supplyChainDependencies",
        major_products as "majorProducts",
        evidence_text as "evidenceText",
        source,
        confidence_score as "confidenceScore",
        last_verified_date as "lastVerifiedDate",
        enrichment_job_id as "enrichmentJobId"
      FROM sites 
      WHERE ${conditions.join(' AND ')}
      ORDER BY confidence_score DESC, site_name
    `;

    const result = await this.pool.query(query, values);
    return result.rows;
  }
}
