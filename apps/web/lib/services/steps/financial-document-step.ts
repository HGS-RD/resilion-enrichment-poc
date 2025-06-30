/**
 * Financial Document Enrichment Step
 * 
 * Enrichment step that retrieves and processes financial documents
 * as part of Tier 1 enrichment sources.
 */

import { BaseEnrichmentStep } from '../base-enrichment-step';
import { EnrichmentContext, EnrichmentFact, JobRepository } from '../../types/enrichment';
import { SECEdgarClient } from '../sec-edgar-client';
import { FinancialDocumentParser } from '../financial-document-parser';
import { LLMFinancialDataExtractor } from '../financial-data-extractor';
import { 
  FinancialDocument, 
  DocumentRetrievalConfig, 
  DocumentParsingConfig 
} from '../../types/financial-documents';

export class FinancialDocumentStep extends BaseEnrichmentStep {
  private readonly secClient: SECEdgarClient;
  private readonly parser: FinancialDocumentParser;
  private readonly extractor: LLMFinancialDataExtractor;

  constructor(
    jobRepository: JobRepository,
    retrievalConfig?: Partial<DocumentRetrievalConfig>,
    parsingConfig?: Partial<DocumentParsingConfig>
  ) {
    super(jobRepository);
    
    this.secClient = new SECEdgarClient(retrievalConfig);
    this.parser = new FinancialDocumentParser(parsingConfig);
    this.extractor = new LLMFinancialDataExtractor();
  }

  get name(): string {
    return 'financial-document-processing';
  }

  canHandle(context: EnrichmentContext): boolean {
    // This step can handle any context where we have a domain
    // and we're in Tier 1 enrichment
    return !!context.job.domain && !context.error;
  }

  async execute(context: EnrichmentContext): Promise<EnrichmentContext> {
    const startTime = Date.now();
    
    try {
      console.log(`Starting financial document processing for domain: ${context.job.domain}`);
      
      // Update step status to running
      await this.updateStepStatus(context.job.id, 'extraction_status', 'running');
      
      // Step 1: Extract company name from domain
      const companyName = this.extractCompanyNameFromDomain(context.job.domain);
      console.log(`Extracted company name: ${companyName}`);
      
      // Step 2: Retrieve financial documents
      const documents = await this.retrieveFinancialDocuments(companyName);
      console.log(`Retrieved ${documents.length} financial documents`);
      
      if (documents.length === 0) {
        console.log(`No financial documents found for ${companyName}`);
        context.step_results = {
          ...context.step_results,
          financial_documents: {
            documents_found: 0,
            processing_time_ms: Date.now() - startTime,
            message: 'No SEC filings found for this company'
          }
        };
        
        await this.updateStepStatus(context.job.id, 'extraction_status', 'completed');
        return context;
      }
      
      // Step 3: Parse documents and extract sections
      const allFacts: EnrichmentFact[] = [];
      let totalProcessingTime = 0;
      
      for (const document of documents) {
        try {
          const facts = await this.processDocument(document, context.job.id);
          allFacts.push(...facts);
          totalProcessingTime += document.metadata.processing_time_ms;
        } catch (error) {
          console.error(`Error processing document ${document.id}:`, error);
          continue;
        }
      }
      
      // Step 4: Update context with extracted facts
      context.extracted_facts = [
        ...(context.extracted_facts || []),
        ...allFacts
      ];
      
      // Step 5: Update job progress
      await this.updateProgress(context.job.id, {
        facts_extracted: allFacts.length
      });
      
      // Step 6: Store results in context
      context.step_results = {
        ...context.step_results,
        financial_documents: {
          documents_found: documents.length,
          facts_extracted: allFacts.length,
          processing_time_ms: Date.now() - startTime,
          total_document_processing_time_ms: totalProcessingTime,
          document_types: documents.map(d => d.document_type),
          average_confidence: allFacts.length > 0 
            ? allFacts.reduce((sum, fact) => sum + fact.confidence_score, 0) / allFacts.length 
            : 0
        }
      };
      
      console.log(`Financial document processing completed. Extracted ${allFacts.length} facts.`);
      
      await this.updateStepStatus(context.job.id, 'extraction_status', 'completed');
      return context;
      
    } catch (error) {
      console.error('Error in financial document processing step:', error);
      
      context.error = error instanceof Error ? error : new Error(String(error));
      context.step_results = {
        ...context.step_results,
        financial_documents: {
          documents_found: 0,
          facts_extracted: 0,
          processing_time_ms: Date.now() - startTime,
          error: error instanceof Error ? error.message : String(error)
        }
      };
      
      await this.updateStepStatus(context.job.id, 'extraction_status', 'failed');
      return context;
    }
  }

  private extractCompanyNameFromDomain(domain: string): string {
    // Remove common prefixes and suffixes
    let companyName = domain
      .replace(/^(www\.|m\.|mobile\.)/, '')
      .replace(/\.(com|org|net|edu|gov|mil|int|co|io|ai|tech)$/, '')
      .replace(/[-_]/g, ' ')
      .trim();
    
    // Capitalize first letter of each word
    companyName = companyName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    return companyName;
  }

  private async retrieveFinancialDocuments(companyName: string): Promise<FinancialDocument[]> {
    try {
      // Try to retrieve by company name first
      let documents = await this.secClient.retrieveByCompanyName(companyName);
      
      // If no documents found, try variations of the company name
      if (documents.length === 0) {
        const variations = this.generateCompanyNameVariations(companyName);
        
        for (const variation of variations) {
          documents = await this.secClient.retrieveByCompanyName(variation);
          if (documents.length > 0) {
            console.log(`Found documents using variation: ${variation}`);
            break;
          }
        }
      }
      
      return documents;
    } catch (error) {
      console.error(`Error retrieving financial documents for ${companyName}:`, error);
      return [];
    }
  }

  private generateCompanyNameVariations(companyName: string): string[] {
    const variations: string[] = [];
    
    // Add common corporate suffixes
    const suffixes = ['Inc', 'Corp', 'Corporation', 'LLC', 'Ltd', 'Limited', 'Company', 'Co'];
    
    for (const suffix of suffixes) {
      variations.push(`${companyName} ${suffix}`);
      variations.push(`${companyName}, ${suffix}.`);
    }
    
    // Add variations without common words
    const withoutCommon = companyName
      .replace(/\b(the|and|&|of|for|in|on|at|to|a|an)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (withoutCommon !== companyName) {
      variations.push(withoutCommon);
    }
    
    // Add acronym if company name has multiple words
    const words = companyName.split(' ').filter(word => word.length > 2);
    if (words.length > 1) {
      const acronym = words.map(word => word.charAt(0).toUpperCase()).join('');
      variations.push(acronym);
    }
    
    return variations;
  }

  private async processDocument(document: FinancialDocument, jobId: string): Promise<EnrichmentFact[]> {
    try {
      // Step 1: Parse document sections
      const sections = await this.parser.parse(document);
      console.log(`Parsed ${sections.length} sections from document ${document.id}`);
      
      if (sections.length === 0) {
        return [];
      }
      
      // Step 2: Extract facts from sections
      const extractionResult = await this.extractor.extractFacts(sections);
      console.log(`Extracted ${extractionResult.extracted_facts.length} facts from document ${document.id}`);
      
      // Step 3: Convert financial facts to enrichment facts
      const enrichmentFacts: EnrichmentFact[] = extractionResult.extracted_facts.map(financialFact => ({
        id: `financial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        job_id: jobId,
        fact_type: this.mapFinancialFactTypeToEnrichmentFactType(financialFact.fact_type),
        fact_data: {
          value: financialFact.value,
          unit: financialFact.unit,
          period: financialFact.period,
          extraction_method: financialFact.extraction_method,
          financial_fact_type: financialFact.fact_type
        },
        confidence_score: financialFact.confidence_score,
        source_url: document.source_url,
        source_text: financialFact.source_text,
        created_at: new Date().toISOString(),
        validated: false,
        tier_used: 1 // Financial documents are Tier 1 sources
      }));
      
      return enrichmentFacts;
      
    } catch (error) {
      console.error(`Error processing document ${document.id}:`, error);
      return [];
    }
  }

  private mapFinancialFactTypeToEnrichmentFactType(financialFactType: string): string {
    const mapping: Record<string, string> = {
      'facility_name': 'site_name',
      'facility_address': 'site_address',
      'facility_type': 'site_type',
      'production_capacity': 'production_capacity',
      'employee_count': 'employee_count',
      'geographic_segment': 'geographic_segment',
      'business_segment': 'business_segment',
      'subsidiary_name': 'subsidiary',
      'subsidiary_location': 'subsidiary_location',
      'major_product': 'major_product',
      'regulatory_id': 'regulatory_id',
      'certification': 'certification',
      'operating_status': 'operating_status'
    };
    
    return mapping[financialFactType] || financialFactType;
  }
}
