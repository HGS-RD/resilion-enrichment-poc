import { describe, it, expect } from 'vitest';
import { factSchemaValidator, CompanyInfoSchema, LocationSchema } from '../../../apps/web/lib/services/schema-validator';

describe('FactSchemaValidator', () => {
  describe('validateExtractionResult', () => {
    it('should validate a valid extraction result', () => {
      const validResult = {
        facts: [
          {
            fact_type: 'company_info',
            fact_data: {
              name: 'ACME Corp',
              industry: 'Manufacturing',
              description: 'Leading manufacturer'
            },
            confidence_score: 0.95,
            source_text: 'ACME Corp is a leading manufacturer'
          },
          {
            fact_type: 'location',
            fact_data: {
              headquarters: 'Detroit, MI',
              facility_size: '50,000 sq ft'
            },
            confidence_score: 0.88,
            source_text: 'Located in Detroit, MI with 50,000 sq ft facility'
          }
        ]
      };

      const validation = factSchemaValidator.validateExtractionResult(validResult);

      expect(validation.isValid).toBe(true);
      expect(validation.validFacts).toHaveLength(2);
      expect(validation.invalidFacts).toHaveLength(0);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject facts with invalid fact_type', () => {
      const invalidResult = {
        facts: [
          {
            fact_type: 'invalid_type',
            fact_data: { name: 'Test' },
            confidence_score: 0.95,
            source_text: 'Test text'
          }
        ]
      };

      const validation = factSchemaValidator.validateExtractionResult(invalidResult);

      expect(validation.isValid).toBe(false);
      expect(validation.validFacts).toHaveLength(0);
      expect(validation.invalidFacts).toHaveLength(1);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should reject facts with low confidence scores', () => {
      const lowConfidenceResult = {
        facts: [
          {
            fact_type: 'company_info',
            fact_data: { name: 'Test Company' },
            confidence_score: 0.5, // Below minimum threshold
            source_text: 'Test text'
          }
        ]
      };

      const validation = factSchemaValidator.validateExtractionResult(lowConfidenceResult);

      expect(validation.isValid).toBe(false);
      expect(validation.validFacts).toHaveLength(0);
      expect(validation.invalidFacts).toHaveLength(1);
    });

    it('should reject facts with missing required fields', () => {
      const incompleteResult = {
        facts: [
          {
            fact_type: 'company_info',
            // Missing fact_data
            confidence_score: 0.95,
            source_text: 'Test text'
          }
        ]
      };

      const validation = factSchemaValidator.validateExtractionResult(incompleteResult);

      expect(validation.isValid).toBe(false);
      expect(validation.validFacts).toHaveLength(0);
      expect(validation.invalidFacts).toHaveLength(1);
    });

    it('should handle malformed JSON structure', () => {
      const malformedResult = {
        // Missing facts array
        invalid_structure: true
      };

      const validation = factSchemaValidator.validateExtractionResult(malformedResult);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateSingleFact', () => {
    it('should validate a valid company_info fact', () => {
      const validFact = {
        fact_type: 'company_info',
        fact_data: {
          name: 'ACME Corp',
          industry: 'Manufacturing',
          founded: '1985',
          employees: '500-1000'
        },
        confidence_score: 0.95,
        source_text: 'ACME Corp was founded in 1985'
      };

      const validation = factSchemaValidator.validateSingleFact(validFact);

      expect(validation.isValid).toBe(true);
      expect(validation.fact).toBeDefined();
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate a valid location fact', () => {
      const validFact = {
        fact_type: 'location',
        fact_data: {
          headquarters: 'Detroit, MI',
          address: '123 Main St',
          city: 'Detroit',
          state: 'Michigan',
          country: 'USA'
        },
        confidence_score: 0.92,
        source_text: 'Headquarters located at 123 Main St, Detroit, MI'
      };

      const validation = factSchemaValidator.validateSingleFact(validFact);

      expect(validation.isValid).toBe(true);
      expect(validation.fact).toBeDefined();
      expect(validation.errors).toHaveLength(0);
    });

    it('should validate a valid person fact', () => {
      const validFact = {
        fact_type: 'person',
        fact_data: {
          name: 'John Smith',
          title: 'CEO',
          department: 'Executive',
          email: 'john.smith@example.com'
        },
        confidence_score: 0.88,
        source_text: 'John Smith, CEO of the company'
      };

      const validation = factSchemaValidator.validateSingleFact(validFact);

      expect(validation.isValid).toBe(true);
      expect(validation.fact).toBeDefined();
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject person fact with invalid email', () => {
      const invalidFact = {
        fact_type: 'person',
        fact_data: {
          name: 'John Smith',
          email: 'invalid-email' // Invalid email format
        },
        confidence_score: 0.88,
        source_text: 'John Smith contact info'
      };

      const validation = factSchemaValidator.validateSingleFact(invalidFact);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Invalid email');
    });

    it('should reject fact with confidence score out of range', () => {
      const invalidFact = {
        fact_type: 'company_info',
        fact_data: { name: 'Test Company' },
        confidence_score: 1.5, // Above maximum
        source_text: 'Test text'
      };

      const validation = factSchemaValidator.validateSingleFact(invalidFact);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateForPersistence', () => {
    it('should validate facts ready for database persistence', () => {
      const factsForPersistence = [
        {
          job_id: 'job-123',
          fact_type: 'company_info',
          fact_data: { name: 'ACME Corp', industry: 'Manufacturing' },
          confidence_score: 0.95,
          source_text: 'ACME Corp is a manufacturing company',
          validated: false
        },
        {
          job_id: 'job-123',
          fact_type: 'location',
          fact_data: { headquarters: 'Detroit, MI' },
          confidence_score: 0.88,
          source_text: 'Located in Detroit, MI',
          validated: false
        }
      ];

      const validation = factSchemaValidator.validateForPersistence(factsForPersistence);

      expect(validation.validFacts).toHaveLength(2);
      expect(validation.invalidFacts).toHaveLength(0);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject facts missing required fields for persistence', () => {
      const invalidFacts = [
        {
          // Missing job_id
          fact_type: 'company_info',
          fact_data: { name: 'Test Company' },
          confidence_score: 0.95,
          source_text: 'Test text',
          validated: false
        },
        {
          job_id: 'job-123',
          fact_type: 'location',
          fact_data: { headquarters: 'Detroit, MI' },
          // Missing confidence_score
          source_text: 'Located in Detroit, MI',
          validated: false
        }
      ];

      const validation = factSchemaValidator.validateForPersistence(invalidFacts);

      expect(validation.validFacts).toHaveLength(0);
      expect(validation.invalidFacts).toHaveLength(2);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should sanitize source_text length', () => {
      const longSourceText = 'A'.repeat(1000); // Very long text
      const factsWithLongText = [
        {
          job_id: 'job-123',
          fact_type: 'company_info',
          fact_data: { name: 'Test Company' },
          confidence_score: 0.95,
          source_text: longSourceText,
          validated: false
        }
      ];

      const validation = factSchemaValidator.validateForPersistence(factsWithLongText);

      expect(validation.validFacts).toHaveLength(1);
      expect(validation.validFacts[0].source_text?.length).toBeLessThanOrEqual(500);
    });
  });

  describe('validateAndParseJSON', () => {
    it('should parse valid JSON', () => {
      const validJson = '{"facts": [{"fact_type": "company_info", "fact_data": {"name": "Test"}}]}';
      
      const result = factSchemaValidator.validateAndParseJSON(validJson);

      expect(result.isValid).toBe(true);
      expect(result.parsed).toBeDefined();
      expect(result.parsed.facts).toBeDefined();
    });

    it('should reject invalid JSON', () => {
      const invalidJson = '{"facts": [invalid json}';
      
      const result = factSchemaValidator.validateAndParseJSON(invalidJson);

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.parsed).toBeUndefined();
    });
  });

  describe('getSupportedFactTypes', () => {
    it('should return all supported fact types', () => {
      const factTypes = factSchemaValidator.getSupportedFactTypes();

      expect(factTypes).toContain('company_info');
      expect(factTypes).toContain('location');
      expect(factTypes).toContain('contact');
      expect(factTypes).toContain('person');
      expect(factTypes).toContain('product');
      expect(factTypes).toContain('service');
      expect(factTypes).toContain('technology');
      expect(factTypes).toContain('metric');
      expect(factTypes).toContain('certification');
      expect(factTypes).toContain('partnership');
      expect(factTypes).toContain('capability');
    });
  });

  describe('getFactTypeSchema', () => {
    it('should return schema for valid fact type', () => {
      const schema = factSchemaValidator.getFactTypeSchema('company_info');
      expect(schema).toBeDefined();
    });

    it('should return null for invalid fact type', () => {
      const schema = factSchemaValidator.getFactTypeSchema('invalid_type');
      expect(schema).toBeNull();
    });
  });
});

describe('Individual Schema Validation', () => {
  describe('CompanyInfoSchema', () => {
    it('should validate valid company info', () => {
      const validData = {
        name: 'ACME Corp',
        industry: 'Manufacturing',
        description: 'Leading manufacturer of widgets',
        founded: '1985',
        employees: '500-1000',
        revenue: '$50M-100M',
        website: 'https://acme-corp.com',
        type: 'private'
      };

      const result = CompanyInfoSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid website URL', () => {
      const invalidData = {
        name: 'ACME Corp',
        website: 'not-a-url'
      };

      const result = CompanyInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid company type', () => {
      const invalidData = {
        name: 'ACME Corp',
        type: 'invalid_type'
      };

      const result = CompanyInfoSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('LocationSchema', () => {
    it('should validate valid location data', () => {
      const validData = {
        headquarters: 'Detroit, MI',
        address: '123 Main St',
        city: 'Detroit',
        state: 'Michigan',
        country: 'USA',
        postal_code: '48201',
        facility_size: '50,000 sq ft',
        facilities: ['Detroit, MI', 'Austin, TX'],
        coordinates: { lat: 42.3314, lng: -83.0458 }
      };

      const result = LocationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept minimal location data', () => {
      const minimalData = {
        headquarters: 'Detroit, MI'
      };

      const result = LocationSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid coordinates', () => {
      const invalidData = {
        headquarters: 'Detroit, MI',
        coordinates: { lat: 'invalid', lng: -83.0458 }
      };

      const result = LocationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
