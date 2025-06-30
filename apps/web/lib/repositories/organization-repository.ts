/**
 * Organization Repository
 * 
 * Repository implementation for Organization data model operations
 */

import { Pool } from 'pg';
import { Organization, OrganizationRepository } from '../types/data-model';

export class PostgresOrganizationRepository implements OrganizationRepository {
  constructor(private pool: Pool) {}

  async create(organization: Omit<Organization, 'organizationId' | 'lastVerifiedDate'>): Promise<Organization> {
    const query = `
      INSERT INTO organizations (
        company_name, website, headquarters_address, 
        industry_sectors, parent_company, subsidiaries
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING 
        organization_id as "organizationId",
        company_name as "companyName",
        website,
        headquarters_address as "headquartersAddress",
        industry_sectors as "industrySectors",
        parent_company as "parentCompany",
        subsidiaries,
        last_verified_date as "lastVerifiedDate"
    `;

    const values = [
      organization.companyName,
      organization.website,
      organization.headquartersAddress,
      JSON.stringify(organization.industrySectors),
      organization.parentCompany,
      JSON.stringify(organization.subsidiaries)
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findById(organizationId: string): Promise<Organization | null> {
    const query = `
      SELECT 
        organization_id as "organizationId",
        company_name as "companyName",
        website,
        headquarters_address as "headquartersAddress",
        industry_sectors as "industrySectors",
        parent_company as "parentCompany",
        subsidiaries,
        last_verified_date as "lastVerifiedDate"
      FROM organizations 
      WHERE organization_id = $1
    `;

    const result = await this.pool.query(query, [organizationId]);
    return result.rows[0] || null;
  }

  async findByDomain(domain: string): Promise<Organization | null> {
    // Extract domain from website URL for matching
    const query = `
      SELECT 
        organization_id as "organizationId",
        company_name as "companyName",
        website,
        headquarters_address as "headquartersAddress",
        industry_sectors as "industrySectors",
        parent_company as "parentCompany",
        subsidiaries,
        last_verified_date as "lastVerifiedDate"
      FROM organizations 
      WHERE website ILIKE $1 OR website ILIKE $2 OR website ILIKE $3
      ORDER BY 
        CASE 
          WHEN website ILIKE $1 THEN 1
          WHEN website ILIKE $2 THEN 2
          ELSE 3
        END
      LIMIT 1
    `;

    const domainPatterns = [
      `%${domain}%`,
      `%www.${domain}%`,
      `%://${domain}%`
    ];

    const result = await this.pool.query(query, domainPatterns);
    return result.rows[0] || null;
  }

  async update(organizationId: string, updates: Partial<Organization>): Promise<Organization> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (updates.companyName !== undefined) {
      setClause.push(`company_name = $${paramIndex++}`);
      values.push(updates.companyName);
    }
    if (updates.website !== undefined) {
      setClause.push(`website = $${paramIndex++}`);
      values.push(updates.website);
    }
    if (updates.headquartersAddress !== undefined) {
      setClause.push(`headquarters_address = $${paramIndex++}`);
      values.push(updates.headquartersAddress);
    }
    if (updates.industrySectors !== undefined) {
      setClause.push(`industry_sectors = $${paramIndex++}`);
      values.push(JSON.stringify(updates.industrySectors));
    }
    if (updates.parentCompany !== undefined) {
      setClause.push(`parent_company = $${paramIndex++}`);
      values.push(updates.parentCompany);
    }
    if (updates.subsidiaries !== undefined) {
      setClause.push(`subsidiaries = $${paramIndex++}`);
      values.push(JSON.stringify(updates.subsidiaries));
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(organizationId);

    const query = `
      UPDATE organizations 
      SET ${setClause.join(', ')}, last_verified_date = CURRENT_TIMESTAMP
      WHERE organization_id = $${paramIndex}
      RETURNING 
        organization_id as "organizationId",
        company_name as "companyName",
        website,
        headquarters_address as "headquartersAddress",
        industry_sectors as "industrySectors",
        parent_company as "parentCompany",
        subsidiaries,
        last_verified_date as "lastVerifiedDate"
    `;

    const result = await this.pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error(`Organization with ID ${organizationId} not found`);
    }
    return result.rows[0];
  }

  async delete(organizationId: string): Promise<void> {
    const query = 'DELETE FROM organizations WHERE organization_id = $1';
    const result = await this.pool.query(query, [organizationId]);
    
    if (result.rowCount === 0) {
      throw new Error(`Organization with ID ${organizationId} not found`);
    }
  }

  // Additional utility methods
  async findByCompanyName(companyName: string): Promise<Organization[]> {
    const query = `
      SELECT 
        organization_id as "organizationId",
        company_name as "companyName",
        website,
        headquarters_address as "headquartersAddress",
        industry_sectors as "industrySectors",
        parent_company as "parentCompany",
        subsidiaries,
        last_verified_date as "lastVerifiedDate"
      FROM organizations 
      WHERE company_name ILIKE $1
      ORDER BY company_name
    `;

    const result = await this.pool.query(query, [`%${companyName}%`]);
    return result.rows;
  }

  async findByIndustrySector(sector: string): Promise<Organization[]> {
    const query = `
      SELECT 
        organization_id as "organizationId",
        company_name as "companyName",
        website,
        headquarters_address as "headquartersAddress",
        industry_sectors as "industrySectors",
        parent_company as "parentCompany",
        subsidiaries,
        last_verified_date as "lastVerifiedDate"
      FROM organizations 
      WHERE industry_sectors::text ILIKE $1
      ORDER BY company_name
    `;

    const result = await this.pool.query(query, [`%${sector}%`]);
    return result.rows;
  }

  async getOrganizationStats(): Promise<{
    total: number;
    withWebsites: number;
    withHeadquarters: number;
    withSubsidiaries: number;
    averageSitesPerOrg: number;
  }> {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN website IS NOT NULL AND website != '' THEN 1 END) as with_websites,
        COUNT(CASE WHEN headquarters_address IS NOT NULL AND headquarters_address != '' THEN 1 END) as with_headquarters,
        COUNT(CASE WHEN jsonb_array_length(subsidiaries) > 0 THEN 1 END) as with_subsidiaries,
        COALESCE(AVG(site_counts.site_count), 0) as average_sites_per_org
      FROM organizations o
      LEFT JOIN (
        SELECT organization_id, COUNT(*) as site_count
        FROM sites
        GROUP BY organization_id
      ) site_counts ON o.organization_id = site_counts.organization_id
    `;

    const result = await this.pool.query(query);
    const row = result.rows[0];

    return {
      total: parseInt(row.total),
      withWebsites: parseInt(row.with_websites),
      withHeadquarters: parseInt(row.with_headquarters),
      withSubsidiaries: parseInt(row.with_subsidiaries),
      averageSitesPerOrg: parseFloat(row.average_sites_per_org)
    };
  }
}
