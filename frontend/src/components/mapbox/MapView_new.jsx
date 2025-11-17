import { useEffect, useRef, useState, useCallback } from "react";
import { getDistanceMeters, fetchRoute, reverseGeocode as fetchReverseGeocode } from "./mapUtils";
import mapboxgl from "mapbox-gl";

const MAPBOX_TOKEN = import.meta.env.VITE_REACT_APP_MAPBOX_API_KEY;
mapboxgl.accessToken = MAPBOX_TOKEN;

const NEW_DELHI = [77.209, 28.6139];

// Helper to create user marker element with profile photo
function createUserMarkerElement(user, isLive = false, isSelected = false) {
  const container = document.createElement('div');
  container.className = 'user-marker-container';
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: transform 0.2s;
  `;

  if (isSelected) {
    container.style.transform = 'scale(1.2)';
  }

  // Profile photo circle
  const photoContainer = document.createElement('div');
  photoContainer.style.cssText = `
    position: relative;
    width: ${isLive ? '48px' : '40px'};
    height: ${isLive ? '48px' : '40px'};
    border-radius: 50%;
    border: 3px solid ${isLive ? '#22c55e' : user.color || '#2563eb'};
    background: white;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ${isLive ? 'animation: pulse 2s infinite;' : ''}
  `;

  if (user.avatar) {
    const img = document.createElement('img');
    img.src = user.avatar;
    img.alt = user.name || 'User';
    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
    photoContainer.appendChild(img);
  } else {
    // Default avatar with initials
    const initials = document.createElement('div');
    initials.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    initials.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: ${isLive ? '20px' : '16px'};
      color: ${user.color || '#2563eb'};
      background: #e3f2fd;
    `;
    photoContainer.appendChild(initials);
  }

  container.appendChild(photoContainer);

  // Name label (optional)
  if (user.name && !isLive) {
    const nameLabel = document.createElement('div');
    nameLabel.textContent = user.name;
    nameLabel.style.cssText = `
      margin-top: 4px;
      padding: 2px 6px;
      background: white;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #333;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      white-space: nowrap;
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
    `;
    container.appendChild(nameLabel);
  }

  // Live indicator
  if (isLive) {
    const liveIndicator = document.createElement('div');
    liveIndicator.textContent = 'LIVE';
    liveIndicator.style.cssText = `
      margin-top: 4px;
      padding: 2px 8px;
      background: #22c55e;
      color: white;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    `;
    container.appendChild(liveIndicator);
  }

  // Add pulse animation style if live
  if (isLive) {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3); }
        50% { box-shadow: 0 2px 16px rgba(34, 197, 94, 0.8); }
      }
    `;
    container.appendChild(style);
  }

  return container;
}

/**
 * Highly Reusable MapView Component
 * 
 * Props:
 * - config: {
 *     mode?: 'view' | 'edit' | 'live' - Map interaction mode
 *     center?: [lng, lat] - Initial map center
 *     zoom?: number - Initial zoom level
 *     showControls?: boolean - Show map controls (zoom, etc)
 *     fitBounds?: boolean - Auto-fit to show all markers/routes
 *   }
 * 
 * - users: Array of user objects with locations/routes
 *   [{
 *     id: string,
 *     name: string,
 *     avatar?: string,
 *     sourceLocation?: { coordinates: [lng, lat], label?: string },
 *     destinationLocation?: { coordinates: [lng, lat], label?: string },
 *     liveLocation?: { coordinates: [lng, lat] },
 *     route?: GeoJSON or { geojson, color, opacity },
 *     color?: string - User's designated color
 *   }]
 * 
 * - routes: Array of route objects (static routes)
 *   [{
 *     id?: string,
 *     geojson: GeoJSON,
 *     color?: string,
 *     opacity?: number,
 *     width?: number,
 *   }]
 * 
 * - markers: Array of generic marker objects
 *   [{
 *     id?: string,
 *     coordinates: [lng, lat],
 *     label?: string,
 *     color?: string,
 *     draggable?: boolean,
 *     onDragEnd?: (coordinates) => void
 *   }]
 * 
 * - selectedUserId: Highlight specific user and show only their route
 * - showAllRoutes: Boolean to show all routes or filtered
 * - onMapClick: Callback for map clicks
 * - onUserMarkerClick: Callback when user marker is clicked
 * - liveLocation: Optional single live location to track (for current user)
 */
const MapView = ({ 
  config = {},
  users = [],
  routes = [],
  markers = [],
  selectedUserId = null,
  showAllRoutes = true,
  onMapClick,
  onUserMarkerClick,
  liveLocation // Optional: single live location to track
}) => {
  
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map()); // Store all markers by ID
  const routesRef = useRef(new Map()); // Store all route layers by ID
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/streets-v11");
  const [focusedUserId, setFocusedUserId] = useState(selectedUserId);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const lastCenteredLocation = useRef(null);
  
  // Parse config
  const {
    mode = 'view',
    center = NEW_DELHI,
    zoom = 11,
    showControls = true,
    fitBounds = true
  } = config;

  // Reverse geocode helper
  const reverseGeocode = useCallback(async (lng, lat) => {
    try {
      return await fetchReverseGeocode(lng, lat);
    } catch (err) {
      console.error("Reverse geocode error:", err);
    }
    return null;
  }, [fetchReverseGeocode]);

  // Main rendering effect - consolidate all map operations
  useEffect(() => {
    if (mapRef.current) return; // Already initialized
    
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: center,
      zoom: zoom,
    });

    mapRef.current = map;

    // Add navigation controls if enabled
    if (showControls) {
      map.addControl(new mapboxgl.NavigationControl(), 'top-left');
    }

    map.on('load', () => {
      setIsMapLoaded(true);
    });

    // Handle map clicks
    if (onMapClick) {
      map.on('click', (e) => {
        onMapClick({
          coordinates: [e.lngLat.lng, e.lngLat.lat],
          lngLat: e.lngLat
        });
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current.clear();
        routesRef.current.clear();
      }
    };
  }, []);

  // Update map style
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    // Check if style is loaded before accessing it
    if (map.isStyleLoaded()) {
      const currentStyleUrl = map.getStyle()?.sprite;
      if (currentStyleUrl && !currentStyleUrl.includes(mapStyle.split('/').pop())) {
        map.setStyle(mapStyle);
        map.once('style.load', () => {
          setIsMapLoaded(true);
        });
      }
    }
  }, [mapStyle]);

  // Main rendering effect - consolidate all map operations
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Helper to run map operations after style is loaded
    const runWhenStyleLoaded = (fn) => {
      if (map.isStyleLoaded()) {
        fn();
      } else {
        const onLoad = () => {
          fn();
          map.off('style.load', onLoad);
        };
        map.on('style.load', onLoad);
      }
    };

    runWhenStyleLoaded(() => {
      // Clear all existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current.clear();

      // Render all users on map
      users.forEach((user) => {
        const userId = user.id;
        const isSelected = focusedUserId === userId;
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const isCurrentUser = currentUser._id === userId;

        // Render source location marker
        if (user.sourceLocation?.coordinates) {
          const el = createUserMarkerElement(user, false, isSelected);
          el.onclick = () => {
            if (onUserMarkerClick) {
              onUserMarkerClick(user);
            }
            setFocusedUserId(prevId => prevId === userId ? null : userId);
          };

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat(user.sourceLocation.coordinates)
            .setPopup(
              new mapboxgl.Popup({ offset: 25 })
                .setHTML(`
                  <div style="padding: 8px;">
                    <strong>${user.name}</strong><br/>
                    ${user.sourceLocation.label || 'Source Location'}
                  </div>
                `)
            )
            .addTo(map);

          markersRef.current.set(`${userId}-source`, marker);
        }

        // Render destination location marker (if different from source)
        if (user.destinationLocation?.coordinates) {
          const destMarkerEl = document.createElement('div');
          destMarkerEl.style.cssText = `
            width: 24px;
            height: 24px;
            background: ${user.color || '#f59e42'};
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            cursor: pointer;
          `;

          const destMarker = new mapboxgl.Marker({ element: destMarkerEl })
            .setLngLat(user.destinationLocation.coordinates)
            .setPopup(
              new mapboxgl.Popup({ offset: 25 })
                .setHTML(`
                  <div style="padding: 8px;">
                    <strong>${user.name}</strong><br/>
                    ${user.destinationLocation.label || 'Destination'}
                  </div>
                `)
            )
            .addTo(map);

          markersRef.current.set(`${userId}-dest`, destMarker);
        }

        // Render live location marker (takes priority)
        if (user.liveLocation?.coordinates) {
          const liveEl = createUserMarkerElement(user, true, isSelected);
          liveEl.onclick = () => {
            if (onUserMarkerClick) {
              onUserMarkerClick(user);
            }
            setFocusedUserId(prevId => prevId === userId ? null : userId);
          };

          const liveMarker = new mapboxgl.Marker({ element: liveEl })
            .setLngLat(user.liveLocation.coordinates)
            .setPopup(
              new mapboxgl.Popup({ offset: 35 })
                .setHTML(`
                  <div style="padding: 8px;">
                    <strong>${user.name}</strong><br/>
                    <span style="color: #22c55e; font-weight: 600;">● LIVE LOCATION</span>
                  </div>
                `)
            )
            .addTo(map);

          markersRef.current.set(`${userId}-live`, liveMarker);

          // Auto-center on live location if it's the current user
          if (isCurrentUser && user.liveLocation.coordinates) {
            const shouldRecenter = getDistanceMeters(
              user.liveLocation.coordinates, 
              lastCenteredLocation.current
            ) > 20;
            if (shouldRecenter) {
              map.flyTo({ center: user.liveLocation.coordinates, zoom: 16, duration: 1000 });
              lastCenteredLocation.current = user.liveLocation.coordinates;
            }
          }
        }
      });

      // Render generic markers
      markers.forEach((markerData) => {

        
        if (!markerData || !markerData.coordinates) return;
        const markerId = markerData.id || `marker-${Math.random()}`;
        
        const marker = new mapboxgl.Marker({ 
          draggable: markerData.draggable || false,
          color: markerData.color || '#ff0000'
        })
          .setLngLat(markerData.coordinates);

        if (markerData.label) {
          marker.setPopup(
            new mapboxgl.Popup({ offset: 25 })
              .setHTML(`<div style="padding: 8px;">${markerData.label}</div>`)
          );
        }

        if (markerData.onDragEnd && markerData.draggable) {
          marker.on('dragend', async () => {
            const lngLat = marker.getLngLat();
            const geocoded = await reverseGeocode(lngLat.lng, lngLat.lat);
            markerData.onDragEnd(geocoded || { coordinates: [lngLat.lng, lngLat.lat] });
          });
        }
    
        marker.addTo(map);
        markersRef.current.set(markerId, marker);
      });

      // Clear all previous route layers
      routesRef.current.forEach((layerId) => {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
        if (map.getSource(layerId)) {
          map.removeSource(layerId);
        }
      });
      routesRef.current.clear();

      // Determine which routes to show
      let routesToRender = [...routes];

      if (focusedUserId && !showAllRoutes) {
        // Show only routes for the focused user
        const focusedUser = users.find(u => u.id === focusedUserId);
        if (focusedUser && focusedUser.route) {
          routesToRender = [{
            id: `user-route-${focusedUserId}`,
            geojson: focusedUser.route.geojson || focusedUser.route,
            color: focusedUser.color || '#2563eb',
            opacity: 1,
            width: 6
          }];
        }

        // Fetch route between current user and focused user
        const currentUser = users.find(u => {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          return u.id === user._id;
        });

        if (currentUser && focusedUser && 
            currentUser.sourceLocation?.coordinates && 
            focusedUser.sourceLocation?.coordinates) {
          fetchRoute(
            currentUser.sourceLocation.coordinates,
            focusedUser.sourceLocation.coordinates
          ).then(routeGeoJSON => {
            if (routeGeoJSON) {
              const sourceId = `focused-route`;
              const layerId = `focused-route`;
              
              if (!map.getSource(sourceId)) {
                map.addSource(sourceId, {
                  type: 'geojson',
                  data: routeGeoJSON
                });
                
                map.addLayer({
                  id: layerId,
                  type: 'line',
                  source: sourceId,
                  layout: { 'line-join': 'round', 'line-cap': 'round' },
                  paint: {
                    'line-color': '#10b981',
                    'line-width': 5,
                    'line-opacity': 0.8,
                    'line-dasharray': [2, 2]
                  }
                });
                
                routesRef.current.set(layerId, layerId);
              }
            }
          });
        }
      } else {
        // Show all user routes
        users.forEach(user => {
          if (user.route) {
            routesToRender.push({
              id: `user-route-${user.id}`,
              geojson: user.route.geojson || user.route,
              color: user.route.color || user.color || '#60a5fa',
              opacity: user.route.opacity || 0.6,
              width: user.route.width || 4
            });
          }
        });
      }

      // Render all routes
      routesToRender.forEach((routeData, idx) => {
        if (!routeData || !routeData.geojson) return;
        const sourceId = routeData.id || `route-${idx}`;
        const layerId = routeData.id || `route-${idx}`;

        if (!map.getSource(sourceId)) {
          map.addSource(sourceId, {
            type: 'geojson',
            data: routeData.geojson
          });
        }

        if (!map.getLayer(layerId)) {
          map.addLayer({
            id: layerId,
            type: 'line',
            source: sourceId,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-color': routeData.color || '#2563eb',
              'line-width': routeData.width || 5,
              'line-opacity': routeData.opacity || 1
            }
          });
          
          routesRef.current.set(layerId, layerId);
        }
      });

      // Auto-fit bounds to show all markers
      if (fitBounds) {
        const allCoordinates = [];

        // Collect all coordinates
        users.forEach(user => {
          if (user.sourceLocation?.coordinates) allCoordinates.push(user.sourceLocation.coordinates);
          if (user.destinationLocation?.coordinates) allCoordinates.push(user.destinationLocation.coordinates);
          if (user.liveLocation?.coordinates) allCoordinates.push(user.liveLocation.coordinates);
        });

        markers.forEach(marker => {
          if (marker && marker.coordinates) allCoordinates.push(marker.coordinates);
        });

        if (allCoordinates.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          allCoordinates.forEach(coord => bounds.extend(coord));
          
          // Only fit bounds if not tracking live location
          if (!liveLocation) {
            if (allCoordinates.length === 1) {
              // Single marker - center on it
              map.flyTo({ 
                center: allCoordinates[0], 
                zoom: 14,
                duration: 1000
              });
            } else if (allCoordinates.length > 1) {
              // Multiple markers - fit bounds
              map.fitBounds(bounds, { 
                padding: { top: 80, bottom: 80, left: 80, right: 80 },
                maxZoom: 15,
                duration: 1000
              });
            }
          }
        }
      }
    }); // Close runWhenStyleLoaded

  }, [users, markers, routes, focusedUserId, showAllRoutes, onUserMarkerClick, fitBounds, liveLocation, reverseGeocode]);

  // Sync selected user from props
  useEffect(() => {
    setFocusedUserId(selectedUserId);
  }, [selectedUserId]);

  // Style toggle button
  const handleToggleStyle = () => {
    setMapStyle((prev) =>
      prev === "mapbox://styles/mapbox/streets-v11"
        ? "mapbox://styles/mapbox/satellite-streets-v12"
        : "mapbox://styles/mapbox/streets-v11"
    );
  };

  return (
    <div className="w-full h-full rounded relative">
      <div ref={mapContainer} className="w-full h-full rounded" />
      
      {/* Map Style Toggle */}
      <button
        onClick={handleToggleStyle}
        className="absolute top-4 right-4 z-20 bg-white bg-opacity-90 border border-gray-300 rounded px-3 py-1 shadow hover:bg-gray-100 text-sm font-medium"
        style={{ pointerEvents: 'auto' }}
      >
        {mapStyle.includes('satellite') ? '🗺️ Streets' : '🛰️ Satellite'}
      </button>

      {/* Focused User Info */}
      {focusedUserId && (
        <div className="absolute top-4 left-4 z-20 bg-white bg-opacity-95 border border-gray-300 rounded-lg p-3 shadow-lg max-w-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {(() => {
                const user = users.find(u => u.id === focusedUserId);
                if (user?.avatar) {
                  return <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />;
                }
                return <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  {user?.name?.charAt(0) || 'U'}
                </div>;
              })()}
              <span className="font-semibold text-sm">
                {users.find(u => u.id === focusedUserId)?.name || 'User'}
              </span>
            </div>
            <button 
              onClick={() => setFocusedUserId(null)}
              className="text-gray-500 hover:text-gray-700 text-lg font-bold"
            >
              ×
            </button>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Click another user marker to compare routes
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
