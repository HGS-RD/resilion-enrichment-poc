/**
 * Financial Document Parser
 * 
 * Service for parsing SEC filings and extracting key sections
 * like Properties, Business Description, Risk Factors, etc.
 */

import { 
  FinancialDocument, 
  DocumentParser, 
  ParsedSection, 
  SectionType, 
  DocumentParsingConfig 
} from '../types/financial-documents';

export class FinancialDocumentParser implements DocumentParser {
  private readonly config: DocumentParsingConfig;

  constructor(config?: Partial<DocumentParsingConfig>) {
    this.config = {
      target_sections: [
        'properties',
        'business_description',
        'operations_overview',
        'facilities',
        'subsidiaries',
        'geographic_segments'
      ],
      min_section_length: 100,
      max_section_length: 50000,
      confidence_threshold: 0.7,
      use_llm_fallback: true,
      ...config
    };
  }

  async parse(document: FinancialDocument): Promise<ParsedSection[]> {
    const sections: ParsedSection[] = [];
    
    try {
      // Clean and normalize the HTML content
      const cleanContent = this.cleanHtmlContent(document.raw_content);
      
      // Extract each target section
      for (const sectionType of this.config.target_sections) {
        try {
          const section = await this.extractSection(cleanContent, sectionType);
          if (section) {
            sections.push(section);
          }
        } catch (error) {
          console.error(`Error extracting section ${sectionType}:`, error);
          continue;
        }
      }

      return sections;
    } catch (error) {
      console.error('Error parsing financial document:', error);
      return [];
    }
  }

  async extractSection(content: string, sectionType: SectionType): Promise<ParsedSection | null> {
    try {
      // Try regex-based extraction first
      let section = this.extractSectionByRegex(content, sectionType);
      
      if (!section && this.config.use_llm_fallback) {
        // Fallback to LLM-based extraction if regex fails
        section = await this.extractSectionByLLM(content, sectionType);
      }

      if (section && this.isValidSection(section.content)) {
        return section;
      }

      return null;
    } catch (error) {
      console.error(`Error extracting section ${sectionType}:`, error);
      return null;
    }
  }

  private extractSectionByRegex(content: string, sectionType: SectionType): ParsedSection | null {
    const patterns = this.getSectionPatterns(sectionType);
    
    for (const pattern of patterns) {
      try {
        const match = content.match(pattern.regex);
        if (match && match[1]) {
          const extractedContent = this.cleanSectionContent(match[1]);
          
          if (this.isValidSection(extractedContent)) {
            return {
              section_name: pattern.name,
              section_type: sectionType,
              content: extractedContent,
              confidence_score: pattern.confidence,
              extraction_method: 'regex'
            };
          }
        }
      } catch (error) {
        console.error(`Error with regex pattern for ${sectionType}:`, error);
        continue;
      }
    }

    return null;
  }

  private async extractSectionByLLM(content: string, sectionType: SectionType): Promise<ParsedSection | null> {
    // This would integrate with the LLM service
    // For now, return null as LLM integration will be implemented in the next phase
    console.log(`LLM extraction for ${sectionType} not yet implemented`);
    return null;
  }

  private getSectionPatterns(sectionType: SectionType): Array<{name: string, regex: RegExp, confidence: number}> {
    switch (sectionType) {
      case 'properties':
        return [
          {
            name: 'Properties',
            regex: /(?:item\s*2\s*[.\-\s]*properties|properties\s*(?:and\s*equipment)?)\s*[.\-\s]*([\s\S]*?)(?=(?:item\s*[3-9]|legal\s*proceedings|risk\s*factors|management|directors|executive|financial|consolidated))/gi,
            confidence: 0.9
          },
          {
            name: 'Real Estate Properties',
            regex: /(?:real\s*estate|facilities|manufacturing\s*plants?|offices?)\s*[.\-\s]*([\s\S]*?)(?=(?:item\s*[3-9]|legal\s*proceedings|risk\s*factors))/gi,
            confidence: 0.7
          }
        ];

      case 'business_description':
        return [
          {
            name: 'Business Description',
            regex: /(?:item\s*1\s*[.\-\s]*business|business\s*overview|description\s*of\s*business)\s*[.\-\s]*([\s\S]*?)(?=(?:item\s*[2-9]|properties|risk\s*factors|competition))/gi,
            confidence: 0.9
          },
          {
            name: 'General Business',
            regex: /(?:general\s*business|our\s*business|business\s*operations)\s*[.\-\s]*([\s\S]*?)(?=(?:products|services|competition|properties))/gi,
            confidence: 0.7
          }
        ];

      case 'operations_overview':
        return [
          {
            name: 'Operations Overview',
            regex: /(?:operations|manufacturing|production|facilities)\s*overview\s*[.\-\s]*([\s\S]*?)(?=(?:item\s*[2-9]|properties|employees|competition))/gi,
            confidence: 0.8
          },
          {
            name: 'Manufacturing Operations',
            regex: /(?:manufacturing|production)\s*operations\s*[.\-\s]*([\s\S]*?)(?=(?:sales|marketing|distribution|employees))/gi,
            confidence: 0.8
          }
        ];

      case 'facilities':
        return [
          {
            name: 'Facilities',
            regex: /(?:facilities|plants?|locations|sites?)\s*[.\-\s]*([\s\S]*?)(?=(?:employees|competition|regulation|item\s*[2-9]))/gi,
            confidence: 0.8
          },
          {
            name: 'Manufacturing Facilities',
            regex: /(?:manufacturing|production)\s*(?:facilities|plants?|sites?)\s*[.\-\s]*([\s\S]*?)(?=(?:distribution|sales|employees))/gi,
            confidence: 0.9
          }
        ];

      case 'subsidiaries':
        return [
          {
            name: 'Subsidiaries',
            regex: /(?:subsidiaries|affiliates|related\s*companies)\s*[.\-\s]*([\s\S]*?)(?=(?:item\s*[2-9]|employees|competition|regulation))/gi,
            confidence: 0.8
          },
          {
            name: 'Subsidiary Information',
            regex: /(?:subsidiary|affiliate)\s*information\s*[.\-\s]*([\s\S]*?)(?=(?:employees|properties|legal))/gi,
            confidence: 0.7
          }
        ];

      case 'geographic_segments':
        return [
          {
            name: 'Geographic Segments',
            regex: /(?:geographic|geographical)\s*(?:segments?|regions?|areas?)\s*[.\-\s]*([\s\S]*?)(?=(?:item\s*[2-9]|products|services|competition))/gi,
            confidence: 0.8
          },
          {
            name: 'International Operations',
            regex: /(?:international|global|worldwide)\s*operations\s*[.\-\s]*([\s\S]*?)(?=(?:domestic|competition|regulation))/gi,
            confidence: 0.7
          }
        ];

      default:
        return [];
    }
  }

  private cleanHtmlContent(htmlContent: string): string {
    // Remove HTML tags but preserve structure
    let cleaned = htmlContent
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/&#\d+;/g, ' ');

    // Normalize whitespace
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    return cleaned;
  }

  private cleanSectionContent(content: string): string {
    // Clean up extracted section content
    return content
      .replace(/^\s*[.\-\s]+/, '') // Remove leading punctuation
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Normalize paragraph breaks
      .trim();
  }

  private isValidSection(content: string): boolean {
    if (!content || typeof content !== 'string') {
      return false;
    }

    const length = content.trim().length;
    return length >= this.config.min_section_length && 
           length <= this.config.max_section_length;
  }
}

/**
 * Utility class for advanced section extraction patterns
 */
export class SECFilingPatterns {
  static readonly ITEM_PATTERNS = {
    ITEM_1_BUSINESS: /item\s*1\s*[.\-\s]*business/gi,
    ITEM_2_PROPERTIES: /item\s*2\s*[.\-\s]*properties/gi,
    ITEM_1A_RISK_FACTORS: /item\s*1a\s*[.\-\s]*risk\s*factors/gi,
    ITEM_7_MD_A: /item\s*7\s*[.\-\s]*management[^.]*discussion/gi
  };

  static readonly SECTION_BOUNDARIES = [
    /item\s*[0-9]+[a-z]?\s*[.\-\s]/gi,
    /part\s*[ivx]+\s*[.\-\s]/gi,
    /table\s*of\s*contents/gi,
    /signatures/gi,
    /exhibits/gi
  ];

  static readonly FACILITY_INDICATORS = [
    /manufacturing\s*(?:plant|facility|site)/gi,
    /production\s*(?:plant|facility|site)/gi,
    /distribution\s*(?:center|facility|warehouse)/gi,
    /research\s*(?:facility|center|lab)/gi,
    /office\s*(?:building|facility|location)/gi,
    /headquarters/gi,
    /square\s*feet/gi,
    /acres/gi,
    /employees/gi
  ];

  static readonly ADDRESS_PATTERNS = [
    /\d+\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln|way|circle|cir|court|ct|place|pl)/gi,
    /[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5}/gi, // City, State ZIP
    /[A-Za-z\s]+,\s*[A-Za-z\s]+,\s*[A-Za-z\s]+/gi // City, State, Country
  ];
}
