/**
 * Financial Document Processing Types
 * 
 * Types and interfaces for handling SEC filings, annual reports,
 * and other financial documents in the enrichment process.
 */

export interface FinancialDocument {
  id: string;
  company_name: string;
  ticker_symbol?: string;
  document_type: DocumentType;
  filing_date: string;
  period_end_date: string;
  source_url: string;
  raw_content: string;
  parsed_sections: ParsedSection[];
  metadata: FinancialDocumentMetadata;
  created_at: string;
}

export type DocumentType = 
  | '10-K'      // Annual report
  | '10-Q'      // Quarterly report
  | '8-K'       // Current report
  | 'DEF 14A'   // Proxy statement
  | 'ANNUAL_REPORT_PDF'  // Corporate annual report PDF
  | 'INVESTOR_PRESENTATION'  // Investor presentation
  | 'SUSTAINABILITY_REPORT'; // ESG/Sustainability report

export interface ParsedSection {
  section_name: string;
  section_type: SectionType;
  content: string;
  page_numbers?: number[];
  confidence_score: number;
  extraction_method: 'regex' | 'llm' | 'manual';
}

export type SectionType = 
  | 'business_description'
  | 'properties'
  | 'risk_factors'
  | 'management_discussion'
  | 'financial_statements'
  | 'operations_overview'
  | 'facilities'
  | 'subsidiaries'
  | 'geographic_segments';

export interface FinancialDocumentMetadata {
  file_size_bytes: number;
  page_count?: number;
  format: 'HTML' | 'PDF' | 'XBRL' | 'XML';
  cik?: string;  // Central Index Key for SEC filings
  accession_number?: string;  // SEC accession number
  form_type?: string;
  fiscal_year?: number;
  fiscal_quarter?: number;
  processing_time_ms: number;
  extraction_errors: string[];
}

export interface SECCompanyInfo {
  cik: string;
  company_name: string;
  ticker_symbol?: string;
  sic_code?: string;
  industry?: string;
  business_address?: {
    street1: string;
    street2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export interface SECFiling {
  accession_number: string;
  filing_date: string;
  report_date: string;
  form_type: string;
  company_name: string;
  cik: string;
  size: number;
  primary_document: string;
  primary_doc_description: string;
  filing_href: string;
  filing_detail_href: string;
}

export interface DocumentRetrievalConfig {
  max_documents_per_company: number;
  preferred_document_types: DocumentType[];
  max_age_months: number;  // Only retrieve documents newer than this
  timeout_ms: number;
  retry_attempts: number;
  user_agent: string;
}

export interface DocumentParsingConfig {
  target_sections: SectionType[];
  min_section_length: number;
  max_section_length: number;
  confidence_threshold: number;
  use_llm_fallback: boolean;
  llm_model?: string;
}

export interface FinancialExtractionResult {
  document_id: string;
  extracted_facts: FinancialFact[];
  processing_time_ms: number;
  sections_processed: string[];
  extraction_confidence: number;
  errors: string[];
}

export interface FinancialFact {
  fact_type: FinancialFactType;
  value: string | number;
  unit?: string;
  period?: string;
  source_section: string;
  source_text: string;
  confidence_score: number;
  extraction_method: 'regex' | 'llm' | 'structured';
}

export type FinancialFactType = 
  | 'facility_name'
  | 'facility_address'
  | 'facility_type'
  | 'production_capacity'
  | 'employee_count'
  | 'geographic_segment'
  | 'business_segment'
  | 'subsidiary_name'
  | 'subsidiary_location'
  | 'major_product'
  | 'regulatory_id'
  | 'certification'
  | 'operating_status';

// Service interfaces
export interface FinancialDocumentRetriever {
  retrieveByCompanyName(companyName: string): Promise<FinancialDocument[]>;
  retrieveByTickerSymbol(ticker: string): Promise<FinancialDocument[]>;
  retrieveByCIK(cik: string): Promise<FinancialDocument[]>;
}

export interface DocumentParser {
  parse(document: FinancialDocument): Promise<ParsedSection[]>;
  extractSection(content: string, sectionType: SectionType): Promise<ParsedSection | null>;
}

export interface FinancialDataExtractor {
  extractFacts(sections: ParsedSection[]): Promise<FinancialExtractionResult>;
  extractFromSection(section: ParsedSection): Promise<FinancialFact[]>;
}
