import { z } from 'zod';
import { EnrichmentFact } from '../types/enrichment';

/**
 * JSON Schema Validation for AI-Extracted Facts
 * 
 * This module provides comprehensive validation for facts extracted by AI
 * to ensure data quality and consistency before persistence.
 */

// Base fact data schemas for different fact types
const CompanyInfoSchema = z.object({
  name: z.string().min(1).optional(),
  industry: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  founded: z.string().optional(),
  employees: z.string().optional(),
  revenue: z.string().optional(),
  website: z.string().url().optional(),
  ticker: z.string().optional(),
  type: z.enum(['public', 'private', 'subsidiary', 'partnership']).optional()
});

const LocationSchema = z.object({
  headquarters: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  postal_code: z.string().optional(),
  facility_size: z.string().optional(),
  facilities: z.array(z.string()).optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

const ContactSchema = z.object({
  phone: z.string().min(1).optional(),
  email: z.string().email().optional(),
  fax: z.string().optional(),
  address: z.string().min(1).optional(),
  contact_person: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  hours: z.string().optional()
});

const PersonSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  linkedin: z.string().url().optional(),
  bio: z.string().optional()
});

const ProductSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  specifications: z.record(z.string()).optional(),
  price: z.string().optional(),
  availability: z.string().optional(),
  part_number: z.string().optional(),
  applications: z.array(z.string()).optional()
});

const ServiceSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  target_industries: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional()
});

const TechnologySchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).optional(),
  version: z.string().optional(),
  description: z.string().min(1).optional(),
  use_case: z.string().optional(),
  vendor: z.string().optional(),
  integration: z.string().optional()
});

const MetricSchema = z.object({
  name: z.string().min(1),
  value: z.union([z.string(), z.number()]),
  unit: z.string().optional(),
  period: z.string().optional(),
  source: z.string().optional(),
  date: z.string().optional()
});

const CertificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().min(1).optional(),
  standard: z.string().optional(),
  issued_date: z.string().optional(),
  expiry_date: z.string().optional(),
  scope: z.string().optional()
});

const PartnershipSchema = z.object({
  partner_name: z.string().min(1),
  type: z.enum(['supplier', 'customer', 'distributor', 'technology', 'strategic']).optional(),
  description: z.string().optional(),
  since: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional()
});

const CapabilitySchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  capacity: z.string().optional(),
  equipment: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  materials: z.array(z.string()).optional()
});

// Main fact schema
const FactSchema = z.object({
  fact_type: z.enum([
    'company_info', 'product', 'service', 'location', 'contact',
    'person', 'technology', 'metric', 'certification', 'partnership', 'capability'
  ]),
  fact_data: z.record(z.any()), // Will be validated based on fact_type
  confidence_score: z.number().min(0).max(1),
  source_text: z.string().min(1).max(500)
});

// Extraction result schema
const ExtractionResultSchema = z.object({
  facts: z.array(FactSchema)
});

/**
 * Schema validator class for fact extraction results
 */
export class FactSchemaValidator {
  private factTypeSchemas: Record<string, z.ZodSchema>;

  constructor() {
    this.factTypeSchemas = {
      'company_info': CompanyInfoSchema,
      'location': LocationSchema,
      'contact': ContactSchema,
      'person': PersonSchema,
      'product': ProductSchema,
      'service': ServiceSchema,
      'technology': TechnologySchema,
      'metric': MetricSchema,
      'certification': CertificationSchema,
      'partnership': PartnershipSchema,
      'capability': CapabilitySchema
    };
  }

  /**
   * Validates the complete extraction result from AI
   */
  validateExtractionResult(result: any): {
    isValid: boolean;
    validFacts: any[];
    invalidFacts: any[];
    errors: string[];
  } {
    const errors: string[] = [];
    const validFacts: any[] = [];
    const invalidFacts: any[] = [];

    try {
      // First validate the overall structure
      const parsed = ExtractionResultSchema.parse(result);
      
      // Then validate each fact individually
      for (let i = 0; i < parsed.facts.length; i++) {
        const fact = parsed.facts[i];
        const factValidation = this.validateSingleFact(fact, i);
        
        if (factValidation.isValid) {
          validFacts.push(factValidation.fact);
        } else {
          invalidFacts.push(fact);
          errors.push(...factValidation.errors);
        }
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(`Schema validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      } else {
        errors.push(`Validation error: ${error}`);
      }
    }

    return {
      isValid: errors.length === 0,
      validFacts,
      invalidFacts,
      errors
    };
  }

  /**
   * Validates a single fact
   */
  validateSingleFact(fact: any, index?: number): {
    isValid: boolean;
    fact?: any;
    errors: string[];
  } {
    const errors: string[] = [];
    const prefix = index !== undefined ? `Fact ${index}: ` : '';

    try {
      // Validate basic fact structure
      const basicFact = FactSchema.parse(fact);
      
      // Validate fact_data based on fact_type
      const factTypeSchema = this.factTypeSchemas[basicFact.fact_type];
      if (factTypeSchema) {
        try {
          const validatedFactData = factTypeSchema.parse(basicFact.fact_data);
          return {
            isValid: true,
            fact: {
              ...basicFact,
              fact_data: validatedFactData
            },
            errors: []
          };
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(`${prefix}Invalid fact_data for type '${basicFact.fact_type}': ${error.errors.map(e => e.message).join(', ')}`);
          } else {
            errors.push(`${prefix}Fact data validation error: ${error}`);
          }
        }
      } else {
        errors.push(`${prefix}Unknown fact_type: ${basicFact.fact_type}`);
      }

    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(`${prefix}Basic fact validation failed: ${error.errors.map(e => e.message).join(', ')}`);
      } else {
        errors.push(`${prefix}Fact validation error: ${error}`);
      }
    }

    return {
      isValid: false,
      errors
    };
  }

  /**
   * Validates and sanitizes facts for database insertion
   */
  validateForPersistence(facts: Partial<EnrichmentFact>[]): {
    validFacts: Partial<EnrichmentFact>[];
    invalidFacts: Partial<EnrichmentFact>[];
    errors: string[];
  } {
    const validFacts: Partial<EnrichmentFact>[] = [];
    const invalidFacts: Partial<EnrichmentFact>[] = [];
    const errors: string[] = [];

    for (let i = 0; i < facts.length; i++) {
      const fact = facts[i];
      const validation = this.validateFactForPersistence(fact, i);
      
      if (validation.isValid && validation.fact) {
        validFacts.push(validation.fact);
      } else {
        invalidFacts.push(fact);
        errors.push(...validation.errors);
      }
    }

    return { validFacts, invalidFacts, errors };
  }

  /**
   * Validates a single fact for database persistence
   */
  private validateFactForPersistence(fact: Partial<EnrichmentFact>, index: number): {
    isValid: boolean;
    fact?: Partial<EnrichmentFact>;
    errors: string[];
  } {
    const errors: string[] = [];
    const prefix = `Fact ${index}: `;

    // Check required fields
    if (!fact.job_id) {
      errors.push(`${prefix}Missing job_id`);
    }

    if (!fact.fact_type) {
      errors.push(`${prefix}Missing fact_type`);
    }

    if (!fact.fact_data || Object.keys(fact.fact_data).length === 0) {
      errors.push(`${prefix}Missing or empty fact_data`);
    }

    if (fact.confidence_score === undefined || fact.confidence_score < 0 || fact.confidence_score > 1) {
      errors.push(`${prefix}Invalid confidence_score: must be between 0 and 1`);
    }

    if (!fact.source_text || fact.source_text.trim().length === 0) {
      errors.push(`${prefix}Missing source_text`);
    }

    // Validate fact_data structure if fact_type is valid
    if (fact.fact_type && fact.fact_data) {
      const factValidation = this.validateSingleFact({
        fact_type: fact.fact_type,
        fact_data: fact.fact_data,
        confidence_score: fact.confidence_score || 0,
        source_text: fact.source_text || ''
      });

      if (!factValidation.isValid) {
        errors.push(...factValidation.errors);
      }
    }

    // Sanitize text fields
    const sanitizedFact = { ...fact };
    if (sanitizedFact.source_text) {
      sanitizedFact.source_text = sanitizedFact.source_text.trim().substring(0, 500);
    }

    return {
      isValid: errors.length === 0,
      fact: errors.length === 0 ? sanitizedFact : undefined,
      errors
    };
  }

  /**
   * Gets the schema for a specific fact type
   */
  getFactTypeSchema(factType: string): z.ZodSchema | null {
    return this.factTypeSchemas[factType] || null;
  }

  /**
   * Gets all supported fact types
   */
  getSupportedFactTypes(): string[] {
    return Object.keys(this.factTypeSchemas);
  }

  /**
   * Validates JSON string and parses it
   */
  validateAndParseJSON(jsonString: string): {
    isValid: boolean;
    parsed?: any;
    error?: string;
  } {
    try {
      const parsed = JSON.parse(jsonString);
      return { isValid: true, parsed };
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export singleton instance
export const factSchemaValidator = new FactSchemaValidator();

// Export schemas for testing
export {
  CompanyInfoSchema,
  LocationSchema,
  ContactSchema,
  PersonSchema,
  ProductSchema,
  ServiceSchema,
  TechnologySchema,
  MetricSchema,
  CertificationSchema,
  PartnershipSchema,
  CapabilitySchema,
  FactSchema,
  ExtractionResultSchema
};
