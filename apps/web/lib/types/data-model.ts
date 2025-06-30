/**
 * Data Model Types
 * 
 * Types that align with the Pre-Loader Data Model Specification v1.0
 * These represent the hierarchical structure: Organization -> Sites -> EnrichmentJobs
 */

export interface Organization {
  organizationId: string; // UUID
  companyName: string;
  website: string;
  headquartersAddress: string;
  industrySectors: string[]; // Array of industry categories or NAICS codes
  parentCompany?: string;
  subsidiaries: string[];
  lastVerifiedDate: string; // ISO timestamp
}

export interface Site {
  siteId: string; // UUID
  organizationId: string; // Foreign key to Organization
  siteName: string;
  address: string;
  city: string;
  stateProvince: string;
  country: string;
  postalCode: string;
  geoCoordinates?: {
    latitude: number;
    longitude: number;
  };
  siteType: string; // manufacturing, distribution, refinery, substation, etc.
  sitePurpose: string; // Brief description of what is produced/processed/stored
  certifications: string[]; // Array of certifications (ISO, FDA, etc.)
  operatingStatus: 'active' | 'under_construction' | 'inactive' | 'closed';
  productionCapacity?: string; // Numeric + units if available
  employeeCount?: number;
  plantManager?: string;
  regulatoryIds: string[]; // Array of OSHA/EPA permit numbers if applicable
  supplyChainDependencies: string[]; // Array of known inputs/outputs
  majorProducts: string[]; // Array of known major products
  evidenceText: string; // Supporting snippet from source
  source: string; // URL or publication reference
  confidenceScore: number; // 0-1 float
  lastVerifiedDate: string; // ISO timestamp
  enrichmentJobId: string; // Associated enrichment job ID
}

export interface EnrichmentJobRecord {
  enrichmentJobId: string; // UUID
  triggeredBy: string; // User or system
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp
  status: 'pending' | 'running' | 'completed' | 'failed';
  confidenceSummary?: number; // Average confidence across all site facts
  errors?: string; // Error message(s) if any
  partialSuccess: boolean;
  retriedCount: number;
  inputDomain: string; // Domain name being enriched
}

// Extended types for enrichment processing
export interface SiteCandidate {
  siteName: string;
  address?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  siteType?: string;
  sitePurpose?: string;
  evidenceText: string;
  source: string;
  confidenceScore: number;
  extractionMethod: 'regex' | 'llm' | 'structured';
}

export interface OrganizationCandidate {
  companyName: string;
  website?: string;
  headquartersAddress?: string;
  industrySectors?: string[];
  parentCompany?: string;
  subsidiaries?: string[];
  evidenceText: string;
  source: string;
  confidenceScore: number;
}

// Repository interfaces for the data model
export interface OrganizationRepository {
  create(organization: Omit<Organization, 'organizationId' | 'lastVerifiedDate'>): Promise<Organization>;
  findById(organizationId: string): Promise<Organization | null>;
  findByDomain(domain: string): Promise<Organization | null>;
  update(organizationId: string, updates: Partial<Organization>): Promise<Organization>;
  delete(organizationId: string): Promise<void>;
}

export interface SiteRepository {
  create(site: Omit<Site, 'siteId' | 'lastVerifiedDate'>): Promise<Site>;
  findById(siteId: string): Promise<Site | null>;
  findByOrganizationId(organizationId: string): Promise<Site[]>;
  findByEnrichmentJobId(enrichmentJobId: string): Promise<Site[]>;
  update(siteId: string, updates: Partial<Site>): Promise<Site>;
  delete(siteId: string): Promise<void>;
  
  // Query methods for analysis
  findByConfidenceThreshold(threshold: number): Promise<Site[]>;
  findByOperatingStatus(status: Site['operatingStatus']): Promise<Site[]>;
  findBySiteType(siteType: string): Promise<Site[]>;
}

export interface EnrichmentJobRecordRepository {
  create(job: Omit<EnrichmentJobRecord, 'enrichmentJobId'>): Promise<EnrichmentJobRecord>;
  findById(enrichmentJobId: string): Promise<EnrichmentJobRecord | null>;
  findByDomain(inputDomain: string): Promise<EnrichmentJobRecord[]>;
  findByStatus(status: EnrichmentJobRecord['status']): Promise<EnrichmentJobRecord[]>;
  update(enrichmentJobId: string, updates: Partial<EnrichmentJobRecord>): Promise<EnrichmentJobRecord>;
  delete(enrichmentJobId: string): Promise<void>;
  
  // Analytics methods
  getJobStats(): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
    running: number;
    averageProcessingTime: number;
  }>;
}

// Job completion validation
export interface JobCompletionCriteria {
  hasMinimumSiteData: boolean;
  hasOrganizationData: boolean;
  meetsConfidenceThreshold: boolean;
  withinTimeLimit: boolean;
}

export interface JobCompletionValidator {
  validateCompletion(
    organization: Organization | null,
    sites: Site[],
    job: EnrichmentJobRecord
  ): JobCompletionCriteria;
  
  isJobComplete(criteria: JobCompletionCriteria): boolean;
}

// Data transformation utilities
export interface DataModelTransformer {
  // Convert enrichment facts to site candidates
  factsToSiteCandidates(facts: any[]): SiteCandidate[];
  
  // Convert site candidates to sites
  siteCandidatesToSites(
    candidates: SiteCandidate[],
    organizationId: string,
    enrichmentJobId: string
  ): Omit<Site, 'siteId' | 'lastVerifiedDate'>[];
  
  // Convert enrichment facts to organization candidate
  factsToOrganizationCandidate(facts: any[], domain: string): OrganizationCandidate;
  
  // Convert organization candidate to organization
  organizationCandidateToOrganization(
    candidate: OrganizationCandidate
  ): Omit<Organization, 'organizationId' | 'lastVerifiedDate'>;
}

// Constants for validation
export const DATA_MODEL_CONSTANTS = {
  MIN_CONFIDENCE_SCORE: 0.7,
  MAX_JOB_RUNTIME_MINUTES: 30,
  MAX_RETRY_COUNT: 3,
  REQUIRED_SITE_FIELDS: ['siteName', 'siteType', 'address', 'evidenceText', 'source'],
  REQUIRED_ORGANIZATION_FIELDS: ['companyName', 'website', 'headquartersAddress']
} as const;

// Site type enumeration
export const SITE_TYPES = {
  MANUFACTURING: 'manufacturing',
  DISTRIBUTION: 'distribution',
  REFINERY: 'refinery',
  SUBSTATION: 'substation',
  OFFICE: 'office',
  HEADQUARTERS: 'headquarters',
  RESEARCH: 'research',
  WAREHOUSE: 'warehouse',
  RETAIL: 'retail',
  DATA_CENTER: 'data_center'
} as const;

export type SiteType = typeof SITE_TYPES[keyof typeof SITE_TYPES];

// Operating status enumeration
export const OPERATING_STATUS = {
  ACTIVE: 'active',
  UNDER_CONSTRUCTION: 'under_construction',
  INACTIVE: 'inactive',
  CLOSED: 'closed'
} as const;

export type OperatingStatus = typeof OPERATING_STATUS[keyof typeof OPERATING_STATUS];
