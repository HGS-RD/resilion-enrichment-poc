/**
 * Viewer Data Service
 * 
 * Service for transforming database data into the viewer format
 * Handles the conversion between database models and viewer types
 */

import { getDatabasePool } from '../utils/database';
import { PostgresOrganizationRepository } from '../repositories/organization-repository';
import { PostgresSiteRepository } from '../repositories/site-repository';
import { FactRepository } from '../repositories/fact-repository';
import { EnrichmentViewerData, Site as ViewerSite, Person, Evidence } from '../types/viewer';
import { Organization, Site as DatabaseSite } from '../types/data-model';
import { GeocodingService } from './geocoding-service';

export class ViewerDataService {
  private organizationRepo: PostgresOrganizationRepository;
  private siteRepo: PostgresSiteRepository;
  private factRepo: FactRepository;

  constructor() {
    const pool = getDatabasePool();
    this.organizationRepo = new PostgresOrganizationRepository(pool);
    this.siteRepo = new PostgresSiteRepository(pool);
    this.factRepo = new FactRepository();
  }

  /**
   * Get enrichment viewer data for a domain
   */
  async getViewerDataByDomain(domain: string): Promise<EnrichmentViewerData | null> {
    try {
      // Get facts for the domain first
      const facts = await this.factRepo.findByDomain(domain);
      
      if (facts.length === 0) {
        return null; // No facts found for this domain
      }

      // Try to find organization by domain
      let organization = await this.organizationRepo.findByDomain(domain);
      
      // If no organization found, create a fallback from facts
      if (!organization) {
        organization = this.createFallbackOrganization(domain, facts);
      }

      // Get sites for the organization (if any exist in database)
      const sites = await this.siteRepo.findByOrganizationId(organization.organizationId);

      // Extract location sites from facts
      const locationSites = this.extractSitesFromLocationFacts(facts, organization.organizationId);

      // Combine database sites with location sites from facts
      const allSites = [
        ...sites.map(site => this.transformSite(site)),
        ...locationSites
      ];

      // Transform data to viewer format
      const viewerData: EnrichmentViewerData = {
        organization: this.transformOrganization(organization, facts),
        sites: allSites,
        people: this.extractPeopleFromFacts(facts, organization.organizationId)
      };

      return viewerData;
    } catch (error) {
      console.error('Error fetching viewer data:', error);
      throw error;
    }
  }

  /**
   * Transform database organization to viewer format
   */
  private transformOrganization(org: Organization, facts: any[]): EnrichmentViewerData['organization'] {
    // Extract financial summary from facts
    const financialFacts = facts.filter(f => f.fact_type === 'financial_metric' || f.fact_type === 'metric');
    const financialSummary = this.extractFinancialSummary(financialFacts);

    // Extract industry from facts or use stored data
    const industryFacts = facts.filter(f => f.fact_type === 'company_info' && f.fact_data?.industry);
    const industry = industryFacts.length > 0 
      ? industryFacts[0].fact_data.industry 
      : (org.industrySectors && org.industrySectors.length > 0 ? org.industrySectors[0] : 'Unknown');

    return {
      organizationId: org.organizationId,
      name: org.companyName,
      website: org.website || '',
      headquarters: org.headquartersAddress || 'Unknown',
      industry: industry,
      industrySectors: org.industrySectors || [],
      financialSummary: financialSummary,
      contacts: this.extractContactsFromFacts(facts),
      evidence: this.extractOrganizationEvidence(facts)
    };
  }

  /**
   * Transform database site to viewer format
   */
  private transformSite(site: DatabaseSite): ViewerSite {
    // Parse geo coordinates
    let latitude: number | undefined;
    let longitude: number | undefined;
    
    if (site.geoCoordinates) {
      try {
        const coords = typeof site.geoCoordinates === 'string' 
          ? JSON.parse(site.geoCoordinates) 
          : site.geoCoordinates;
        
        if (coords && typeof coords === 'object') {
          latitude = coords.latitude || coords.lat;
          longitude = coords.longitude || coords.lng || coords.lon;
        }
      } catch (error) {
        console.warn('Failed to parse geo coordinates:', error);
      }
    }

    // Parse certifications
    let certifications: ViewerSite['certifications'] = [];
    if (site.certifications) {
      try {
        const certs = typeof site.certifications === 'string' 
          ? JSON.parse(site.certifications) 
          : site.certifications;
        
        if (Array.isArray(certs)) {
          certifications = certs.map((cert, index) => ({
            certificationId: `cert-${site.siteId}-${index}`,
            name: typeof cert === 'string' ? cert : cert.name || cert.certification || 'Unknown',
            issuer: typeof cert === 'object' ? cert.issuer || 'Unknown' : 'Unknown',
            validFrom: typeof cert === 'object' ? cert.validFrom || cert.valid_from || '2024-01-01' : '2024-01-01',
            validTo: typeof cert === 'object' ? cert.validTo || cert.valid_to || '2027-01-01' : '2027-01-01',
            linkedSiteId: site.siteId,
            evidence: [{
              evidenceId: `evidence-cert-${site.siteId}-${index}`,
              snippet: `${typeof cert === 'string' ? cert : cert.name} certification found`,
              sourceURL: site.source || '',
              confidenceScore: site.confidenceScore || 0.8,
              lastVerified: site.lastVerifiedDate ? new Date(site.lastVerifiedDate).toISOString() : new Date().toISOString(),
              tier: site.confidenceScore && site.confidenceScore > 0.8 ? 'Tier 1' : 'Tier 2'
            }]
          }));
        }
      } catch (error) {
        console.warn('Failed to parse certifications:', error);
      }
    }

    // Parse major products
    let products: ViewerSite['products'] = [];
    if (site.majorProducts) {
      try {
        const prods = typeof site.majorProducts === 'string' 
          ? JSON.parse(site.majorProducts) 
          : site.majorProducts;
        
        if (Array.isArray(prods)) {
          products = prods.map((prod, index) => ({
            productId: `product-${site.siteId}-${index}`,
            name: typeof prod === 'string' ? prod : prod.name || prod.product || 'Unknown Product',
            description: typeof prod === 'object' ? prod.description || `${prod.name} production` : `${prod} production`,
            applications: typeof prod === 'object' && Array.isArray(prod.applications) ? prod.applications : ['Industrial'],
            linkedSiteId: site.siteId,
            evidence: [{
              evidenceId: `evidence-product-${site.siteId}-${index}`,
              snippet: `${typeof prod === 'string' ? prod : prod.name} production mentioned`,
              sourceURL: site.source || '',
              confidenceScore: site.confidenceScore || 0.8,
              lastVerified: site.lastVerifiedDate ? new Date(site.lastVerifiedDate).toISOString() : new Date().toISOString(),
              tier: site.confidenceScore && site.confidenceScore > 0.8 ? 'Tier 1' : 'Tier 2'
            }]
          }));
        }
      } catch (error) {
        console.warn('Failed to parse major products:', error);
      }
    }

    return {
      siteId: site.siteId,
      organizationId: site.organizationId,
      name: site.siteName || 'Unknown Site',
      addressStreet: site.address || '',
      city: site.city || '',
      stateProvince: site.stateProvince || '',
      postalCode: site.postalCode || '',
      country: site.country || '',
      latitude,
      longitude,
      siteType: this.normalizeSiteType(site.siteType),
      sitePurpose: site.sitePurpose || '',
      operatingStatus: this.normalizeOperatingStatus(site.operatingStatus),
      employeeCount: site.employeeCount,
      productionCapacity: site.productionCapacity,
      parentCompany: '', // Not available in current schema
      certifications,
      products,
      technologies: [], // Would need to be extracted from facts or separate table
      capabilities: [], // Would need to be extracted from facts or separate table
      contacts: [], // Would need to be extracted from facts or separate table
      evidence: [{
        evidenceId: `evidence-site-${site.siteId}`,
        snippet: site.evidenceText || `${site.siteName} site information`,
        sourceURL: site.source || '',
        confidenceScore: site.confidenceScore || 0.8,
        lastVerified: site.lastVerifiedDate ? new Date(site.lastVerifiedDate).toISOString() : new Date().toISOString(),
        tier: site.confidenceScore && site.confidenceScore > 0.8 ? 'Tier 1' : 'Tier 2'
      }]
    };
  }

  /**
   * Normalize site type to match viewer expectations
   */
  private normalizeSiteType(siteType: string | null): ViewerSite['siteType'] {
    if (!siteType) return 'Manufacturing';
    
    const normalized = siteType.toLowerCase();
    if (normalized.includes('manufacturing') || normalized.includes('plant') || normalized.includes('factory')) {
      return 'Manufacturing';
    }
    if (normalized.includes('r&d') || normalized.includes('research') || normalized.includes('development')) {
      return 'R&D';
    }
    if (normalized.includes('headquarters') || normalized.includes('hq') || normalized.includes('corporate')) {
      return 'Headquarters';
    }
    if (normalized.includes('distribution') || normalized.includes('warehouse') || normalized.includes('logistics')) {
      return 'Distribution';
    }
    
    return 'Manufacturing'; // Default fallback
  }

  /**
   * Normalize operating status to match viewer expectations
   */
  private normalizeOperatingStatus(status: string | null): ViewerSite['operatingStatus'] {
    if (!status) return 'Active';
    
    const normalized = status.toLowerCase();
    if (normalized.includes('active') || normalized.includes('operational') || normalized.includes('running')) {
      return 'Active';
    }
    if (normalized.includes('inactive') || normalized.includes('idle') || normalized.includes('shutdown')) {
      return 'Inactive';
    }
    if (normalized.includes('construction') || normalized.includes('building') || normalized.includes('development')) {
      return 'Under Construction';
    }
    if (normalized.includes('closed') || normalized.includes('decommissioned') || normalized.includes('abandoned')) {
      return 'Closed';
    }
    
    return 'Active'; // Default fallback
  }

  /**
   * Extract financial summary from facts
   */
  private extractFinancialSummary(financialFacts: any[]): string | undefined {
    if (financialFacts.length === 0) return undefined;
    
    // Look for revenue facts first
    const revenueFacts = financialFacts.filter(f => 
      f.fact_data?.metric_name?.toLowerCase().includes('revenue') ||
      f.fact_data?.name?.toLowerCase().includes('revenue')
    );
    
    if (revenueFacts.length > 0) {
      const revenue = revenueFacts[0];
      const value = revenue.fact_data?.value || revenue.fact_data?.amount;
      if (value) {
        return `${value} revenue`;
      }
    }
    
    // Fallback to any financial metric
    const firstMetric = financialFacts[0];
    const value = firstMetric.fact_data?.value || firstMetric.fact_data?.amount;
    if (value) {
      return `${value}`;
    }
    
    return undefined;
  }

  /**
   * Extract contacts from facts
   */
  private extractContactsFromFacts(facts: any[]): EnrichmentViewerData['organization']['contacts'] {
    const contactFacts = facts.filter(f => 
      f.fact_type === 'contact_info' || 
      (f.fact_type === 'company_info' && (f.fact_data?.phone || f.fact_data?.email))
    );
    
    return contactFacts.map((fact, index) => ({
      contactId: `contact-${fact.fact_id || index}`,
      phoneNumber: fact.fact_data?.phone || fact.fact_data?.phoneNumber || '',
      email: fact.fact_data?.email || '',
      linkedToOrganizationId: fact.organization_id || '',
      evidence: [{
        evidenceId: `evidence-contact-${fact.fact_id || index}`,
        snippet: fact.evidence_text || 'Contact information found',
        sourceURL: fact.source_url || '',
        confidenceScore: fact.confidence_score || 0.8,
        lastVerified: fact.last_verified ? new Date(fact.last_verified).toISOString() : new Date().toISOString(),
        tier: fact.confidence_score && fact.confidence_score > 0.8 ? 'Tier 1' : 'Tier 2'
      }]
    }));
  }

  /**
   * Extract organization evidence from facts
   */
  private extractOrganizationEvidence(facts: any[]): Evidence[] {
    return facts
      .filter(f => f.fact_type === 'company_info')
      .slice(0, 5) // Limit to top 5 pieces of evidence
      .map((fact, index) => ({
        evidenceId: `evidence-org-${fact.fact_id || index}`,
        snippet: fact.evidence_text || 'Company information found',
        sourceURL: fact.source_url || '',
        confidenceScore: fact.confidence_score || 0.8,
        lastVerified: fact.last_verified ? new Date(fact.last_verified).toISOString() : new Date().toISOString(),
        tier: fact.confidence_score && fact.confidence_score > 0.8 ? 'Tier 1' : 'Tier 2'
      }));
  }

  /**
   * Extract people from facts
   */
  private extractPeopleFromFacts(facts: any[], organizationId: string): Person[] {
    const peopleFacts = facts.filter(f => 
      f.fact_type === 'person' || 
      (f.fact_type === 'company_info' && f.fact_data?.people)
    );
    
    const people: Person[] = [];
    
    peopleFacts.forEach((fact, index) => {
      if (fact.fact_data?.people && Array.isArray(fact.fact_data.people)) {
        fact.fact_data.people.forEach((person: any, personIndex: number) => {
          people.push({
            personId: `person-${fact.fact_id || index}-${personIndex}`,
            name: person.name || 'Unknown',
            role: person.role || person.title || 'Unknown',
            linkedToOrgOrSite: organizationId,
            contactInfo: person.email || person.contact || '',
            evidence: [{
              evidenceId: `evidence-person-${fact.fact_id || index}-${personIndex}`,
              snippet: fact.evidence_text || `${person.name} mentioned`,
              sourceURL: fact.source_url || '',
              confidenceScore: fact.confidence_score || 0.8,
              lastVerified: fact.last_verified ? new Date(fact.last_verified).toISOString() : new Date().toISOString(),
              tier: fact.confidence_score && fact.confidence_score > 0.8 ? 'Tier 1' : 'Tier 2'
            }]
          });
        });
      } else if (fact.fact_data?.name) {
        people.push({
          personId: `person-${fact.fact_id || index}`,
          name: fact.fact_data.name,
          role: fact.fact_data.role || fact.fact_data.title || 'Unknown',
          linkedToOrgOrSite: organizationId,
          contactInfo: fact.fact_data.email || fact.fact_data.contact || '',
          evidence: [{
            evidenceId: `evidence-person-${fact.fact_id || index}`,
            snippet: fact.evidence_text || `${fact.fact_data.name} mentioned`,
            sourceURL: fact.source_url || '',
            confidenceScore: fact.confidence_score || 0.8,
            lastVerified: fact.last_verified ? new Date(fact.last_verified).toISOString() : new Date().toISOString(),
            tier: fact.confidence_score && fact.confidence_score > 0.8 ? 'Tier 1' : 'Tier 2'
          }]
        });
      }
    });
    
    return people;
  }

  /**
   * Extract sites from location facts
   */
  private extractSitesFromLocationFacts(facts: any[], organizationId: string): ViewerSite[] {
    const locationFacts = facts.filter(f => f.fact_type === 'location');
    const sites: ViewerSite[] = [];
    
    locationFacts.forEach((fact, index) => {
      const factData = fact.fact_data;
      if (!factData) return;

      // Extract location information
      const city = factData.city || '';
      const state = factData.state || '';
      const country = factData.country || '';
      const address = factData.address || '';
      
      // Create a unique site name from location data
      let siteName = '';
      if (city && country) {
        siteName = `${city}, ${country}`;
      } else if (city) {
        siteName = city;
      } else if (address) {
        siteName = address;
      } else {
        siteName = `Location ${index + 1}`;
      }

      // Try to extract coordinates if available
      let latitude: number | undefined;
      let longitude: number | undefined;
      
      if (factData.coordinates) {
        latitude = factData.coordinates.lat || factData.coordinates.latitude;
        longitude = factData.coordinates.lng || factData.coordinates.longitude || factData.coordinates.lon;
      }
      
      // If no coordinates found, try geocoding
      if (!latitude || !longitude) {
        const geocodedCoords = GeocodingService.getCoordinatesFromLocation(factData);
        if (geocodedCoords) {
          latitude = geocodedCoords.latitude;
          longitude = geocodedCoords.longitude;
        }
      }

      // Determine site type based on context
      let siteType: ViewerSite['siteType'] = 'Manufacturing';
      const sourceText = fact.source_text?.toLowerCase() || '';
      if (sourceText.includes('headquarters') || sourceText.includes('hq')) {
        siteType = 'Headquarters';
      } else if (sourceText.includes('research') || sourceText.includes('r&d')) {
        siteType = 'R&D';
      } else if (sourceText.includes('distribution') || sourceText.includes('warehouse')) {
        siteType = 'Distribution';
      }

      const site: ViewerSite = {
        siteId: `fact-site-${fact.id}`,
        organizationId: organizationId,
        name: siteName,
        addressStreet: address,
        city: city,
        stateProvince: state,
        postalCode: factData.postalCode || factData.zipCode || '',
        country: country,
        latitude,
        longitude,
        siteType,
        sitePurpose: factData.purpose || '',
        operatingStatus: 'Active',
        employeeCount: factData.employeeCount,
        productionCapacity: factData.capacity,
        parentCompany: '',
        certifications: [],
        products: [],
        technologies: [],
        capabilities: [],
        contacts: [],
        evidence: [{
          evidenceId: `evidence-location-${fact.id}`,
          snippet: fact.source_text || `Location information: ${siteName}`,
          sourceURL: fact.source_url || '',
          confidenceScore: fact.confidence_score || 0.8,
          lastVerified: fact.created_at || new Date().toISOString(),
          tier: fact.confidence_score && fact.confidence_score > 0.8 ? 'Tier 1' : 'Tier 2'
        }]
      };

      sites.push(site);
    });

    return sites;
  }

  /**
   * Create a fallback organization from facts when no organization record exists
   */
  private createFallbackOrganization(domain: string, facts: any[]): Organization {
    // Extract company info from facts
    const companyInfoFacts = facts.filter(f => f.fact_type === 'company_info');
    
    let companyName = domain.split('.')[0]; // Default to domain name
    let industry = 'Unknown';
    let headquarters = 'Unknown';
    
    if (companyInfoFacts.length > 0) {
      const companyInfo = companyInfoFacts[0].fact_data;
      if (companyInfo?.name) {
        companyName = companyInfo.name;
      }
      if (companyInfo?.industry) {
        industry = companyInfo.industry;
      }
      if (companyInfo?.headquarters) {
        headquarters = companyInfo.headquarters;
      }
    }

    // Create a fallback organization object
    return {
      organizationId: `fallback-${domain}`,
      companyName: companyName,
      website: `https://${domain}`,
      headquartersAddress: headquarters,
      industrySectors: [industry],
      parentCompany: undefined,
      subsidiaries: [],
      lastVerifiedDate: new Date().toISOString()
    };
  }
}
