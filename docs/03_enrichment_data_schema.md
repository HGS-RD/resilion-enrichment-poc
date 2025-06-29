# Enrichment Data Schema

## **Resilion Enrichment Pre-Loader POC**

---

## 1. Overview

This schema defines the structure of the enrichment facts produced by the Resilion enrichment pre-loader POC. Its purpose is to maintain consistency, enable reliable parsing, and support confidence-ranked onboarding enrichment across multiple passes and sources.

---

## 2. JSON Schema

```json
{
  "type": "object",
  "properties": {
    "site_name": {
      "type": "string",
      "description": "Name of the manufacturing or industrial site"
    },
    "site_type": {
      "type": "string",
      "description": "Classification of the site, e.g., manufacturing plant, processing plant, distribution center, refinery, substation, warehouse"
    },
    "site_purpose": {
      "type": "string",
      "description": "What goods are produced, processed, or stored at this site"
    },
    "address": {
      "type": "string",
      "description": "Street address of the site, if available"
    },
    "city": {
      "type": "string",
      "description": "City of the site"
    },
    "state": {
      "type": "string",
      "description": "State, province, or region of the site"
    },
    "country": {
      "type": "string",
      "description": "Country of the site"
    },
    "plant_manager": {
      "type": "string",
      "description": "Name of the plant manager or responsible contact if available"
    },
    "number_of_employees": {
      "type": "integer",
      "description": "Approximate employee count if available"
    },
    "operational_status": {
      "type": "string",
      "description": "Operating status of the site, e.g., active, inactive, under construction"
    },
    "parent_company": {
      "type": "string",
      "description": "Parent company if the site is owned by a subsidiary"
    },
    "last_verified_date": {
      "type": "string",
      "format": "date-time",
      "description": "Timestamp of the most recent enrichment or validation"
    },
    "geo_coordinates": {
      "type": "object",
      "properties": {
        "latitude": { "type": "number" },
        "longitude": { "type": "number" }
      },
      "description": "Geographic coordinates of the site if available"
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1,
      "description": "Confidence score ranging from 0 to 1"
    },
    "source_url": {
      "type": "string",
      "format": "uri",
      "description": "Direct URL of the page where the data was found"
    },
    "evidence_text": {
      "type": "string",
      "description": "Short snippet of text from the source providing evidence for the extracted fact"
    },
    "enrichment_job_id": {
      "type": "string",
      "description": "Identifier of the enrichment job which generated this fact"
    }
  },
  "required": ["site_name", "confidence", "enrichment_job_id"]
}

```

---

## 3. Example JSON

```json
{
  "site_name": "Acme Manufacturing Plant A",
  "site_type": "manufacturing plant",
  "site_purpose": "automotive parts assembly",
  "address": "123 Production Drive",
  "city": "Springfield",
  "state": "IL",
  "country": "USA",
  "plant_manager": "John Smith",
  "number_of_employees": 275,
  "operational_status": "active",
  "parent_company": "Acme Holdings LLC",
  "last_verified_date": "2025-06-28T15:45:00Z",
  "geo_coordinates": {
    "latitude": 39.7817,
    "longitude": -89.6501
  },
  "confidence": 0.92,
  "source_url": "https://acme.com/facilities",
  "evidence_text": "Acme operates its Springfield Plant A, an automotive parts assembly plant managed by John Smith with about 275 employees.",
  "enrichment_job_id": "job_20250628_001"
}

```

---

## 4. Notes

- The `confidence` field is critical for human-in-the-loop review or future automation.
- `source_url` must capture the exact page, not a generic homepage.
- `evidence_text` should be short and support human review or downstream audit.
- `enrichment_job_id` links multiple enrichment passes or retries together for traceability.
- Storing the data in Postgres JSONB is recommended for flexible indexing and querying.
- Embeddings of `evidence_text` should be stored in Pinecone, linked to the same enrichment job ID for semantic retrieval.
- `geo_coordinates` is optional but improves precision for mapping and visualization.

---