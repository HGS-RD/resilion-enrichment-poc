/**
 * Financial Data Extractor
 * 
 * Service for extracting structured facts from parsed financial document sections
 * using LLM-based analysis.
 */

import { 
  FinancialDataExtractor, 
  FinancialExtractionResult, 
  FinancialFact, 
  FinancialFactType, 
  ParsedSection 
} from '../types/financial-documents';

export class LLMFinancialDataExtractor implements FinancialDataExtractor {
  private readonly llmModel: string;
  private readonly confidenceThreshold: number;

  constructor(llmModel: string = 'gpt-4o', confidenceThreshold: number = 0.7) {
    this.llmModel = llmModel;
    this.confidenceThreshold = confidenceThreshold;
  }

  async extractFacts(sections: ParsedSection[]): Promise<FinancialExtractionResult> {
    const startTime = Date.now();
    const allFacts: FinancialFact[] = [];
    const sectionsProcessed: string[] = [];
    const errors: string[] = [];

    for (const section of sections) {
      try {
        const facts = await this.extractFromSection(section);
        allFacts.push(...facts);
        sectionsProcessed.push(section.section_name);
      } catch (error) {
        const errorMsg = `Error extracting from section ${section.section_name}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Filter facts by confidence threshold
    const highConfidenceFacts = allFacts.filter(fact => 
      fact.confidence_score >= this.confidenceThreshold
    );

    const processingTime = Date.now() - startTime;
    const averageConfidence = highConfidenceFacts.length > 0 
      ? highConfidenceFacts.reduce((sum, fact) => sum + fact.confidence_score, 0) / highConfidenceFacts.length
      : 0;

    return {
      document_id: `extraction_${Date.now()}`,
      extracted_facts: highConfidenceFacts,
      processing_time_ms: processingTime,
      sections_processed: sectionsProcessed,
      extraction_confidence: averageConfidence,
      errors
    };
  }

  async extractFromSection(section: ParsedSection): Promise<FinancialFact[]> {
    const facts: FinancialFact[] = [];

    // Extract different types of facts based on section type
    switch (section.section_type) {
      case 'properties':
      case 'facilities':
        facts.push(...await this.extractFacilityFacts(section));
        break;
      
      case 'business_description':
      case 'operations_overview':
        facts.push(...await this.extractBusinessFacts(section));
        break;
      
      case 'subsidiaries':
        facts.push(...await this.extractSubsidiaryFacts(section));
        break;
      
      case 'geographic_segments':
        facts.push(...await this.extractGeographicFacts(section));
        break;
      
      default:
        console.log(`No extraction logic for section type: ${section.section_type}`);
    }

    return facts;
  }

  private async extractFacilityFacts(section: ParsedSection): Promise<FinancialFact[]> {
    const facts: FinancialFact[] = [];
    
    // Extract facility names and addresses using regex patterns
    const facilityPatterns = [
      /(?:facility|plant|site|location|office|headquarters)\s+(?:at|in|located)\s+([^.]+)/gi,
      /([^.]+?)\s+(?:facility|plant|manufacturing|production|distribution)/gi,
      /(?:approximately|about)?\s*([0-9,]+)\s*square\s*feet/gi,
      /([0-9,]+)\s*employees?/gi
    ];

    for (const pattern of facilityPatterns) {
      const matches = [...section.content.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const value = match[1].trim();
          let factType: FinancialFactType;
          
          if (pattern.source.includes('square')) {
            factType = 'production_capacity';
          } else if (pattern.source.includes('employees')) {
            factType = 'employee_count';
          } else if (this.isAddress(value)) {
            factType = 'facility_address';
          } else {
            factType = 'facility_name';
          }

          facts.push({
            fact_type: factType,
            value: value,
            source_section: section.section_name,
            source_text: match[0],
            confidence_score: 0.8,
            extraction_method: 'regex'
          });
        }
      }
    }

    return facts;
  }

  private async extractBusinessFacts(section: ParsedSection): Promise<FinancialFact[]> {
    const facts: FinancialFact[] = [];
    
    // Extract business segments and products
    const businessPatterns = [
      /(?:business|operating|reportable)\s+segments?\s*(?:include|are|consist\s+of)?\s*([^.]+)/gi,
      /(?:products?|services?)\s+(?:include|are|consist\s+of)?\s*([^.]+)/gi,
      /(?:manufactures?|produces?|makes?)\s+([^.]+)/gi
    ];

    for (const pattern of businessPatterns) {
      const matches = [...section.content.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const value = match[1].trim();
          const factType: FinancialFactType = pattern.source.includes('segment') 
            ? 'business_segment' 
            : 'major_product';

          facts.push({
            fact_type: factType,
            value: value,
            source_section: section.section_name,
            source_text: match[0],
            confidence_score: 0.7,
            extraction_method: 'regex'
          });
        }
      }
    }

    return facts;
  }

  private async extractSubsidiaryFacts(section: ParsedSection): Promise<FinancialFact[]> {
    const facts: FinancialFact[] = [];
    
    // Extract subsidiary information
    const subsidiaryPatterns = [
      /([A-Z][A-Za-z\s&,]+(?:Inc|LLC|Corp|Corporation|Ltd|Limited))/g,
      /subsidiary\s+(?:in|located\s+in|based\s+in)\s+([^.]+)/gi
    ];

    for (const pattern of subsidiaryPatterns) {
      const matches = [...section.content.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const value = match[1].trim();
          const factType: FinancialFactType = pattern.source.includes('located') 
            ? 'subsidiary_location' 
            : 'subsidiary_name';

          facts.push({
            fact_type: factType,
            value: value,
            source_section: section.section_name,
            source_text: match[0],
            confidence_score: 0.75,
            extraction_method: 'regex'
          });
        }
      }
    }

    return facts;
  }

  private async extractGeographicFacts(section: ParsedSection): Promise<FinancialFact[]> {
    const facts: FinancialFact[] = [];
    
    // Extract geographic segments
    const geographicPatterns = [
      /(?:operations?|business|activities?)\s+in\s+([^.]+)/gi,
      /(?:geographic|geographical)\s+(?:segments?|regions?|areas?)\s*(?:include|are)?\s*([^.]+)/gi
    ];

    for (const pattern of geographicPatterns) {
      const matches = [...section.content.matchAll(pattern)];
      for (const match of matches) {
        if (match[1]) {
          const value = match[1].trim();
          
          facts.push({
            fact_type: 'geographic_segment',
            value: value,
            source_section: section.section_name,
            source_text: match[0],
            confidence_score: 0.7,
            extraction_method: 'regex'
          });
        }
      }
    }

    return facts;
  }

  private isAddress(text: string): boolean {
    const addressPatterns = [
      /\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd)/i,
      /[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}/,
      /[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Za-z\s]+/
    ];

    return addressPatterns.some(pattern => pattern.test(text));
  }
}

/**
 * Enhanced LLM-based extractor that uses actual LLM calls
 * This would be implemented when LLM integration is ready
 */
export class EnhancedLLMFinancialDataExtractor implements FinancialDataExtractor {
  private readonly llmService: any; // Would be actual LLM service
  private readonly confidenceThreshold: number;

  constructor(llmService: any, confidenceThreshold: number = 0.7) {
    this.llmService = llmService;
    this.confidenceThreshold = confidenceThreshold;
  }

  async extractFacts(sections: ParsedSection[]): Promise<FinancialExtractionResult> {
    // This would implement actual LLM-based extraction
    // For now, fall back to regex-based extraction
    const regexExtractor = new LLMFinancialDataExtractor();
    return await regexExtractor.extractFacts(sections);
  }

  async extractFromSection(section: ParsedSection): Promise<FinancialFact[]> {
    // This would use LLM to extract structured facts
    // Implementation would include:
    // 1. Create specialized prompts for each section type
    // 2. Call LLM with section content and extraction prompt
    // 3. Parse LLM response into structured facts
    // 4. Validate and score confidence
    
    console.log(`Enhanced LLM extraction for ${section.section_type} not yet implemented`);
    
    // Fall back to regex-based extraction
    const regexExtractor = new LLMFinancialDataExtractor();
    return await regexExtractor.extractFromSection(section);
  }

  private createExtractionPrompt(section: ParsedSection): string {
    const basePrompt = `
Extract structured facility and business information from the following ${section.section_type} section of a financial document.

Section Content:
${section.content}

Please extract the following types of information if present:
- Facility names and locations
- Addresses of facilities
- Production capacity or size information
- Employee counts
- Business segments
- Major products or services
- Subsidiary names and locations
- Geographic segments or regions

Format your response as a JSON array of objects with the following structure:
{
  "fact_type": "facility_name|facility_address|production_capacity|employee_count|business_segment|major_product|subsidiary_name|subsidiary_location|geographic_segment",
  "value": "extracted value",
  "confidence_score": 0.0-1.0,
  "source_text": "original text snippet"
}

Only include facts with confidence score >= 0.7.
`;

    return basePrompt;
  }
}

/**
 * Utility functions for financial fact extraction
 */
export class FinancialExtractionUtils {
  static cleanFactValue(value: string): string {
    return value
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s,.-]/g, '')
      .trim();
  }

  static parseNumericValue(text: string): number | null {
    const numMatch = text.match(/([0-9,]+)/);
    if (numMatch) {
      return parseInt(numMatch[1].replace(/,/g, ''), 10);
    }
    return null;
  }

  static extractUnit(text: string): string | undefined {
    const unitPatterns = [
      /square\s*feet/i,
      /acres/i,
      /employees?/i,
      /million/i,
      /billion/i
    ];

    for (const pattern of unitPatterns) {
      if (pattern.test(text)) {
        return text.match(pattern)?.[0];
      }
    }

    return undefined;
  }

  static calculateConfidenceScore(
    extractionMethod: 'regex' | 'llm' | 'structured',
    sourceLength: number,
    hasNumericValue: boolean
  ): number {
    let baseScore = 0.5;

    // Adjust based on extraction method
    switch (extractionMethod) {
      case 'structured':
        baseScore = 0.9;
        break;
      case 'llm':
        baseScore = 0.8;
        break;
      case 'regex':
        baseScore = 0.7;
        break;
    }

    // Adjust based on source text length (longer = more context = higher confidence)
    if (sourceLength > 100) baseScore += 0.1;
    if (sourceLength > 200) baseScore += 0.1;

    // Adjust based on presence of numeric values
    if (hasNumericValue) baseScore += 0.1;

    return Math.min(baseScore, 1.0);
  }
}
