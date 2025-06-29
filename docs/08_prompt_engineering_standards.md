# Prompt-Engineering Standards & Coding Guidelines

## **Resilion Enrichment Pre-Loader POC**

## 1. Overview

This document defines best practices for prompt engineering, variable management, and code consistency for the enrichment pre-loader POC. These standards help reduce hallucinations, keep code maintainable, and improve team productivity, especially when using code-generation tools like Cline, Cursor, or Claude.

---

## 2. Prompt Structure Guidelines

- Always use a **system prompt** to define role and guardrails
    - for example:
        
        *“You are an industrial enrichment assistant. Extract manufacturing sites only from explicit text.”*
        
- Follow a **user prompt** pattern with:
    - clear instructions
    - schema reference
    - JSON example
- Include “If you cannot find relevant data, return an empty array” in every prompt
- Avoid vague phrases like *“please try your best”* — use strong, explicit instructions
- Always present a **valid JSON schema** in the prompt
- Use JSON formatting **examples** inside the prompt to anchor the LLM
- Include a confidence scoring explanation in the prompt
- Always restate *“do not hallucinate or speculate”*
- Never allow default values like “N/A” or “unknown” unless explicitly allowed

---

## 3. Prompt Versioning

- Store prompts as markdown (`prompts/extraction.md`) under version control
- Increment version numbers for every schema or instruction change
- Add a date and author to the top of each prompt file
- Treat prompts as first-class code artifacts, not one-off experiments

---

## 4. Variable Naming Conventions

- Use **lowerCamelCase** for variables in TypeScript/Node (e.g., `enrichmentJobId`)
- Use **snake_case** for Postgres column names (e.g., `enrichment_job_id`)
- Match prompt variable names exactly to schema keys to simplify validation
- Maintain consistency between code and prompt references
    - e.g., do not mix `siteType` vs. `site_type`

---

## 5. JSON Output Rules

- Strictly enforce the JSON schema
- Validate LLM outputs using JSON Schema validators before persisting
- Reject and retry partial or invalid JSON automatically
- Store raw text output for debugging if parsing fails
- Never allow fallback text summaries in place of structured JSON

---

## 6. Error Handling

- Capture and store LLM error messages in a separate Postgres column (`error_message`)
- Log prompt/response pairs for debugging and prompt refinement
- If the extraction repeatedly fails, fall back to a placeholder enrichment fact with `confidence: 0` and a note for human review
- Never throw away evidence text, even if extraction fails

---

## 7. Style Guidelines

- Keep prompt instructions under 1000 tokens to maintain clarity
- Avoid overly nested instructions that confuse the LLM
- Include schema at the **end** of the prompt to maximize context
- Version prompts by explicit `## Version` headers
- Use consistent section headers (`## System`, `## User`, `## JSON Schema`, `## Example`) inside markdown prompt files

---

## 8. Testing & Validation

- Add prompt test cases in a `test/prompts/` folder
- Include:
    - positive examples
    - negative examples
    - edge cases (e.g., missing address, no manager name)
- Automate tests with a lightweight script to validate JSON conformance
- Track failures for prompt improvements over time

---

## 9. Coding Guidelines for Agent Chain

- Keep chain steps modular and easy to swap out
- Maintain consistent naming for each chain step (e.g., `crawl`, `embed`, `extract`, `score`, `persist`)
- Commit code frequently with descriptive messages
- Use typed interfaces for enrichment facts matching the JSON schema
- Prefer environment variables for API keys and secrets
- Keep business logic out of prompts; do post-processing in code instead

---

## 10. Collaboration Best Practices

- Always document schema changes before changing prompt logic
- Use pull requests for any prompt file edits
- Peer-review prompts just like source code
- Maintain a shared “Prompt Registry” in the repo to track active prompts and their versions

---