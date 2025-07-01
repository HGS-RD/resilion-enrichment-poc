'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Button } from '@workspace/ui/components';
import { ExternalLink, MapPin, Building2, Users, Globe, Award } from 'lucide-react';
import { EnrichmentViewerData, OrganizationSummary, Site } from '../../../lib/types/viewer';
import { SiteMap } from '../../../components/viewer/SiteMap';
import { SiteDetailCard } from '../../../components/viewer/SiteDetailCard';

/**
 * Resilion Enrichment Fact Viewer - Main Page
 * 
 * Displays hierarchical organization data with:
 * - Organization overview card
 * - Map placeholder (to be implemented in Milestone 2)
 * - Sites data table placeholder (to be implemented in Milestone 3)
 */

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-64 bg-muted rounded animate-pulse" />
        <div className="h-4 w-96 bg-muted rounded animate-pulse" />
      </div>
      <div className="h-48 w-full bg-muted rounded animate-pulse" />
      <div className="h-96 w-full bg-muted rounded animate-pulse" />
      <div className="h-64 w-full bg-muted rounded animate-pulse" />
    </div>
  );
}

// Organization overview card component
function OrganizationOverviewCard({ organization }: { organization: OrganizationSummary }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          {organization.name}
        </CardTitle>
        <CardDescription>
          {organization.industry} • {organization.headquarters}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Website</p>
            <Button variant="link" className="h-auto p-0 text-left justify-start" asChild>
              <a href={organization.website} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                {organization.website.replace('https://', '')}
              </a>
            </Button>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Total Sites</p>
            <p className="text-lg font-semibold">{organization.totalSites}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Active Sites</p>
            <p className="text-lg font-semibold text-green-600">{organization.activeSites}</p>
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Last Enriched</p>
            <p className="text-sm">{organization.lastEnrichmentDate}</p>
          </div>
        </div>
        
        {organization.financialSummary && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-muted-foreground mb-1">Financial Summary</p>
            <Badge variant="secondary">{organization.financialSummary}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ViewerPage() {
  const params = useParams();
  const domain = params.domain as string;
  
  const [data, setData] = useState<EnrichmentViewerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleSiteClick = (site: Site) => {
    setSelectedSite(site);
    setIsDrawerOpen(true);
  };

  useEffect(() => {
    const fetchOrganizationData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/organization/${domain}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        
        const organizationData: EnrichmentViewerData = await response.json();
        setData(organizationData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (domain) {
      fetchOrganizationData();
    }
  }, [domain]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-destructive">
              Error loading organization data: {error}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              No data found for domain: {domain}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const organizationSummary: OrganizationSummary = {
    name: data.organization.name,
    headquarters: data.organization.headquarters,
    industry: data.organization.industry,
    website: data.organization.website,
    financialSummary: data.organization.financialSummary,
    totalSites: data.sites.length,
    activeSites: data.sites.filter(site => site.operatingStatus === 'Active').length,
    lastEnrichmentDate: new Date().toISOString().split('T')[0] // Mock date
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Enrichment Fact Viewer
        </h1>
        <p className="text-muted-foreground">
          Comprehensive view of {data.organization.name} facilities and capabilities
        </p>
      </div>

      {/* Organization Overview Card */}
      <OrganizationOverviewCard organization={organizationSummary} />

      {/* Interactive Site Map */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Global Site Map
          </CardTitle>
          <CardDescription>
            Interactive map showing {data.sites.filter(site => site.latitude && site.longitude).length} geocoded sites worldwide
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SiteMap 
            sites={data.sites} 
            onSiteClick={handleSiteClick}
          />
        </CardContent>
      </Card>

      {/* Sites Data Table Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Sites Overview
          </CardTitle>
          <CardDescription>
            Detailed table of all organization sites and facilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center space-y-2">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                Sites data table will be implemented in Milestone 3
              </p>
              <p className="text-sm text-muted-foreground">
                Will display {data.sites.length} total sites with filtering and sorting
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{data.sites.length}</p>
                <p className="text-sm text-muted-foreground">Total Sites</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{data.people.length}</p>
                <p className="text-sm text-muted-foreground">Key Personnel</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">
                  {data.sites.reduce((total, site) => total + site.certifications.length, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Certifications</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Site Detail Drawer */}
      <SiteDetailCard 
        site={selectedSite}
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </div>
  );
}
