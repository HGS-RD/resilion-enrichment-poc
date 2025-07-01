'use client';

import { useEffect, useState, useRef } from 'react';
import { Site } from '../../lib/types/viewer';
import { Factory, Microscope, Building, Warehouse } from 'lucide-react';

interface SiteMapProps {
  sites: Site[];
  onSiteClick: (site: Site) => void;
  className?: string;
}

export function SiteMap({ sites, onSiteClick, className = '' }: SiteMapProps) {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mounted || !mapRef.current) return;

    const initializeMap = async () => {
      try {
        setIsLoading(true);
        setMapError(null);

        // Filter sites that have coordinates
        const geocodedSites = sites.filter(site => site.latitude && site.longitude);
        
        if (geocodedSites.length === 0) {
          setIsLoading(false);
          return;
        }

        // Dynamic import to avoid SSR issues
        const L = (await import('leaflet')).default;
        
        // Clear any existing map
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }

        if (!mapRef.current) return;

        // Calculate map center
        const getMapCenter = (): [number, number] => {
          if (geocodedSites.length === 1) {
            return [geocodedSites[0].latitude!, geocodedSites[0].longitude!];
          }
          
          const avgLat = geocodedSites.reduce((sum, site) => sum + site.latitude!, 0) / geocodedSites.length;
          const avgLng = geocodedSites.reduce((sum, site) => sum + site.longitude!, 0) / geocodedSites.length;
          
          return [avgLat, avgLng];
        };

        // Create map with global view
        const map = L.map(mapRef.current, {
          center: [20, 0], // Center on equator
          zoom: 2, // Global zoom level
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
          dragging: true,
          touchZoom: true
        });
        
        mapInstanceRef.current = map;

        // Add semi-transparent tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 18,
          opacity: 0.7 // Semi-transparent
        }).addTo(map);

        // Helper function to get site type icon
        const getSiteTypeIcon = (siteType: Site['siteType']) => {
          switch (siteType) {
            case 'Manufacturing':
              return 'factory';
            case 'R&D':
              return 'microscope';
            case 'Headquarters':
              return 'building';
            case 'Distribution':
              return 'warehouse';
            default:
              return 'building';
          }
        };

        // Helper function to create custom icon HTML
        const createIconHtml = (siteType: Site['siteType'], operatingStatus: Site['operatingStatus']) => {
          const iconName = getSiteTypeIcon(siteType);
          const color = operatingStatus === 'Active' ? '#10b981' : 
                       operatingStatus === 'Inactive' ? '#f59e0b' :
                       operatingStatus === 'Under Construction' ? '#3b82f6' : '#ef4444';
          
          return `
            <div style="
              background-color: ${color};
              border: 2px solid #ffffff;
              border-radius: 50%;
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${getIconSvgPath(iconName)}
              </svg>
            </div>
          `;
        };

        // Helper function to get SVG path for icons
        const getIconSvgPath = (iconName: string) => {
          switch (iconName) {
            case 'factory':
              return '<path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/>';
            case 'microscope':
              return '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>';
            case 'building':
              return '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>';
            case 'warehouse':
              return '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><path d="m12 6 0 12"/>';
            default:
              return '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>';
          }
        };

        // Add markers with custom icons
        const markers: any[] = [];
        geocodedSites.forEach((site) => {
          // Create custom icon
          const customIcon = L.divIcon({
            html: createIconHtml(site.siteType, site.operatingStatus),
            className: 'custom-div-icon',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -16]
          });

          const marker = L.marker([site.latitude!, site.longitude!], {
            icon: customIcon
          }).addTo(map);

          markers.push(marker);

          // Add popup
          const popupContent = `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${site.name}</h3>
              <p style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                ${site.city}, ${site.country}
              </p>
              <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 10px; padding: 2px 8px; border-radius: 4px; background-color: ${
                  site.operatingStatus === 'Active' ? '#dcfce7; color: #166534' :
                  site.operatingStatus === 'Inactive' ? '#fef3c7; color: #92400e' :
                  site.operatingStatus === 'Under Construction' ? '#dbeafe; color: #1e40af' :
                  '#fee2e2; color: #991b1b'
                };">
                  ${site.operatingStatus}
                </span>
                <span style="font-size: 10px; padding: 2px 8px; border-radius: 4px; background-color: #f3f4f6; color: #374151;">
                  ${site.siteType}
                </span>
              </div>
              <p style="font-size: 12px; color: #6b7280;">
                Click for detailed information
              </p>
            </div>
          `;

          marker.bindPopup(popupContent);
          
          // Add click handler
          marker.on('click', () => {
            onSiteClick(site);
          });
        });

        // Fit bounds if multiple sites
        if (geocodedSites.length > 1 && markers.length > 0) {
          const group = L.featureGroup(markers);
          map.fitBounds(group.getBounds().pad(0.1));
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing map:', error);
        setMapError('Failed to load map. Please refresh the page.');
        setIsLoading(false);
      }
    };

    const timer = setTimeout(initializeMap, 100);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mounted, sites, onSiteClick]);

  // Don't render anything on server
  if (!mounted) {
    return (
      <div className={`h-96 bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  // Filter sites that have coordinates
  const geocodedSites = sites.filter(site => site.latitude && site.longitude);

  if (mapError) {
    return (
      <div className={`h-96 bg-muted rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center space-y-2">
          <p className="text-destructive">{mapError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="text-sm text-primary hover:underline"
          >
            Refresh Page
          </button>
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

  return (
    <div className={`h-96 rounded-lg overflow-hidden relative border ${className}`}>
      <style jsx>{`
        .custom-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      {isLoading && (
        <div className="absolute inset-0 bg-muted rounded-lg flex items-center justify-center z-10">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading interactive map...</p>
          </div>
        </div>
      )}
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ minHeight: '384px' }}
      />
    </div>
  );
}

export default SiteMap;
