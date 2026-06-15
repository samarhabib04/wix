'use client';

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { calculateDistance, formatDistance } from '@/lib/utils/geo-location';
import { useIsMobile } from '@/hooks/use-mobile';
import { getBusinessServiceTypeLabel } from '@/lib/config/business-service-types';

// Add type declarations for leaflet.markercluster
declare module 'leaflet' {
  interface MarkerClusterGroupOptions {
    showCoverageOnHover?: boolean;
    zoomToBoundsOnClick?: boolean;
    spiderfyOnMaxZoom?: boolean;
    removeOutsideVisibleBounds?: boolean;
    animate?: boolean;
    animateAddingMarkers?: boolean;
    disableClusteringAtZoom?: number;
    maxClusterRadius?: number;
    polygonOptions?: L.PolylineOptions;
    singleMarkerMode?: boolean;
    spiderLegPolylineOptions?: L.PolylineOptions;
    spiderfyDistanceMultiplier?: number;
    iconCreateFunction?: (cluster: L.MarkerCluster) => L.DivIcon | L.Icon;
  }

  class MarkerCluster extends L.Marker {
    getAllChildMarkers(): L.Marker[];
    getChildCount(): number;
    zoomToBounds(): void;
    getBounds(): L.LatLngBounds;
  }

  class MarkerClusterGroup extends L.FeatureGroup {
    addLayer(layer: L.Layer): this;
    addLayers(layers: L.Layer[]): this;
    removeLayers(layers: L.Layer[]): this;
    removeLayer(layer: L.Layer): this;
    clearLayers(): this;
    zoomToShowLayer(layer: L.Layer, callback?: () => void): void;
    refreshClusters(clusters?: L.Layer | L.Layer[] | L.LayerGroup): this;
    hasLayer(layer: L.Layer): boolean;
    getVisibleParent(marker: L.Marker): L.Marker;
    spiderfy(): void;
    unspiderfy(): void;
  }

  function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup;
}

// Define the business type
interface Business {
  id: number;
  name: string;
  type: string;
  coordinates: { lat: number, lng: number };
  partner: boolean;
  address: string;
  county: string;
  eircode?: string | null;
  slug: string;
}

interface ServicesMapProps {
  businesses: Business[];
  hoveredBusinessId: string | null;
  setHoveredBusiness: (id: string | null) => void;
  userLocation: { lat: number, lng: number } | null;
  isVisible?: boolean; // Optional prop to track visibility (for mobile collapsible)
}

// Default coordinates (Ireland as default, but will use user location if available)
const DEFAULT_CENTER = { lat: 53.1424, lng: -7.6921 };
const DEFAULT_ZOOM = 7;
const IP_LOCATION_ZOOM = 14; // Local view zoom level for IP-based location (increased from 13 for more local feel)
const MAX_ZOOM = 18;
const MIN_ZOOM = 2; // Allow zooming out more for global view

// Create a container for all markers and their references
const markersRef: { [key: number]: L.Marker } = {};
let userLocationMarker: L.Marker | null = null;
const polylinesRef: { [key: number]: L.Polyline } = {};

// Geocoding cache to avoid repeated API calls
const geocodeCache: { [key: string]: { lat: number, lng: number } | null } = {};

// County center coordinates for Ireland (fallback when geocoding fails)
const COUNTY_CENTERS: { [key: string]: { lat: number, lng: number } } = {
  'Antrim': { lat: 54.7877, lng: -6.0037 },
  'Armagh': { lat: 54.3503, lng: -6.6528 },
  'Carlow': { lat: 52.8408, lng: -6.9314 },
  'Cavan': { lat: 53.9909, lng: -7.3609 },
  'Clare': { lat: 52.8477, lng: -8.9860 },
  'Cork': { lat: 51.8985, lng: -8.4756 },
  'Derry': { lat: 54.9981, lng: -7.3086 },
  'Donegal': { lat: 54.6542, lng: -8.1090 },
  'Down': { lat: 54.3285, lng: -5.8378 },
  'Dublin': { lat: 53.3498, lng: -6.2603 },
  'Fermanagh': { lat: 54.4570, lng: -7.6390 },
  'Galway': { lat: 53.2707, lng: -9.0568 },
  'Kerry': { lat: 52.1663, lng: -9.7030 },
  'Kildare': { lat: 53.1639, lng: -6.9107 },
  'Kilkenny': { lat: 52.6541, lng: -7.2448 },
  'Laois': { lat: 53.0344, lng: -7.2992 },
  'Leitrim': { lat: 54.0239, lng: -8.0651 },
  'Limerick': { lat: 52.6638, lng: -8.6267 },
  'Longford': { lat: 53.7283, lng: -7.7956 },
  'Louth': { lat: 53.9560, lng: -6.4019 },
  'Mayo': { lat: 53.7644, lng: -9.2940 },
  'Meath': { lat: 53.6055, lng: -6.6617 },
  'Monaghan': { lat: 54.2492, lng: -6.9683 },
  'Offaly': { lat: 53.2320, lng: -7.7928 },
  'Roscommon': { lat: 53.6279, lng: -8.1951 },
  'Sligo': { lat: 54.2766, lng: -8.4761 },
  'Tipperary': { lat: 52.4731, lng: -8.1549 },
  'Tyrone': { lat: 54.6114, lng: -7.3047 },
  'Waterford': { lat: 52.2593, lng: -7.1101 },
  'Westmeath': { lat: 53.5386, lng: -7.3394 },
  'Wexford': { lat: 52.3369, lng: -6.4591 },
  'Wicklow': { lat: 52.9810, lng: -6.0448 }
};

const ServicesMap: React.FC<ServicesMapProps> = ({ 
  businesses, 
  hoveredBusinessId, 
  setHoveredBusiness,
  userLocation,
  isVisible = true
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerClusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const alreadyInitialized = useRef(false);
  const router = useRouter();
  const [geocodedBusinesses, setGeocodedBusinesses] = useState<Business[]>([]);
  const isMobile = useIsMobile();
  
  // Initialize map on component mount
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Only initialize map once
    if (mapRef.current) return;
    
    try {
      // Use user location if available, otherwise use Ireland center
      const IRELAND_CENTER = { lat: 53.1424, lng: -7.6921 }; // Center of Ireland
      const initialCenter = userLocation || IRELAND_CENTER;
      const initialZoom = userLocation ? IP_LOCATION_ZOOM : DEFAULT_ZOOM; // Zoom 7 for Ireland, 14 for user location
      
      // Create leaflet map with light base map
      const map = L.map(mapContainerRef.current, {
        zoomControl: false, // Disable default zoom control first (we'll add custom one)
        attributionControl: false,
        maxZoom: MAX_ZOOM,
        minZoom: MIN_ZOOM,
        scrollWheelZoom: true, // Enable mouse wheel zoom
        doubleClickZoom: true, // Enable double-click zoom
        boxZoom: true, // Enable box zoom
        keyboard: true // Enable keyboard navigation
      }).setView(
        [initialCenter.lat, initialCenter.lng],
        initialZoom
      );
      
      // Add a subtle base map layer with roads and boundaries
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: MAX_ZOOM
      }).addTo(map);
      
      // Add custom zoom control with enhanced styling in bottom right
      const zoomControl = L.control.zoom({
        position: 'bottomright'
      });
      zoomControl.addTo(map);
      
      // Force zoom control styling after a short delay
      setTimeout(() => {
        const zoomControlContainer = document.querySelector('.leaflet-control-zoom') as HTMLElement;
        if (zoomControlContainer) {
          zoomControlContainer.style.cssText = `
            border: none !important;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15) !important;
            margin: 12px !important;
            z-index: 10000 !important;
            pointer-events: auto !important;
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
            position: relative !important;
          `;
          
          const zoomButtons = zoomControlContainer.querySelectorAll('a');
          zoomButtons.forEach((button, index) => {
            const htmlButton = button as HTMLElement;
            
            // Set the text content for the buttons
            if (index === 0) {
              htmlButton.innerHTML = '+';
              htmlButton.title = 'Zoom in';
            } else {
              htmlButton.innerHTML = '−';
              htmlButton.title = 'Zoom out';
            }
            
            htmlButton.style.cssText = `
              background: white !important;
              border: 2px solid #BFCFBB !important;
              color: #BFCFBB !important;
              font-weight: 700 !important;
              font-size: 18px !important;
              width: 40px !important;
              height: 40px !important;
              line-height: 36px !important;
              text-align: center !important;
              transition: all 0.2s ease !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              opacity: 1 !important;
              visibility: visible !important;
              pointer-events: auto !important;
              cursor: pointer !important;
              user-select: none !important;
              -webkit-user-select: none !important;
              border-radius: ${index === 0 ? '8px 8px 0 0' : '0 0 8px 8px'} !important;
              ${index === 1 ? 'border-top: none !important;' : ''}
              text-decoration: none !important;
              position: relative !important;
              z-index: 10001 !important;
            `;
            
            // Remove any existing event listeners and add new ones
            const newButton = htmlButton.cloneNode(true) as HTMLElement;
            htmlButton.parentNode?.replaceChild(newButton, htmlButton);
            
            newButton.addEventListener('mouseenter', () => {
              newButton.style.background = '#BFCFBB';
              newButton.style.color = 'white';
              newButton.style.borderColor = '#BFCFBB';
              newButton.style.transform = 'scale(1.05)';
            });
            
            newButton.addEventListener('mouseleave', () => {
              newButton.style.background = 'white';
              newButton.style.color = '#BFCFBB';
              newButton.style.borderColor = '#BFCFBB';
              newButton.style.transform = 'scale(1)';
            });
            
            // Ensure click events work
            newButton.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              // Leaflet will handle the actual zoom
            });
          });
        }
      }, 200);
      
      // Create marker cluster group with custom styling
      const markerCluster = L.markerClusterGroup({
        iconCreateFunction: function(cluster) {
          const count = cluster.getChildCount();
          let size = 'small';
          let className = 'marker-cluster-small';
          
          if (count >= 10) {
            size = 'large';
            className = 'marker-cluster-large';
          } else if (count >= 5) {
            size = 'medium';
            className = 'marker-cluster-medium';
          }
          
          return new L.DivIcon({
            html: `<div class="cluster-inner">${count}</div>`,
            className: `marker-cluster ${className}`,
            iconSize: new L.Point(40, 40)
          }) as L.DivIcon;
        },
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 50,
        disableClusteringAtZoom: 15, // Don't cluster when zoomed in close
        animate: true,
        animateAddingMarkers: true
      });
      
      markerClusterRef.current = markerCluster;
      map.addLayer(markerCluster);

      // Save map reference
      mapRef.current = map;
      
      // Force a map redraw immediately using requestAnimationFrame
      requestAnimationFrame(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
          
          // If user location is already available, add marker immediately
          if (userLocation && !userLocationMarker) {
            const userIcon = L.divIcon({
              html: `
                <div class="user-location-pin">
                  <div class="pulse-ring"></div>
                  <div class="pin-dot"></div>
                </div>
              `,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
              className: 'user-location-marker',
              popupAnchor: [0, -20]
            });
            
            userLocationMarker = L.marker([userLocation.lat, userLocation.lng], {
              icon: userIcon,
              zIndexOffset: 10000,
              interactive: true
            });
            
            userLocationMarker.bindPopup('<strong>📍 Your Location</strong>').addTo(mapRef.current);
            userLocationMarker.setZIndexOffset(10000);

          }
        }
      });
      
    } catch (error) {
      console.error('Error initializing map:', error);
    }
    
    return () => {
      // Clean up on unmount
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Initialize once, don't depend on userLocation

  // Update map center and zoom when userLocation becomes available (after IP geolocation)
  useEffect(() => {
    if (mapRef.current && userLocation) {

      mapRef.current.setView([userLocation.lat, userLocation.lng], IP_LOCATION_ZOOM, {
        animate: true,
        duration: 0.5
      });
      
      // Add user location marker if not already added
      if (!userLocationMarker) {
        const userIcon = L.divIcon({
          html: `
            <div class="user-location-pin">
              <div class="pulse-ring"></div>
              <div class="pin-dot"></div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          className: 'user-location-marker',
          popupAnchor: [0, -20]
        });
        
        userLocationMarker = L.marker([userLocation.lat, userLocation.lng], {
          icon: userIcon,
          zIndexOffset: 10000,
          interactive: true
        });
        
        userLocationMarker.bindPopup('<strong>📍 Your Location</strong>').addTo(mapRef.current);
        userLocationMarker.setZIndexOffset(10000);

      } else {
        // Update existing marker position
        userLocationMarker.setLatLng([userLocation.lat, userLocation.lng]);
      }
    }
  }, [userLocation]); // Update when userLocation changes

  // Geocoding function using OpenStreetMap Nominatim API (works globally)
  // Also handles eircode geocoding for Irish addresses
  const geocodeAddress = async (address: string, county: string): Promise<{ lat: number, lng: number } | null> => {
    // Check if address is an eircode
    const { isValidEircode, geocodeEircode } = await import('@/lib/utils/eircode-geocoding');
    
    if (isValidEircode(address)) {
      const eircodeCoords = await geocodeEircode(address);
      if (eircodeCoords) {
        // Cache the result
        geocodeCache[address] = eircodeCoords;
        return eircodeCoords;
      }
      // If eircode geocoding fails, fall through to regular address geocoding
    }
    // Try with county/region first, then without if it fails
    const addressesToTry = [
      `${address}, ${county}`,
      `${address}, ${county}, Ireland`, // Fallback for Irish addresses
      address
    ];
    
    for (const fullAddress of addressesToTry) {
    // Check cache first
    if (geocodeCache[fullAddress] !== undefined) {
      return geocodeCache[fullAddress];
    }
    
    try {
      const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`,
          {
            headers: {
              'User-Agent': 'DogQuest/1.0' // Required by Nominatim
            }
          }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const coords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
        geocodeCache[fullAddress] = coords;
          // Cache all variations
          addressesToTry.forEach(addr => {
            if (!geocodeCache[addr]) {
              geocodeCache[addr] = coords;
            }
          });
        return coords;
      }
    } catch (error) {
        console.error('Geocoding failed for:', fullAddress, error);
        continue; // Try next address variation
      }
    }
    
    // Fallback to county center if geocoding fails (for Irish counties)
      const countyCoords = COUNTY_CENTERS[county];
      if (countyCoords) {
      geocodeCache[addressesToTry[0]] = countyCoords;
        return countyCoords;
      }
    
    // Final fallback - return null
    geocodeCache[addressesToTry[0]] = null;
      return null;
  };

  // Geocode businesses when they change - Parallel processing with batching
  useEffect(() => {
    const geocodeBusinesses = async () => {
      const businessesWithCoords: Business[] = [];
      
      // Helper function to process a single business
      const processBusiness = async (business: Business): Promise<Business> => {
        let coordinates = business.coordinates;
        
        // Use existing coordinates if valid (not default Dublin coordinates)
        const isDefaultCoords = coordinates && 
          coordinates.lat === 53.3498 && 
          coordinates.lng === -6.2603;
        
        if (!coordinates || isDefaultCoords) {
          // Try county center first (fast, no API call)
          const countyCoords = COUNTY_CENTERS[business.county];
          if (countyCoords) {
            coordinates = countyCoords;
          } else {
            // Try geocoding the address
          const geocoded = await geocodeAddress(business.address, business.county);
          if (geocoded) {
            coordinates = geocoded;
          } else {
              // Final fallback to default center
            coordinates = DEFAULT_CENTER;
            }
          }
        }
        
        return {
          ...business,
          coordinates
        };
      };
      
      // Process businesses in parallel batches to respect rate limits
      const BATCH_SIZE = 5; // Process 5 at a time to avoid rate limiting
      const batches: Business[][] = [];
      
      for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
        batches.push(businesses.slice(i, i + BATCH_SIZE));
      }
      
      // Process batches sequentially, but businesses within batch in parallel
      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(business => processBusiness(business))
        );
        businessesWithCoords.push(...batchResults);
        
        // Update state progressively so markers appear as geocoding completes
        setGeocodedBusinesses([...businessesWithCoords]);
        
        // Small delay between batches to respect rate limits (1 request/second)
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };
    
    if (businesses.length > 0) {
      geocodeBusinesses();
    } else {
      setGeocodedBusinesses([]);
    }
  }, [businesses]);

  // Force map to redraw when it becomes visible (especially important for mobile)
  useEffect(() => {
    // A short timeout allows the display change to complete
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
        // Force a resize event to ensure proper rendering
        window.dispatchEvent(new Event('resize'));
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // Additional effect to handle map visibility changes (for mobile collapsible)
  useEffect(() => {
    if (!isVisible) return; // Don't process if map is not visible
    
    const checkVisibility = () => {
      if (mapRef.current && mapContainerRef.current) {
        const rect = mapContainerRef.current.getBoundingClientRect();
        const containerVisible = rect.width > 0 && rect.height > 0;
        
        if (containerVisible) {
          // Map is visible, invalidate size after a short delay
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.invalidateSize();
              // Ensure markers are visible
              if (markerClusterRef.current && geocodedBusinesses.length > 0) {
                markerClusterRef.current.refreshClusters();
              }
            }
          }, 100);
        }
      }
    };

    // Check immediately
    checkVisibility();

    // Set up intersection observer to detect when map becomes visible
    if (mapContainerRef.current && typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && mapRef.current) {
              setTimeout(() => {
                if (mapRef.current) {
                  mapRef.current.invalidateSize();
                  // Refresh clusters when map becomes visible
                  if (markerClusterRef.current && geocodedBusinesses.length > 0) {
                    markerClusterRef.current.refreshClusters();
                  }
                }
              }, 100);
            }
          });
        },
        { threshold: 0.1 }
      );

      observer.observe(mapContainerRef.current);

      return () => {
        observer.disconnect();
      };
    }
  }, [geocodedBusinesses, isVisible]);
  
  // Effect to handle user location (geolocation) - Always show marker immediately
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    // Add or update user location marker - Always ensure it's visible
      if (userLocationMarker) {
        userLocationMarker.setLatLng([userLocation.lat, userLocation.lng]);

      } else {
      // Create a prominent custom icon for user location
        const userIcon = L.divIcon({
          html: `
          <div class="user-location-pin">
            <div class="pulse-ring"></div>
            <div class="pin-dot"></div>
          </div>
          `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        className: 'user-location-marker',
        popupAnchor: [0, -20]
        });
        
        userLocationMarker = L.marker([userLocation.lat, userLocation.lng], {
          icon: userIcon,
        zIndexOffset: 10000, // Very high z-index to ensure it's on top
        interactive: true
        });
        
      userLocationMarker.bindPopup('<strong>📍 Your Location</strong>').addTo(mapRef.current);

    }
    
    // Ensure marker is always visible
    if (userLocationMarker && mapRef.current) {
      // Force map to show the marker and ensure it's on top
      userLocationMarker.setZIndexOffset(10000);
      mapRef.current.invalidateSize();
    }
    
    // Update polylines when user location changes
    if (mapRef.current && Object.keys(markersRef).length > 0) {
      Object.keys(markersRef).forEach((key) => {
        const businessId = parseInt(key);
        const marker = markersRef[businessId];
        if (marker) {
          const markerLatLng = marker.getLatLng();
          
          // Remove existing polyline
          if (polylinesRef[businessId] && mapRef.current) {
            try {
              if (mapRef.current.hasLayer(polylinesRef[businessId])) {
                mapRef.current.removeLayer(polylinesRef[businessId]);
              }
            } catch (error) {
            }
          }
          
          // Create new polyline
          const polyline = L.polyline(
            [
              [userLocation.lat, userLocation.lng],
              [markerLatLng.lat, markerLatLng.lng]
            ],
            {
              color: '#3B82F6',
              weight: 2,
              opacity: 0.6,
              dashArray: '5, 5',
              smoothFactor: 1
            }
          );
          
          polylinesRef[businessId] = polyline;
          if (mapRef.current) {
            polyline.addTo(mapRef.current);
          }
        }
      });
    }
    
    // Center map on user location immediately
    // Use requestAnimationFrame for immediate execution on next frame
    requestAnimationFrame(() => {
      if (!mapRef.current || !userLocation) return;
      
      const nearbyBusinesses = geocodedBusinesses.filter(business => {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          business.coordinates.lat,
          business.coordinates.lng
        );
        return distance <= 50;
      });
      
      if (nearbyBusinesses.length > 0) {

        const boundsPoints = [
          [userLocation.lat, userLocation.lng] as [number, number],
          ...nearbyBusinesses.map(b => [b.coordinates.lat, b.coordinates.lng] as [number, number])
        ];

        const bounds = L.latLngBounds(boundsPoints);

        mapRef.current.fitBounds(bounds, { 
          padding: [100, 100], 
          maxZoom: 13,
          duration: 0.3
        });
      } else {

        mapRef.current.setView([userLocation.lat, userLocation.lng], IP_LOCATION_ZOOM, {
          animate: true,
          duration: 0.3
        });
      }
    });
  }, [userLocation, geocodedBusinesses]);

  // Custom icon function with orange pins and no border
  const createIcon = (type: string, isPartner: boolean) => {
    // Create custom SVG icons with orange color
    const createSVGIcon = () => {
      return `
        <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.2)"/>
            </filter>
          </defs>
          <path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 20 12 20s12-12.8 12-20C24 5.4 18.6 0 12 0z" 
                fill="#f97316" 
                filter="url(#shadow)"/>
          <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
          <circle cx="12" cy="12" r="3" fill="#ea580c"/>
        </svg>
      `;
    };
    
    // Add golden ring for partners
    if (isPartner) {
      const partnerSVG = `
        <svg width="24" height="32" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.2)"/>
            </filter>
          </defs>
          <path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 20 12 20s12-12.8 12-20C24 5.4 18.6 0 12 0z" 
                fill="#f97316" 
                filter="url(#shadow)"/>
          <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
          <circle cx="12" cy="12" r="3" fill="#ea580c"/>
          <circle cx="12" cy="12" r="6" fill="none" stroke="#f59e0b" stroke-width="1" opacity="0.7"/>
        </svg>
      `;
      
      return new L.DivIcon({
        html: partnerSVG,
        iconSize: [24, 32],
        iconAnchor: [12, 32],
        popupAnchor: [0, -32],
        className: 'custom-marker-icon partner-marker'
      });
    }
    
    return new L.DivIcon({
      html: createSVGIcon(),
      iconSize: [24, 32],
      iconAnchor: [12, 32],
      popupAnchor: [0, -32],
      className: 'custom-marker-icon'
    });
  };
  
  // Update markers when geocoded businesses change
  useEffect(() => {
    if (!mapRef.current || !markerClusterRef.current) return;
    
    // Clear existing markers and polylines
    markerClusterRef.current.clearLayers();
    Object.keys(markersRef).forEach((key) => {
      delete markersRef[parseInt(key)];
    });
    
    // Remove all existing polylines
    if (mapRef.current) {
      Object.keys(polylinesRef).forEach((key) => {
        const businessId = parseInt(key);
        if (polylinesRef[businessId]) {
          try {
            if (mapRef.current?.hasLayer(polylinesRef[businessId])) {
              mapRef.current.removeLayer(polylinesRef[businessId]);
            }
          } catch (error) {
          }
          delete polylinesRef[businessId];
        }
      });
    }
    
    // If no businesses, don't add markers but keep map functional
    if (geocodedBusinesses.length === 0) return;
    
    // Filter businesses based on user location
    // If user location is available, only show nearby businesses (within 50km)
    // If no user location, show all businesses
    const businessesToShow = userLocation 
      ? geocodedBusinesses.filter(business => {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            business.coordinates.lat,
            business.coordinates.lng
          );
          const isNearby = distance <= 50; // Only show businesses within 50km
          return isNearby;
        })
      : geocodedBusinesses; // Show all if no user location
    
    // Add new markers only for nearby businesses
    businessesToShow.forEach((business, index) => {
      
      // Validate coordinates
      if (!business.coordinates || typeof business.coordinates.lat !== 'number' || typeof business.coordinates.lng !== 'number') {
        console.error(`Invalid coordinates for ${business.name}:`, business.coordinates);
        return;
      }
      
      const marker = L.marker(
        [business.coordinates.lat, business.coordinates.lng],
        { 
          icon: createIcon(business.type, business.partner),
          interactive: true
        }
      );
      
      // Calculate distance if user location is available
      let distanceText = '';
      if (userLocation) {
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          business.coordinates.lat,
          business.coordinates.lng
        );
        distanceText = `<div class="popup-distance">📍 ${formatDistance(distance)} away</div>`;
      }
      
      // Create a comprehensive popup with business details and improved styling
      const popupContent = `
        <div class="popup-content">
          <div class="popup-header">
            <h3 class="popup-title">${business.name}</h3>
            <span class="popup-type">${getBusinessServiceTypeLabel(business.type)}</span>
            ${business.partner ? '<span class="popup-partner">✓ Dog Quest Partner</span>' : ''}
          </div>
          ${distanceText}
          <div class="popup-address">
            <div class="popup-address-line">${business.address}</div>
            <div class="popup-county">${business.county}</div>
            ${business.eircode && String(business.eircode).trim() ? `<div class="popup-eircode" style="margin-top:6px;font-family:ui-monospace,monospace;font-size:12px;">Eircode: ${String(business.eircode).trim().replace(/</g, '&lt;')}</div>` : ''}
          </div>
          <div class="popup-actions">
            <span class="popup-link" data-business-slug="${business.slug}">View Details</span>
            <a class="popup-directions" href="https://www.google.com/maps/dir/?api=1&destination=${business.coordinates.lat},${business.coordinates.lng}" target="_blank" rel="noopener noreferrer">Get Directions</a>
          </div>
        </div>
      `;
      
      // Configure the popup with options for better visibility
      const popupOptions: L.PopupOptions = { 
        autoPan: true,
        keepInView: true,
        closeButton: true,
        autoClose: false,
        closeOnClick: false,
        className: 'custom-leaflet-popup',
        maxWidth: 250,
        minWidth: 200
      };
      
      marker.bindPopup(popupContent, popupOptions);
      
      // Add event listeners for better interaction
      marker.on('mouseover', () => {
        setHoveredBusiness(business.id.toString());
      });
      
      marker.on('mouseout', () => {
        setHoveredBusiness(null);
      });

      marker.on('click', () => {
        // Open popup and navigate to business page
        marker.openPopup();
      });
      
      // Store marker reference
      markersRef[business.id] = marker;
      
      // Add marker to cluster
      if (markerClusterRef.current) {
        markerClusterRef.current.addLayer(marker);
      } else {
        console.error('Marker cluster ref is null!');
      }
      
      // Add blue line from user location to business marker if user location is available
      if (userLocation && mapRef.current) {
        // Remove existing polyline for this business if it exists
        if (polylinesRef[business.id] && mapRef.current) {
          try {
            if (mapRef.current.hasLayer(polylinesRef[business.id])) {
              mapRef.current.removeLayer(polylinesRef[business.id]);
            }
          } catch (error) {
          }
        }
        
        // Create a blue polyline connecting user location to business
        const polyline = L.polyline(
          [
            [userLocation.lat, userLocation.lng],
            [business.coordinates.lat, business.coordinates.lng]
          ],
          {
            color: '#3B82F6',
            weight: 2,
            opacity: 0.6,
            dashArray: '5, 5',
            smoothFactor: 1
          }
        );
        
        polylinesRef[business.id] = polyline;
        if (mapRef.current) {
          polyline.addTo(mapRef.current);
        }
      }
    });
    
    // Clean up polylines for businesses that are no longer shown
    Object.keys(polylinesRef).forEach(key => {
      const businessId = parseInt(key);
      if (!businessesToShow.find(b => b.id === businessId) && mapRef.current && polylinesRef[businessId]) {
        try {
          if (mapRef.current.hasLayer(polylinesRef[businessId])) {
            mapRef.current.removeLayer(polylinesRef[businessId]);
          }
        } catch (error) {
        }
        delete polylinesRef[businessId];
      }
    });
    
    // Add click handler for popup links
    const handlePopupClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && target.classList.contains('popup-link')) {
        const slug = target.getAttribute('data-business-slug');
        if (slug) {
          router.push(`/services/${slug}`);
        }
      }
    };

    // Add event listener to the map container for popup clicks
    if (mapContainerRef.current) {
      mapContainerRef.current.addEventListener('click', handlePopupClick);
    }
    
    // Fit bounds to show businesses - prioritize user location if available
    // Use requestAnimationFrame to ensure DOM is ready, but execute immediately
    if (mapRef.current) {
      // Use requestAnimationFrame for immediate execution on next frame
      requestAnimationFrame(() => {
        if (!mapRef.current) return;
        
        if (userLocation) {
          // When user location is available, ALWAYS center on user location
          // Check if we have nearby businesses
          if (businessesToShow.length > 0) {
            // We have nearby businesses - show them with user location
            const boundsPoints = [
              [userLocation.lat, userLocation.lng] as [number, number],
              ...businessesToShow.map(b => [b.coordinates.lat, b.coordinates.lng] as [number, number])
            ];
            
            const bounds = L.latLngBounds(boundsPoints);
            
            // Fit bounds with padding, ensuring all markers are visible
            // Use larger padding on smaller screens, smaller padding on larger screens
            const padding: [number, number] = isMobile ? [80, 80] : [120, 120];
            mapRef.current.fitBounds(bounds, { 
              padding: padding, 
              maxZoom: 14,
              duration: 0.3
            });
            
            // Force map to invalidate size immediately
            mapRef.current.invalidateSize();
          } else {
            // No nearby businesses - just center on user location
            mapRef.current.setView([userLocation.lat, userLocation.lng], IP_LOCATION_ZOOM, {
              animate: true,
              duration: 0.3
            });
            
            // Force map to invalidate size immediately
            mapRef.current.invalidateSize();
          }
        } else if (geocodedBusinesses.length > 0) {
          // No user location - show all businesses, fit bounds to Ireland
          const boundsPoints = geocodedBusinesses.map(b => [b.coordinates.lat, b.coordinates.lng] as [number, number]);
          
          // Ensure we have valid bounds
          if (boundsPoints.length > 0) {
          const bounds = L.latLngBounds(boundsPoints);
          const padding: [number, number] = isMobile ? [60, 60] : [80, 80];
            
            // Fit bounds with appropriate zoom level for Ireland
            mapRef.current.fitBounds(bounds, { 
              padding: padding, 
              maxZoom: 12, // Don't zoom in too much if businesses are spread across Ireland
              duration: 0.3 
            });
          
          // Force map to invalidate size immediately
          mapRef.current.invalidateSize();
          } else {
            // Fallback: center on Ireland if no valid coordinates
            mapRef.current.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], DEFAULT_ZOOM);
            mapRef.current.invalidateSize();
          }
        }
        
        // Mark as initialized after first fit
        if (!alreadyInitialized.current) {
      alreadyInitialized.current = true;
        }
      });
    }

    // Cleanup function
    return () => {
      if (mapContainerRef.current) {
        mapContainerRef.current.removeEventListener('click', handlePopupClick);
      }
    };
  }, [geocodedBusinesses, setHoveredBusiness, router, userLocation]);
  
  // Handle hover effect on map when hovering over business card
  useEffect(() => {
    if (hoveredBusinessId) {
      const marker = markersRef[parseInt(hoveredBusinessId)];
      if (!marker) return;
      
      // Open popup temporarily on hover
      if (marker?.getPopup()) {
        marker.openPopup();
        // Auto-close popup after 3 seconds if it's just a hover
        setTimeout(() => {
          const popup = marker?.getPopup();
          if (popup && popup.isOpen()) {
            marker.closePopup();
          }
        }, 3000);
      }
      
      // Add bounce animation class
      const icon = marker.getElement();
      if (icon) {
        icon.classList.add('marker-bounce');
        setTimeout(() => {
          icon.classList.remove('marker-bounce');
        }, 800);
      }
    }
  }, [hoveredBusinessId]);
  
  return (
    <div className="relative w-full h-full">
      <div 
        ref={mapContainerRef} 
        className="w-full h-full min-h-[500px] rounded-lg shadow-md z-0 artistic-map"
        style={{ 
          minHeight: '500px',
          height: '100%',
          width: '100%'
        }}
      />
      <style>{`
        /* Clean artistic map styling with subtle base map */
        .artistic-map {
          background: #f8f9fa !important;
        }
        
        /* Leaflet container styling */
        .leaflet-container {
          background: #f8f9fa !important;
        }
        
        /* Subtle tile layer styling */
        .leaflet-tile-pane {
  opacity: 1 !important;
  filter: sepia(30%) saturate(60%) hue-rotate(70deg) brightness(100%);
}
        
        /* User Location Marker Styles */
        .user-location-marker {
          background: transparent !important;
          border: none !important;
          z-index: 10000 !important;
        }
        
        .user-location-pin {
          position: relative;
          width: 40px;
          height: 40px;
        }
        
        .pulse-ring {
          position: absolute;
          top: 10px;
          left: 10px;
          width: 20px;
          height: 20px;
          background: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          animation: pulse-ring 2s ease-out infinite;
        }
        
        .pin-dot {
          position: absolute;
          top: 10px;
          left: 10px;
          width: 20px;
          height: 20px;
          background: #3B82F6;
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          z-index: 1;
        }
        
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(3);
            opacity: 0;
          }
}
        
        /* Custom Marker Icons */
        .custom-marker-icon {
          background: transparent !important;
          border: none !important;
          z-index: 1000 !important;
        }
        
        .custom-marker-icon svg {
          display: block;
        }
        
        .partner-marker {
          z-index: 1001 !important;
        }
        
        /* Marker Animations */
        .marker-bounce {
          animation: bounce 0.8s ease infinite;
        }
        
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        /* Partner Marker Glow */
        .partner-marker {
          filter: drop-shadow(0 0 8px rgba(245, 158, 11, 0.4));
        }
        
        /* Custom Popup Styling - Attractive Design */
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          background: white;
          border-radius: 16px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          border: 2px solid #BFCFBB;
          padding: 0;
          overflow: hidden;
          min-width: 280px;
          max-width: 320px;
        }
        
        .custom-leaflet-popup .leaflet-popup-content {
          margin: 0;
          padding: 0;
          min-width: 280px;
        }
        
        .custom-leaflet-popup .leaflet-popup-tip {
          background: white;
          border: 2px solid #BFCFBB;
          border-top: none;
          border-right: none;
          width: 20px;
          height: 20px;
        }
        
        .custom-leaflet-popup .leaflet-popup-close-button {
          color: #344C3D !important;
          font-size: 20px !important;
          font-weight: bold !important;
          padding: 8px !important;
          width: 28px !important;
          height: 28px !important;
          line-height: 1 !important;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        
        .custom-leaflet-popup .leaflet-popup-close-button:hover {
          opacity: 1;
          color: #BFCFBB !important;
        }
        
        .popup-content {
          padding: 20px;
          background: linear-gradient(to bottom, #ffffff, #f9fafb);
        }
        
        .popup-header {
          text-align: center;
          margin-bottom: 14px;
          padding-bottom: 12px;
          border-bottom: 2px solid #E1E8E0;
        }
        
        .popup-title {
          font-size: 18px;
          font-weight: 700;
          color: #344C3D;
          margin: 0 0 6px 0;
          line-height: 1.3;
        }
        
        .popup-type {
          font-size: 13px;
          color: #BFCFBB;
          display: block;
          font-weight: 500;
          margin-top: 4px;
        }
        
        .popup-partner {
          font-size: 12px;
          color: #059669;
          display: inline-block;
          margin-top: 6px;
          padding: 4px 8px;
          background: #d1fae5;
          border-radius: 4px;
          font-weight: 600;
        }
         
        .popup-address {
          font-size: 13px;
          color: #4b5563;
          text-align: center;
          margin-bottom: 14px;
          line-height: 1.5;
          padding: 10px;
          background: #f3f4f6;
          border-radius: 6px;
        }
        
        .popup-address-line {
          margin-bottom: 4px;
          font-weight: 500;
        }
        
        .popup-county {
          font-weight: 600;
          color: #344C3D;
          font-size: 12px;
        }
        
        .popup-distance {
          text-align: center;
          margin: 10px 0;
          padding: 8px 12px;
          background: linear-gradient(135deg, #E1E8E0 0%, #BFCFBB 100%);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #344C3D;
          border: 1px solid #BFCFBB;
        }
        
        .popup-actions {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 2px solid #e5e7eb;
        }
        
        .popup-link, .popup-directions {
          background: #1D4ED8;
          color: white !important;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s ease;
          display: inline-block;
          text-decoration: none !important;
          flex: 1;
          text-align: center;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          white-space: nowrap;
          min-width: 100px;
        }
        
        .popup-link {
          background: #344C3D;
        }
        
        .popup-directions {
          background: #BFCFBB;
          color: #344C3D !important;
        }
        
        .popup-link:hover {
          background: #2a3d2f;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .popup-directions:hover {
          background: #a8b8a4;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }
        
        .popup-link:active, .popup-directions:active {
          transform: translateY(0);
        }
        
        /* Custom Cluster Styling */
        .marker-cluster {
          background: rgba(249, 115, 22, 0.9);
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .marker-cluster-small {
          width: 30px;
          height: 30px;
        }
        
        .marker-cluster-medium {
          width: 35px;
          height: 35px;
        }
        
        .marker-cluster-large {
          width: 40px;
          height: 40px;
        }
        
        .cluster-inner {
          color: white;
          font-weight: 600;
          font-size: 12px;
          text-align: center;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        
        /* Force zoom control visibility with higher specificity and #BFCFBB colors */
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15) !important;
          margin: 12px !important;
          z-index: 10000 !important;
          pointer-events: auto !important;
          display: block !important;
          opacity: 1 !important;
          visibility: visible !important;
          position: relative !important;
        }
        
        .leaflet-control-zoom a {
          background: white !important;
          border: 2px solid #BFCFBB !important;
          color: #BFCFBB !important;
          font-weight: 700 !important;
          font-size: 18px !important;
          width: 40px !important;
          height: 40px !important;
          line-height: 36px !important;
          text-align: center !important;
          transition: all 0.2s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
          cursor: pointer !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          text-decoration: none !important;
          position: relative !important;
          z-index: 10001 !important;
        }
        
        .leaflet-control-zoom a:hover {
          background: #BFCFBB !important;
          color: white !important;
          border-color: #BFCFBB !important;
          transform: scale(1.05) !important;
        }
        
        .leaflet-control-zoom a:active {
          transform: scale(0.95) !important;
        }
        
        .leaflet-control-zoom-in {
          border-radius: 8px 8px 0 0 !important;
          margin-bottom: 0 !important;
        }
        
        .leaflet-control-zoom-out {
          border-radius: 0 0 8px 8px !important;
          border-top: none !important;
          margin-top: 0 !important;
        }
        
        /* Highlight Pulse Animation with blue colors */
        .highlight-pulse {
          animation: pulse 2s ease-in-out;
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        
        /* Ensure symbols are visible */
        .leaflet-control-zoom-in:before {
          content: '+' !important;
        }
        
        .leaflet-control-zoom-out:before {
          content: '−' !important;
        }
      `}</style>
    </div>
  );
};

export default ServicesMap;
