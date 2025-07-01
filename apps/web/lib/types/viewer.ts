/**
 * TypeScript interfaces for the Resilion Enrichment Fact Viewer
 * These types match the hierarchical JSON data model from the blueprint
 */

export interface Evidence {
  evidenceId: string;
  snippet: string;
  sourceURL: string;
  confidenceScore: number;
  lastVerified: string;
  tier: string;
}

export interface Contact {
  contactId: string;
  phoneNumber?: string;
  email?: string;
  linkedToOrganizationId?: string;
  linkedToSiteId?: string;
  evidence: Evidence[];
}

export interface Person {
  personId: string;
  name: string;
  role: string;
  linkedToOrgOrSite: string;
  contactInfo?: string;
  evidence: Evidence[];
}

export interface Certification {
  certificationId: string;
  name: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  linkedSiteId: string;
  evidence: Evidence[];
}

export interface Product {
  productId: string;
  name: string;
  description: string;
  applications: string[];
  linkedSiteId: string;
  evidence: Evidence[];
}

export interface Technology {
  technologyId: string;
  name: string;
  description: string;
  linkedSiteId: string;
  evidence: Evidence[];
}

export interface Capability {
  capabilityId: string;
  name: string;
  description: string;
  linkedSiteId: string;
  evidence: Evidence[];
}

export interface Site {
  siteId: string;
  organizationId: string;
  name: string;
  addressStreet: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  siteType: 'Manufacturing' | 'Distribution' | 'R&D' | 'Headquarters' | 'Office' | 'Other';
  sitePurpose?: string;
  operatingStatus: 'Active' | 'Inactive' | 'Under Construction' | 'Closed';
  employeeCount?: number;
  productionCapacity?: string;
  parentCompany?: string;
  certifications: Certification[];
  products: Product[];
  technologies: Technology[];
  capabilities: Capability[];
  contacts: Contact[];
  evidence: Evidence[];
}

export interface Organization {
  organizationId: string;
  name: string;
  website: string;
  headquarters: string;
  industry: string;
  industrySectors: string[];
  financialSummary?: string;
  contacts: Contact[];
  evidence: Evidence[];
}

export interface EnrichmentViewerData {
  organization: Organization;
  sites: Site[];
  people: Person[];
}

// Additional types for UI components
export interface SiteMapPin {
  siteId: string;
  name: string;
  latitude: number;
  longitude: number;
  siteType: Site['siteType'];
  operatingStatus: Site['operatingStatus'];
}

export interface OrganizationSummary {
  name: string;
  headquarters: string;
  industry: string;
  website: string;
  lastEnrichmentDate?: string;
  financialSummary?: string;
  totalSites: number;
  activeSites: number;
}
