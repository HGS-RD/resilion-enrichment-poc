import { EnrichmentJob } from '../types/enrichment';

/**
 * Prompt Templates for AI-Powered Fact Extraction
 * 
 * This module contains versioned prompt templates for extracting structured
 * facts from web content. Templates are designed to work with the enrichment
 * JSON schema and provide consistent, high-quality extractions.
 */

export interface PromptTemplate {
  version: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
  schema: any;
  examples: any[];
}

/**
 * Current production prompt template for fact extraction
 */
export const FACT_EXTRACTION_TEMPLATE_V1: PromptTemplate = {
  version: "1.0.0",
  name: "Manufacturing Site Fact Extraction",
  description: "Extracts structured business facts from manufacturing and industrial company websites",
  
  systemPrompt: `You are an expert business intelligence analyst specializing in extracting structured facts from company websites, particularly manufacturing and industrial businesses.

Your task is to analyze web content and extract factual information that would be valuable for business intelligence, lead generation, and market research.

EXTRACTION GUIDELINES:
1. Focus on factual, verifiable information only
2. Prioritize business-critical data: company info, products/services, locations, contacts, technologies
3. Assign confidence scores based on how explicitly stated the information is
4. Only include facts with confidence >= 0.7
5. Provide specific source text that supports each fact
6. Use standardized fact types for consistency

FACT TYPES TO EXTRACT:
- company_info: Basic company details (name, industry, size, founding date, description)
- product: Specific products or product lines
- service: Services offered by the company
- location: Physical locations, headquarters, facilities
- contact: Contact information (phone, email, addresses)
- person: Key personnel (executives, contacts)
- technology: Technologies used or offered
- metric: Business metrics (revenue, employees, capacity)
- certification: Industry certifications or standards
- partnership: Business partnerships or alliances
- capability: Manufacturing capabilities or specializations

CONFIDENCE SCORING:
- 0.9-1.0: Explicitly stated with clear context
- 0.8-0.89: Clearly implied with strong supporting evidence
- 0.7-0.79: Reasonably inferred from available context
- Below 0.7: Too uncertain, exclude from results

Always respond with valid JSON matching the specified schema.`,

  userPromptTemplate: `Extract structured facts from the following web content from the domain "{domain}".

CONTENT TO ANALYZE:
{content}

REQUIRED JSON SCHEMA - YOU MUST INCLUDE ALL FIELDS:
{
  "facts": [
    {
      "fact_type": "MUST be one of: company_info, product, service, location, contact, person, technology, metric, certification, partnership, capability",
      "fact_data": {
        "REQUIRED": "object with key-value pairs containing the actual fact information - NEVER leave this empty"
      },
      "confidence_score": "number between 0.7 and 1.0",
      "source_text": "specific text snippet that supports this fact (max 200 chars)"
    }
  ]
}

CRITICAL REQUIREMENTS:
1. ALWAYS include the "fact_data" object with relevant key-value pairs
2. Use ONLY the allowed fact_type values listed above
3. For company_info: include fields like name, industry, description, founded, etc.
4. For location: include fields like address, city, state, headquarters, etc.
5. For contact: include fields like phone, email, address, etc.
6. For service: include fields like name, description, category, etc.

Extract facts now:`,

  schema: {
    type: "object",
    properties: {
      facts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            fact_type: {
              type: "string",
              enum: [
                "company_info", "product", "service", "location", "contact",
                "person", "technology", "metric", "certification", "partnership", "capability"
              ]
            },
            fact_data: {
              type: "object",
              additionalProperties: true
            },
            confidence_score: {
              type: "number",
              minimum: 0.7,
              maximum: 1.0
            },
            source_text: {
              type: "string",
              maxLength: 200
            }
          },
          required: ["fact_type", "fact_data", "confidence_score", "source_text"]
        }
      }
    },
    required: ["facts"]
  },

  examples: [
    {
      input: "ACME Manufacturing Corp is a leading provider of precision machining services, founded in 1985. We operate from our 50,000 sq ft facility in Detroit, Michigan, serving the automotive and aerospace industries.",
      output: {
        facts: [
          {
            fact_type: "company_info",
            fact_data: {
              name: "ACME Manufacturing Corp",
              industry: "Precision Machining",
              description: "Leading provider of precision machining services",
              founded: "1985"
            },
            confidence_score: 0.95,
            source_text: "ACME Manufacturing Corp is a leading provider of precision machining services, founded in 1985"
          },
          {
            fact_type: "location",
            fact_data: {
              headquarters: "Detroit, Michigan",
              facility_size: "50,000 sq ft"
            },
            confidence_score: 0.92,
            source_text: "operate from our 50,000 sq ft facility in Detroit, Michigan"
          },
          {
            fact_type: "service",
            fact_data: {
              primary_service: "Precision machining services",
              target_industries: ["automotive", "aerospace"]
            },
            confidence_score: 0.90,
            source_text: "precision machining services, serving the automotive and aerospace industries"
          }
        ]
      }
    }
  ]
};

/**
 * Enhanced template for technology-focused extractions
 */
export const TECH_EXTRACTION_TEMPLATE_V1: PromptTemplate = {
  version: "1.0.0",
  name: "Technology Stack Extraction",
  description: "Specialized template for extracting technology stacks and technical capabilities",
  
  systemPrompt: `You are a technical analyst specializing in identifying technology stacks, software platforms, and technical capabilities from company websites.

Focus on extracting:
- Software platforms and tools used
- Programming languages and frameworks
- Manufacturing equipment and systems
- Technical certifications and standards
- Integration capabilities
- Technical specifications

Prioritize explicit mentions of specific technologies, versions, and technical details.`,

  userPromptTemplate: `Extract technology-related facts from the following content from "{domain}":

{content}

Focus on technical details, software platforms, equipment, and capabilities.

REQUIRED JSON SCHEMA:
{
  "facts": [
    {
      "fact_type": "technology",
      "fact_data": {
        "category": "string (software, hardware, platform, standard, etc.)",
        "name": "string",
        "version": "string (if mentioned)",
        "description": "string",
        "use_case": "string"
      },
      "confidence_score": "number between 0.7 and 1.0",
      "source_text": "supporting text snippet"
    }
  ]
}

Extract technology facts now:`,

  schema: {
    type: "object",
    properties: {
      facts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            fact_type: { type: "string", const: "technology" },
            fact_data: {
              type: "object",
              properties: {
                category: { type: "string" },
                name: { type: "string" },
                version: { type: "string" },
                description: { type: "string" },
                use_case: { type: "string" }
              },
              required: ["category", "name"]
            },
            confidence_score: { type: "number", minimum: 0.7, maximum: 1.0 },
            source_text: { type: "string", maxLength: 200 }
          },
          required: ["fact_type", "fact_data", "confidence_score", "source_text"]
        }
      }
    },
    required: ["facts"]
  },

  examples: []
};

/**
 * Template registry for managing multiple prompt versions
 */
export class PromptTemplateRegistry {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    // Register default templates
    this.register(FACT_EXTRACTION_TEMPLATE_V1);
    this.register(TECH_EXTRACTION_TEMPLATE_V1);
  }

  register(template: PromptTemplate): void {
    const key = `${template.name}_${template.version}`;
    this.templates.set(key, template);
  }

  get(name: string, version?: string): PromptTemplate | null {
    if (version) {
      const key = `${name}_${version}`;
      return this.templates.get(key) || null;
    }

    // Find latest version
    const matching = Array.from(this.templates.values())
      .filter(t => t.name === name)
      .sort((a, b) => b.version.localeCompare(a.version));

    return matching[0] || null;
  }

  list(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }
}

/**
 * Prompt builder for creating extraction prompts
 */
export class PromptBuilder {
  private registry: PromptTemplateRegistry;

  constructor() {
    this.registry = new PromptTemplateRegistry();
  }

  /**
   * Builds a complete prompt for fact extraction
   */
  buildExtractionPrompt(
    content: string,
    domain: string,
    templateName: string = "Manufacturing Site Fact Extraction",
    templateVersion?: string
  ): { systemPrompt: string; userPrompt: string; schema: any } {
    const template = this.registry.get(templateName, templateVersion);
    
    if (!template) {
      throw new Error(`Template not found: ${templateName} ${templateVersion || 'latest'}`);
    }

    const userPrompt = template.userPromptTemplate
      .replace('{domain}', domain)
      .replace('{content}', content);

    return {
      systemPrompt: template.systemPrompt,
      userPrompt,
      schema: template.schema
    };
  }

  /**
   * Builds a prompt optimized for specific content types
   */
  buildContextualPrompt(
    content: string,
    domain: string,
    contentType: 'general' | 'technology' | 'contact' | 'products'
  ): { systemPrompt: string; userPrompt: string; schema: any } {
    let templateName: string;

    switch (contentType) {
      case 'technology':
        templateName = "Technology Stack Extraction";
        break;
      case 'general':
      default:
        templateName = "Manufacturing Site Fact Extraction";
        break;
    }

    return this.buildExtractionPrompt(content, domain, templateName);
  }

  /**
   * Gets available templates
   */
  getAvailableTemplates(): PromptTemplate[] {
    return this.registry.list();
  }
}

// Export singleton instance
export const promptBuilder = new PromptBuilder();
