// Debug script for fact extraction step
require('dotenv').config();
const { openai } = require('@ai-sdk/openai');
const { generateObject } = require('ai');
const { z } = require('zod');

async function testFactExtraction() {
  console.log('Testing Fact Extraction with AI SDK...');
  
  try {
    // Test with simple content
    const testContent = `
      ACME Manufacturing Corp is a leading provider of precision machining services, founded in 1985. 
      We operate from our 50,000 sq ft facility in Detroit, Michigan, serving the automotive and aerospace industries.
      Contact us at info@acme-corp.com or call (555) 123-4567.
    `;
    
    const systemPrompt = `You are an expert business intelligence analyst specializing in extracting structured facts from company websites, particularly manufacturing and industrial businesses.

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

Always respond with valid JSON matching the specified schema.`;

    const userPrompt = `Extract structured facts from the following web content from the domain "acme-corp.com".

CONTENT TO ANALYZE:
${testContent}

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

Extract facts now:`;

    // Define the extraction schema for AI SDK
    const extractionSchema = z.object({
      facts: z.array(z.object({
        fact_type: z.enum([
          'company_info', 'product', 'service', 'location', 'contact',
          'person', 'technology', 'metric', 'certification', 'partnership', 'capability'
        ]),
        fact_data: z.record(z.any()),
        confidence_score: z.number().min(0.7).max(1.0),
        source_text: z.string().min(1).max(200)
      }))
    });

    console.log('Calling OpenAI with AI SDK...');
    
    const result = await generateObject({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      prompt: userPrompt,
      schema: extractionSchema,
      temperature: 0.1,
      maxTokens: 3000,
    });

    console.log('AI SDK Result:', JSON.stringify(result.object, null, 2));
    console.log('Number of facts extracted:', result.object.facts.length);
    
  } catch (error) {
    console.error('Error during fact extraction test:', error);
    if (error.message) {
      console.error('Error message:', error.message);
    }
    if (error.stack) {
      console.error('Error stack:', error.stack);
    }
  }
}

testFactExtraction();
