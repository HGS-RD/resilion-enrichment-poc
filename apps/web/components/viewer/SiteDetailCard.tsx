'use client';

import { Site } from '../../lib/types/viewer';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button
} from '@workspace/ui/components';
import { 
  MapPin, 
  Building2, 
  Users, 
  Factory, 
  Award, 
  Package, 
  Cpu, 
  Lightbulb,
  ExternalLink,
  Calendar,
  Globe,
  Phone,
  Mail
} from 'lucide-react';

interface SiteDetailCardProps {
  site: Site | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatAddress(site: Site): string {
  const parts = [
    site.addressStreet,
    site.city,
    site.stateProvince,
    site.postalCode,
    site.country
  ].filter(Boolean);
  
  return parts.join(', ');
}

function getStatusColor(status: Site['operatingStatus']): string {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Inactive':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Under Construction':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Closed':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getSiteTypeIcon(siteType: Site['siteType']) {
  switch (siteType) {
    case 'Manufacturing':
      return <Factory className="h-4 w-4" />;
    case 'Headquarters':
      return <Building2 className="h-4 w-4" />;
    case 'R&D':
      return <Lightbulb className="h-4 w-4" />;
    case 'Distribution':
      return <Package className="h-4 w-4" />;
    case 'Office':
      return <Building2 className="h-4 w-4" />;
    default:
      return <Building2 className="h-4 w-4" />;
  }
}

export function SiteDetailCard({ site, isOpen, onOpenChange }: SiteDetailCardProps) {
  console.log('SiteDetailCard rendered with:', { site: site?.name, isOpen, hasOnOpenChange: !!onOpenChange });
  
  if (!site) {
    console.log('SiteDetailCard: No site provided, returning null');
    return null;
  }

  console.log('SiteDetailCard: Rendering drawer with site:', site.name, 'isOpen:', isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {getSiteTypeIcon(site.siteType)}
            {site.name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            {formatAddress(site)}
          </DialogDescription>
        </DialogHeader>
          
          <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
            {/* Site Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <div className={`px-2 py-1 rounded-md text-sm font-medium border ${getStatusColor(site.operatingStatus)}`}>
                      {site.operatingStatus}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Operating Status</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    {getSiteTypeIcon(site.siteType)}
                    <span className="font-medium">{site.siteType}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Site Type</p>
                </CardContent>
              </Card>
              
              {site.employeeCount && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{site.employeeCount.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Employees</p>
                  </CardContent>
                </Card>
              )}
              
              {site.productionCapacity && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-2">
                      <Factory className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{site.productionCapacity}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Production Capacity</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Site Purpose */}
            {site.sitePurpose && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Site Purpose</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{site.sitePurpose}</p>
                </CardContent>
              </Card>
            )}

            {/* Parent Company */}
            {site.parentCompany && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Parent Company
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{site.parentCompany}</p>
                </CardContent>
              </Card>
            )}

            {/* Detailed Information Accordions */}
            <Accordion type="multiple" className="w-full">
              {/* Certifications */}
              {site.certifications.length > 0 && (
                <AccordionItem value="certifications">
                  <AccordionTrigger className="text-base font-medium">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Certifications ({site.certifications.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {site.certifications.map((cert) => (
                        <Card key={cert.certificationId}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium">{cert.name}</h4>
                                <p className="text-sm text-muted-foreground">Issued by {cert.issuer}</p>
                              </div>
                              <Badge variant="outline">
                                Valid until {new Date(cert.validTo).toLocaleDateString()}
                              </Badge>
                            </div>
                            
                            {cert.evidence.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Evidence:</p>
                                {cert.evidence.map((evidence) => (
                                  <div key={evidence.evidenceId} className="text-xs bg-muted p-2 rounded">
                                    <p className="mb-1">{evidence.snippet}</p>
                                    <div className="flex justify-between items-center">
                                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                                        <a href={evidence.sourceURL} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          Source
                                        </a>
                                      </Button>
                                      <span className="text-muted-foreground">
                                        Confidence: {Math.round(evidence.confidenceScore * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Products */}
              {site.products.length > 0 && (
                <AccordionItem value="products">
                  <AccordionTrigger className="text-base font-medium">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Products ({site.products.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {site.products.map((product) => (
                        <Card key={product.productId}>
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-2">{product.name}</h4>
                            <p className="text-sm text-muted-foreground mb-3">{product.description}</p>
                            
                            {product.applications.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Applications:</p>
                                <div className="flex flex-wrap gap-1">
                                  {product.applications.map((app, index) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {app}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {product.evidence.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Evidence:</p>
                                {product.evidence.map((evidence) => (
                                  <div key={evidence.evidenceId} className="text-xs bg-muted p-2 rounded">
                                    <p className="mb-1">{evidence.snippet}</p>
                                    <div className="flex justify-between items-center">
                                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                                        <a href={evidence.sourceURL} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          Source
                                        </a>
                                      </Button>
                                      <span className="text-muted-foreground">
                                        Confidence: {Math.round(evidence.confidenceScore * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Technologies */}
              {site.technologies.length > 0 && (
                <AccordionItem value="technologies">
                  <AccordionTrigger className="text-base font-medium">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      Technologies ({site.technologies.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {site.technologies.map((tech) => (
                        <Card key={tech.technologyId}>
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-2">{tech.name}</h4>
                            <p className="text-sm text-muted-foreground mb-3">{tech.description}</p>
                            
                            {tech.evidence.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Evidence:</p>
                                {tech.evidence.map((evidence) => (
                                  <div key={evidence.evidenceId} className="text-xs bg-muted p-2 rounded">
                                    <p className="mb-1">{evidence.snippet}</p>
                                    <div className="flex justify-between items-center">
                                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                                        <a href={evidence.sourceURL} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          Source
                                        </a>
                                      </Button>
                                      <span className="text-muted-foreground">
                                        Confidence: {Math.round(evidence.confidenceScore * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Capabilities */}
              {site.capabilities.length > 0 && (
                <AccordionItem value="capabilities">
                  <AccordionTrigger className="text-base font-medium">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Capabilities ({site.capabilities.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {site.capabilities.map((capability) => (
                        <Card key={capability.capabilityId}>
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-2">{capability.name}</h4>
                            <p className="text-sm text-muted-foreground mb-3">{capability.description}</p>
                            
                            {capability.evidence.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground">Evidence:</p>
                                {capability.evidence.map((evidence) => (
                                  <div key={evidence.evidenceId} className="text-xs bg-muted p-2 rounded">
                                    <p className="mb-1">{evidence.snippet}</p>
                                    <div className="flex justify-between items-center">
                                      <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                                        <a href={evidence.sourceURL} target="_blank" rel="noopener noreferrer">
                                          <ExternalLink className="h-3 w-3 mr-1" />
                                          Source
                                        </a>
                                      </Button>
                                      <span className="text-muted-foreground">
                                        Confidence: {Math.round(evidence.confidenceScore * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Site Evidence */}
              {site.evidence.length > 0 && (
                <AccordionItem value="site-evidence">
                  <AccordionTrigger className="text-base font-medium">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Site Evidence ({site.evidence.length})
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3">
                      {site.evidence.map((evidence) => (
                        <Card key={evidence.evidenceId}>
                          <CardContent className="p-4">
                            <p className="text-sm mb-3">{evidence.snippet}</p>
                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                              <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                                <a href={evidence.sourceURL} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Source
                                </a>
                              </Button>
                              <div className="flex gap-4">
                                <span>Confidence: {Math.round(evidence.confidenceScore * 100)}%</span>
                                <span>Tier: {evidence.tier}</span>
                                <span>Verified: {new Date(evidence.lastVerified).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </div>
      </DialogContent>
    </Dialog>
  );
}

export default SiteDetailCard;
