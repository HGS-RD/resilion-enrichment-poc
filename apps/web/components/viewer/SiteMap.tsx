'use client';

import { useEffect, useState } from 'react';
import { Site } from '../../lib/types/viewer';

interface SiteMapProps {
  sites: Site[];
  onSiteClick: (site: Site) => void;
  className?: string;
}

export function SiteMap({ sites, onSiteClick, className = '' }: SiteMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Filter sites that have coordinates
  const geocodedSites = sites.filter(site => site.latitude && site.longitude);

  if (!isClient) {
    return (
      <div className={`h-96 bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (geocodedSites.length === 0) {
    return (
      <div className={`h-96 bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No geocoded sites available</p>
          <p className="text-sm text-muted-foreground">
            {sites.length} total sites, but none have coordinates
          </p>
        </div>
      </div>
    );
  }

  // For now, show a simple list view with site information
  // This will be replaced with an actual map in the next iteration
  return (
    <div className={`h-96 rounded-lg border bg-card ${className}`}>
      <div className="p-4 border-b">
        <h3 className="font-semibold text-lg">Site Locations</h3>
        <p className="text-sm text-muted-foreground">
          {geocodedSites.length} geocoded sites (Interactive map coming soon)
        </p>
      </div>
      <div className="p-4 space-y-3 overflow-y-auto max-h-80">
        {geocodedSites.map((site) => (
          <div
            key={site.siteId}
            className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => onSiteClick(site)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{site.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {site.city}, {site.country}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Coordinates: {site.latitude?.toFixed(3)}, {site.longitude?.toFixed(3)}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className={`text-xs px-2 py-1 rounded text-center ${
                  site.operatingStatus === 'Active' ? 'bg-green-100 text-green-800' :
                  site.operatingStatus === 'Inactive' ? 'bg-amber-100 text-amber-800' :
                  site.operatingStatus === 'Under Construction' ? 'bg-blue-100 text-blue-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {site.operatingStatus}
                </span>
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800 text-center">
                  {site.siteType}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SiteMap;
