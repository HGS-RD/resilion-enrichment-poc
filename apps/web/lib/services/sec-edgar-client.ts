/**
 * SEC EDGAR API Client
 * 
 * Service for retrieving financial documents from the SEC EDGAR database.
 * Implements the FinancialDocumentRetriever interface.
 */

import { 
  FinancialDocument, 
  FinancialDocumentRetriever, 
  SECCompanyInfo, 
  SECFiling, 
  DocumentRetrievalConfig,
  DocumentType,
  FinancialDocumentMetadata
} from '../types/financial-documents';

export class SECEdgarClient implements FinancialDocumentRetriever {
  private readonly baseUrl = 'https://data.sec.gov';
  private readonly config: DocumentRetrievalConfig;
  
  constructor(config?: Partial<DocumentRetrievalConfig>) {
    this.config = {
      max_documents_per_company: 1,
      preferred_document_types: ['10-K'],
      max_age_months: 24,
      timeout_ms: 30000,
      retry_attempts: 3,
      user_agent: 'Resilion Enrichment Bot 1.0 (compliance@resilion.com)',
      ...config
    };
  }

  async retrieveByCompanyName(companyName: string): Promise<FinancialDocument[]> {
    try {
      // First, search for the company to get CIK
      const companyInfo = await this.searchCompanyByCIK(companyName);
      if (!companyInfo) {
        console.log(`No SEC company found for: ${companyName}`);
        return [];
      }

      return await this.retrieveByCIK(companyInfo.cik);
    } catch (error) {
      console.error(`Error retrieving documents for company ${companyName}:`, error);
      return [];
    }
  }

  async retrieveByTickerSymbol(ticker: string): Promise<FinancialDocument[]> {
    try {
      // Search by ticker symbol
      const companyInfo = await this.searchCompanyByTicker(ticker);
      if (!companyInfo) {
        console.log(`No SEC company found for ticker: ${ticker}`);
        return [];
      }

      return await this.retrieveByCIK(companyInfo.cik);
    } catch (error) {
      console.error(`Error retrieving documents for ticker ${ticker}:`, error);
      return [];
    }
  }

  async retrieveByCIK(cik: string): Promise<FinancialDocument[]> {
    try {
      const paddedCIK = this.padCIK(cik);
      
      // Get recent filings for this CIK
      const filings = await this.getRecentFilings(paddedCIK);
      
      // Filter to preferred document types and recent filings
      const relevantFilings = this.filterRelevantFilings(filings);
      
      // Retrieve and parse the most recent documents
      const documents: FinancialDocument[] = [];
      
      for (const filing of relevantFilings.slice(0, this.config.max_documents_per_company)) {
        try {
          const document = await this.retrieveFilingDocument(filing);
          if (document) {
            documents.push(document);
          }
        } catch (error) {
          console.error(`Error retrieving filing ${filing.accession_number}:`, error);
          continue;
        }
      }

      return documents;
    } catch (error) {
      console.error(`Error retrieving documents for CIK ${cik}:`, error);
      return [];
    }
  }

  private async searchCompanyByCIK(companyName: string): Promise<SECCompanyInfo | null> {
    try {
      // Use SEC company tickers JSON endpoint
      const response = await this.makeRequest('/files/company_tickers.json');
      const companies = Object.values(response) as any[];
      
      // Search for company by name (case-insensitive partial match)
      const company = companies.find(c => 
        c.title?.toLowerCase().includes(companyName.toLowerCase()) ||
        companyName.toLowerCase().includes(c.title?.toLowerCase())
      );

      if (!company) {
        return null;
      }

      return {
        cik: company.cik_str.toString().padStart(10, '0'),
        company_name: company.title,
        ticker_symbol: company.ticker
      };
    } catch (error) {
      console.error('Error searching company by name:', error);
      return null;
    }
  }

  private async searchCompanyByTicker(ticker: string): Promise<SECCompanyInfo | null> {
    try {
      const response = await this.makeRequest('/files/company_tickers.json');
      const companies = Object.values(response) as any[];
      
      const company = companies.find(c => 
        c.ticker?.toLowerCase() === ticker.toLowerCase()
      );

      if (!company) {
        return null;
      }

      return {
        cik: company.cik_str.toString().padStart(10, '0'),
        company_name: company.title,
        ticker_symbol: company.ticker
      };
    } catch (error) {
      console.error('Error searching company by ticker:', error);
      return null;
    }
  }

  private async getRecentFilings(cik: string): Promise<SECFiling[]> {
    try {
      const url = `/submissions/CIK${cik}.json`;
      const response = await this.makeRequest(url);
      
      const filings: SECFiling[] = [];
      const recent = response.filings?.recent;
      
      if (!recent || !recent.form || !recent.form.length) {
        return [];
      }

      // Convert arrays to objects
      for (let i = 0; i < recent.form.length; i++) {
        filings.push({
          accession_number: recent.accessionNumber[i],
          filing_date: recent.filingDate[i],
          report_date: recent.reportDate[i],
          form_type: recent.form[i],
          company_name: response.name,
          cik: cik,
          size: recent.size[i],
          primary_document: recent.primaryDocument[i],
          primary_doc_description: recent.primaryDocDescription[i],
          filing_href: `https://www.sec.gov/Archives/edgar/data/${cik}/${recent.accessionNumber[i].replace(/-/g, '')}/${recent.primaryDocument[i]}`,
          filing_detail_href: `https://www.sec.gov/Archives/edgar/data/${cik}/${recent.accessionNumber[i].replace(/-/g, '')}/`
        });
      }

      return filings;
    } catch (error) {
      console.error(`Error getting recent filings for CIK ${cik}:`, error);
      return [];
    }
  }

  private filterRelevantFilings(filings: SECFiling[]): SECFiling[] {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - this.config.max_age_months);

    return filings
      .filter(filing => {
        // Filter by document type
        const isPreferredType = this.config.preferred_document_types.some(type => 
          filing.form_type === type
        );
        
        // Filter by age
        const filingDate = new Date(filing.filing_date);
        const isRecent = filingDate >= cutoffDate;
        
        return isPreferredType && isRecent;
      })
      .sort((a, b) => new Date(b.filing_date).getTime() - new Date(a.filing_date).getTime());
  }

  private async retrieveFilingDocument(filing: SECFiling): Promise<FinancialDocument | null> {
    try {
      const startTime = Date.now();
      
      // Retrieve the document content
      const content = await this.fetchDocumentContent(filing.filing_href);
      
      if (!content) {
        return null;
      }

      const processingTime = Date.now() - startTime;

      const metadata: FinancialDocumentMetadata = {
        file_size_bytes: content.length,
        format: 'HTML',
        cik: filing.cik,
        accession_number: filing.accession_number,
        form_type: filing.form_type,
        fiscal_year: new Date(filing.report_date).getFullYear(),
        processing_time_ms: processingTime,
        extraction_errors: []
      };

      const document: FinancialDocument = {
        id: `sec_${filing.accession_number}`,
        company_name: filing.company_name,
        document_type: filing.form_type as DocumentType,
        filing_date: filing.filing_date,
        period_end_date: filing.report_date,
        source_url: filing.filing_href,
        raw_content: content,
        parsed_sections: [], // Will be populated by the parser
        metadata,
        created_at: new Date().toISOString()
      };

      return document;
    } catch (error) {
      console.error(`Error retrieving filing document ${filing.accession_number}:`, error);
      return null;
    }
  }

  private async fetchDocumentContent(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.config.user_agent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Host': 'www.sec.gov'
        },
        signal: AbortSignal.timeout(this.config.timeout_ms)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error(`Error fetching document content from ${url}:`, error);
      return null;
    }
  }

  private async makeRequest(endpoint: string): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    for (let attempt = 1; attempt <= this.config.retry_attempts; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': this.config.user_agent,
            'Accept': 'application/json',
            'Host': 'data.sec.gov'
          },
          signal: AbortSignal.timeout(this.config.timeout_ms)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (error) {
        console.error(`Attempt ${attempt} failed for ${url}:`, error);
        
        if (attempt === this.config.retry_attempts) {
          throw error;
        }
        
        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  private padCIK(cik: string): string {
    return cik.toString().padStart(10, '0');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
