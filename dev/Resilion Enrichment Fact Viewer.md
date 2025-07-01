# Resilion Enrichment Fact Viewer

**Development Blueprint**

**Version**: 1.0

**Date**: 2025-07-02

**Author**: Roger Hill

---

## **Overview**

The Resilion Enrichment Company Fact Viewer will present hierarchical, evidence-driven enrichment data for organizations in an intuitive, spatially contextual manner. This feature will provide a powerful overview of an organization, its sites, their certifications, products, technologies, contacts, and other capabilities in a single integrated experience.

The UI will include:

✅ a semi-transparent global map showing enriched sites with icon overlays

✅ a detail panel for each site

✅ a company-level overview summary

✅ an enriched sites data table

✅ a consistent evidence-traceable drilldown

---

## **1️⃣ Data Model**

The enrichment data model will follow a **hierarchical JSON structure**:

```json
{
  "organization": {
    "organizationId": "uuid",
    "name": "Stepan Company",
    "website": "https://stepan.com",
    "headquarters": "Northfield, Illinois, USA",
    "industry": "Specialty Chemicals",
    "industrySectors": ["Chemicals", "Industrial"],
    "financialSummary": "$2.5B revenue",
    "contacts": [
      {
        "contactId": "uuid",
        "phoneNumber": "+1 847 446 7500",
        "email": "info@stepan.com",
        "linkedToOrganizationId": "uuid",
        "evidence": [
          {
            "evidenceId": "uuid",
            "snippet": "Contact number found on About page",
            "sourceURL": "https://stepan.com/contact",
            "confidenceScore": 0.9,
            "lastVerified": "2025-07-01T15:00:00Z",
            "tier": "Tier 1"
          }
        ]
      }
    ],
    "evidence": [
      {
        "evidenceId": "uuid",
        "snippet": "Stepan Company is a global manufacturer of specialty and intermediate chemicals.",
        "sourceURL": "https://stepan.com/about",
        "confidenceScore": 0.9,
        "lastVerified": "2025-07-01T15:00:00Z",
        "tier": "Tier 1"
      }
    ]
  },
  "sites": [
    {
      "siteId": "uuid",
      "organizationId": "uuid",
      "name": "Vlissingen Plant",
      "addressStreet": "Maltaweg 3-2",
      "city": "Vlissingen",
      "stateProvince": "",
      "postalCode": "4380 AK",
      "country": "Netherlands",
      "latitude": 51.453,
      "longitude": 3.577,
      "siteType": "Manufacturing",
      "sitePurpose": "Alpha Olefin Surfactants production",
      "operatingStatus": "Active",
      "employeeCount": 150,
      "productionCapacity": "10,000 tons/year",
      "parentCompany": "Stepan Europe BV",
      "certifications": [
        {
          "certificationId": "uuid",
          "name": "ISO 9001:2015",
          "issuer": "ISO",
          "validFrom": "2024-01-01",
          "validTo": "2027-01-01",
          "linkedSiteId": "uuid",
          "evidence": []
        }
      ],
      "products": [
        {
          "productId": "uuid",
          "name": "Alpha Olefin Sulfonates (AOS)",
          "description": "A surfactant used in industrial detergents",
          "applications": ["Detergents", "Cleaners"],
          "linkedSiteId": "uuid",
          "evidence": []
        }
      ],
      "technologies": [
        {
          "technologyId": "uuid",
          "name": "Ethoxylation Process",
          "description": "Ethoxylation line for surfactant production",
          "linkedSiteId": "uuid",
          "evidence": []
        }
      ],
      "capabilities": [
        {
          "capabilityId": "uuid",
          "name": "Sustainability Certifications",
          "description": "ISCC PLUS sustainable feedstocks",
          "linkedSiteId": "uuid",
          "evidence": []
        }
      ],
      "contacts": [],
      "evidence": [
        {
          "evidenceId": "uuid",
          "snippet": "Alpha Olefin Sulfonates production at Vlissingen site",
          "sourceURL": "https://stepan.com/facilities",
          "confidenceScore": 0.9,
          "lastVerified": "2025-07-01T15:00:00Z",
          "tier": "Tier 1"
        }
      ]
    }
  ],
  "people": [
    {
      "personId": "uuid",
      "name": "John Doe",
      "role": "Plant Manager",
      "linkedToOrgOrSite": "uuid",
      "contactInfo": "john.doe@stepan.com",
      "evidence": []
    }
  ]
}

```

**Key points:**

- evidence is required at every level
- every site includes its geo-coordinates to support map display
- certifications, products, contacts, people are all tied to a site or org
- all identifiers are UUIDs

---

## **2️⃣ Frontend UI / UX Vision**

✅ **Map View**

- semi-transparent global map background
- overlays site pins with icons by type (manufacturing, distribution, R&D, HQ, etc.)
- icons color-coded by status (green: active, gray: inactive, orange: under construction, red: closed)
- clustering where sites are dense
- click on a pin opens a **site detail card** showing:
    - site name
    - address
    - certifications
    - products
    - technologies
    - confidence score
    - evidence snippet with link

✅ **Organization Overview Cards** *(below map)*

- name, HQ, industry, website
- most recent enrichment date
- financial summary
- quick certification badges

✅ **Enriched Sites Table** *(below overview)*

- list of all sites
- columns:
    - site name
    - city
    - country
    - type
    - status
    - confidence score
    - certification list (comma-separated)
- filterable/sortable
- click-to-drilldown to site card

✅ **Fact Details Panel**

- shows **all** facts in raw view
- grouped by:
    - location
    - certification
    - product
    - contact
    - person
    - capability
    - technology
- expandable details with:
    - evidence snippet
    - source URL
    - confidence
    - last verified

---

## **3️⃣ Frontend Technical Expectations**

- Next.js 14 app router
- shadcn/ui components
- Mapbox GL JS or React Leaflet for the map
- integrate Tailwind for consistent design
- responsive layout
- well-structured reusable components
- real-time job status updates from enrichment runs
- evidence traceability preserved in the UI
- hover tooltips for site pins
- click-to-expand site profile
- tiered enrichment pass visualization using Mermaid diagrams

---

## **4️⃣ Backend Expectations**

- FastAPI enrichment orchestration
- Connect to Postgres (JSONB fields for flexible enrichment data)
- Connect to Pinecone for embeddings
- store LLM used for each enrichment
- store pass/fail, retries, confidence summary
- manage enrichment passes by source tier
    - Tier 1 (official corporate)
    - Tier 2 (LinkedIn, job boards)
    - Tier 3 (news articles)
    - Tier 4 (financial filings)
- financial parsing handled as a separate agent
- max 30-minute job timeout
- evidence required for every enrichment record

---

## **5️⃣ CI/CD Expectations**

- DigitalOcean App Platform deployment
- managed Postgres
- Pinecone environment variable support
- environment secrets for:
    - OPENAI_API_KEY
    - PINECONE_API_KEY
    - DIGITALOCEAN_API_TOKEN
- Github actions for lint, test, deploy
- branch naming convention:
    - `feature/enrichment-agent`
    - `feature/map-ui`
    - `feature/fact-viewer`

---

## **6️⃣ Acceptance Criteria**

✅ minimum 1 site enriched with confidence > 0.7

✅ evidence text + URL attached

✅ clickable pins on the global map

✅ site detail card shows full hierarchy

✅ organization-level card displays summary

✅ job progress shown with Mermaid diagrams

✅ enrichment job finishes within 30 minutes or marks partial

✅ retry logic up to 3 times

✅ user can select LLM

✅ deployable to DigitalOcean App Platform

---

**This document** should be delivered to CLINE with:

- your current repo
- the enrichment JSON schema
- this UX blueprint

so they can **build a milestone-based plan** in plan mode before executing.

---

If you want, I can help you break **this** into bite-sized prompts for CLINE milestone generation — just say:

> “yes, let’s break it into milestone prompts”
> 

and I’ll happily do it!