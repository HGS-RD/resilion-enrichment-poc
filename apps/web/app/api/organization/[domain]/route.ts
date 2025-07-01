import { NextRequest, NextResponse } from 'next/server';
import { EnrichmentViewerData } from '../../../../lib/types/viewer';

/**
 * API Route: GET /api/organization/[domain]
 * 
 * Returns hierarchical organization data for the fact viewer
 * Currently serves mock data - will be replaced with database queries in Milestone 3
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;

    // Mock data for stepan.com - matches the blueprint structure
    const mockData: EnrichmentViewerData = {
      organization: {
        organizationId: "org-stepan-001",
        name: "Stepan Company",
        website: "https://stepan.com",
        headquarters: "Northfield, Illinois, USA",
        industry: "Specialty Chemicals",
        industrySectors: ["Chemicals", "Industrial"],
        financialSummary: "$2.5B revenue",
        contacts: [
          {
            contactId: "contact-stepan-001",
            phoneNumber: "+1 847 446 7500",
            email: "info@stepan.com",
            linkedToOrganizationId: "org-stepan-001",
            evidence: [
              {
                evidenceId: "evidence-001",
                snippet: "Contact number found on About page",
                sourceURL: "https://stepan.com/contact",
                confidenceScore: 0.9,
                lastVerified: "2025-07-01T15:00:00Z",
                tier: "Tier 1"
              }
            ]
          }
        ],
        evidence: [
          {
            evidenceId: "evidence-002",
            snippet: "Stepan Company is a global manufacturer of specialty and intermediate chemicals.",
            sourceURL: "https://stepan.com/about",
            confidenceScore: 0.9,
            lastVerified: "2025-07-01T15:00:00Z",
            tier: "Tier 1"
          }
        ]
      },
      sites: [
        {
          siteId: "site-vlissingen-001",
          organizationId: "org-stepan-001",
          name: "Vlissingen Plant",
          addressStreet: "Maltaweg 3-2",
          city: "Vlissingen",
          stateProvince: "",
          postalCode: "4380 AK",
          country: "Netherlands",
          latitude: 51.453,
          longitude: 3.577,
          siteType: "Manufacturing",
          sitePurpose: "Alpha Olefin Surfactants production",
          operatingStatus: "Active",
          employeeCount: 150,
          productionCapacity: "10,000 tons/year",
          parentCompany: "Stepan Europe BV",
          certifications: [
            {
              certificationId: "cert-iso-001",
              name: "ISO 9001:2015",
              issuer: "ISO",
              validFrom: "2024-01-01",
              validTo: "2027-01-01",
              linkedSiteId: "site-vlissingen-001",
              evidence: [
                {
                  evidenceId: "evidence-003",
                  snippet: "ISO 9001:2015 certification displayed on facility page",
                  sourceURL: "https://stepan.com/facilities/vlissingen",
                  confidenceScore: 0.95,
                  lastVerified: "2025-07-01T15:00:00Z",
                  tier: "Tier 1"
                }
              ]
            }
          ],
          products: [
            {
              productId: "product-aos-001",
              name: "Alpha Olefin Sulfonates (AOS)",
              description: "A surfactant used in industrial detergents",
              applications: ["Detergents", "Cleaners"],
              linkedSiteId: "site-vlissingen-001",
              evidence: [
                {
                  evidenceId: "evidence-004",
                  snippet: "AOS production capabilities mentioned in facility overview",
                  sourceURL: "https://stepan.com/products/aos",
                  confidenceScore: 0.88,
                  lastVerified: "2025-07-01T15:00:00Z",
                  tier: "Tier 1"
                }
              ]
            }
          ],
          technologies: [
            {
              technologyId: "tech-ethox-001",
              name: "Ethoxylation Process",
              description: "Ethoxylation line for surfactant production",
              linkedSiteId: "site-vlissingen-001",
              evidence: [
                {
                  evidenceId: "evidence-005",
                  snippet: "Ethoxylation capabilities described in technical documentation",
                  sourceURL: "https://stepan.com/technologies/ethoxylation",
                  confidenceScore: 0.82,
                  lastVerified: "2025-07-01T15:00:00Z",
                  tier: "Tier 1"
                }
              ]
            }
          ],
          capabilities: [
            {
              capabilityId: "cap-sustain-001",
              name: "Sustainability Certifications",
              description: "ISCC PLUS sustainable feedstocks",
              linkedSiteId: "site-vlissingen-001",
              evidence: [
                {
                  evidenceId: "evidence-006",
                  snippet: "ISCC PLUS certification mentioned in sustainability report",
                  sourceURL: "https://stepan.com/sustainability/certifications",
                  confidenceScore: 0.85,
                  lastVerified: "2025-07-01T15:00:00Z",
                  tier: "Tier 1"
                }
              ]
            }
          ],
          contacts: [],
          evidence: [
            {
              evidenceId: "evidence-007",
              snippet: "Alpha Olefin Sulfonates production at Vlissingen site",
              sourceURL: "https://stepan.com/facilities",
              confidenceScore: 0.9,
              lastVerified: "2025-07-01T15:00:00Z",
              tier: "Tier 1"
            }
          ]
        },
        {
          siteId: "site-northfield-001",
          organizationId: "org-stepan-001",
          name: "Northfield Headquarters",
          addressStreet: "22 West Frontage Road",
          city: "Northfield",
          stateProvince: "Illinois",
          postalCode: "60093",
          country: "United States",
          // No coordinates for this site to test the optional geocoding
          siteType: "Headquarters",
          sitePurpose: "Corporate headquarters and R&D",
          operatingStatus: "Active",
          employeeCount: 200,
          certifications: [],
          products: [],
          technologies: [],
          capabilities: [
            {
              capabilityId: "cap-rd-001",
              name: "Research & Development",
              description: "Corporate R&D facilities for new product development",
              linkedSiteId: "site-northfield-001",
              evidence: [
                {
                  evidenceId: "evidence-008",
                  snippet: "R&D capabilities mentioned in corporate overview",
                  sourceURL: "https://stepan.com/about/research",
                  confidenceScore: 0.87,
                  lastVerified: "2025-07-01T15:00:00Z",
                  tier: "Tier 1"
                }
              ]
            }
          ],
          contacts: [],
          evidence: [
            {
              evidenceId: "evidence-009",
              snippet: "Corporate headquarters located in Northfield, Illinois",
              sourceURL: "https://stepan.com/about",
              confidenceScore: 0.95,
              lastVerified: "2025-07-01T15:00:00Z",
              tier: "Tier 1"
            }
          ]
        }
      ],
      people: [
        {
          personId: "person-001",
          name: "John Doe",
          role: "Plant Manager",
          linkedToOrgOrSite: "site-vlissingen-001",
          contactInfo: "john.doe@stepan.com",
          evidence: [
            {
              evidenceId: "evidence-010",
              snippet: "John Doe listed as Plant Manager in facility directory",
              sourceURL: "https://stepan.com/facilities/vlissingen/contacts",
              confidenceScore: 0.78,
              lastVerified: "2025-07-01T15:00:00Z",
              tier: "Tier 2"
            }
          ]
        }
      ]
    };

    // For now, return mock data for any domain
    // In Milestone 3, we'll add domain-specific logic and database queries
    return NextResponse.json(mockData);

  } catch (error) {
    console.error('Error fetching organization data:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to fetch organization data'
    }, { status: 500 });
  }
}
