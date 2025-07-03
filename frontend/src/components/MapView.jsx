import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";

const MAPBOX_TOKEN = import.meta.env.VITE_REACT_APP_MAPBOX_API_KEY;
mapboxgl.accessToken = MAPBOX_TOKEN;

const NEW_DELHI = [77.209, 28.6139];

const MapView = ({ source, destination, route, routes = [], onSourceChange, onDestinationChange, memberMarkers = [], liveLocation }) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const sourceMarker = useRef(null);
  const destMarker = useRef(null);
  const memberMarkerRefs = useRef([]);
  const liveLocationMarker = useRef(null);
  const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/streets-v11");

  const reverseGeocode = async (lng, lat, cb) => {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`
    );
    const data = await res.json();
    if (data.features && data.features[0]) {
      cb({
        place_name: data.features[0].place_name,
        coordinates: [lng, lat],
      });
    }
  };

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: NEW_DELHI,
        zoom: 11,
      });
    } else {
      // If style changes, update the map style
      if (mapRef.current.getStyle().sprite && mapRef.current.getStyle().sprite.indexOf(mapStyle) === -1) {
        mapRef.current.setStyle(mapStyle);
      }
    }
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
      if (source && source.coordinates) {
        if (!sourceMarker.current) {
          sourceMarker.current = new mapboxgl.Marker({ draggable: true, color: "#2563eb" })
            .setLngLat(source.coordinates)
            .addTo(map);
          sourceMarker.current.on("dragend", () => {
            const lngLat = sourceMarker.current.getLngLat();
            reverseGeocode(lngLat.lng, lngLat.lat, onSourceChange);
          });
        } else {
          sourceMarker.current.setLngLat(source.coordinates);
        }
      } else if (sourceMarker.current) {
        sourceMarker.current.remove();
        sourceMarker.current = null;
      }

      if (destination && destination.coordinates) {
        if (!destMarker.current) {
          destMarker.current = new mapboxgl.Marker({ draggable: true, color: "#f59e42" })
            .setLngLat(destination.coordinates)
            .addTo(map);
          destMarker.current.on("dragend", () => {
            const lngLat = destMarker.current.getLngLat();
            reverseGeocode(lngLat.lng, lngLat.lat, onDestinationChange);
          });
        } else {
          destMarker.current.setLngLat(destination.coordinates);
        }
      } else if (destMarker.current) {
        destMarker.current.remove();
        destMarker.current = null;
      }

      if (source && destination && source.coordinates && destination.coordinates) {
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(source.coordinates);
        bounds.extend(destination.coordinates);
        map.fitBounds(bounds, { padding: 80 });
      } else if (source && source.coordinates) {
        map.flyTo({ center: source.coordinates, zoom: 14 });
      } else if (destination && destination.coordinates) {
        map.flyTo({ center: destination.coordinates, zoom: 14 });
      }

      // Remove all previous route layers and sources
      const existingLayers = map.getStyle().layers || [];
      existingLayers.forEach((layer) => {
        if (layer.id.startsWith("route-")) {
          if (map.getLayer(layer.id)) map.removeLayer(layer.id);
        }
      });
      const existingSources = Object.keys(map.getStyle().sources || {});
      existingSources.forEach((sourceId) => {
        if (sourceId.startsWith("route-")) {
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
      });

      // Render multiple routes if provided
      if (routes && routes.length > 0) {
        routes.forEach((r, idx) => {
          const sourceId = `route-${idx}`;
          const layerId = `route-${idx}`;
          if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
              type: "geojson",
              data: r.geojson,
            });
          } else {
            map.getSource(sourceId).setData(r.geojson);
          }
          if (!map.getLayer(layerId)) {
            map.addLayer({
              id: layerId,
              type: "line",
              source: sourceId,
              layout: { "line-join": "round", "line-cap": "round" },
              paint: { "line-color": r.color || "#2563eb", "line-width": 5, "line-opacity": r.opacity || 1 },
            });
          }
        });
      } else if (route) {
        // Fallback: single route (legacy prop)
        if (map.getSource("route")) {
          map.getSource("route").setData(route);
        } else {
          map.addSource("route", {
            type: "geojson",
            data: route,
          });
          map.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#2563eb", "line-width": 5 },
          });
        }
      }

      // Remove previous member markers
      memberMarkerRefs.current.forEach(marker => marker.remove());
      memberMarkerRefs.current = [];
      // Add member markers
      if (memberMarkers && memberMarkers.length > 0) {
        memberMarkers.forEach((member, idx) => {
          if (member.coordinates) {
            // Create a custom marker with avatar if available
            const el = document.createElement('div');
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.alignItems = 'center';
            if (member.avatar) {
              const img = document.createElement('img');
              img.src = member.avatar;
              img.alt = member.fullName || 'Avatar';
              img.style.width = '32px';
              img.style.height = '32px';
              img.style.borderRadius = '50%';
              img.style.border = '2px solid #2563eb';
              img.style.background = '#fff';
              img.style.marginBottom = '-8px';
              el.appendChild(img);
            }
            // Marker dot
            const dot = document.createElement('div');
            dot.style.width = '16px';
            dot.style.height = '16px';
            dot.style.background = '#2563eb';
            dot.style.borderRadius = '50%';
            dot.style.border = '2px solid #fff';
            dot.style.boxShadow = '0 0 2px #0003';
            el.appendChild(dot);
            // Optionally, add name below
            // if (member.fullName) {
            //   const name = document.createElement('div');
            //   name.textContent = member.fullName;
            //   name.style.fontSize = '10px';
            //   name.style.marginTop = '2px';
            //   el.appendChild(name);
            // }
            const marker = new mapboxgl.Marker({ element: el })
              .setLngLat(member.coordinates)
              .addTo(map);
            memberMarkerRefs.current.push(marker);
          }
        });
      }
      // Live location marker
      if (liveLocation && liveLocation.coordinates) {
        if (!liveLocationMarker.current) {
          const el = document.createElement('div');
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.background = '#22c55e';
          el.style.borderRadius = '50%';
          el.style.border = '3px solid #fff';
          el.style.boxShadow = '0 0 8px #22c55e88';
          liveLocationMarker.current = new mapboxgl.Marker({ element: el })
            .setLngLat(liveLocation.coordinates)
            .addTo(map);
        } else {
          liveLocationMarker.current.setLngLat(liveLocation.coordinates);
        }
      } else if (liveLocationMarker.current) {
        liveLocationMarker.current.remove();
        liveLocationMarker.current = null;
      }
    });

    return () => {};
  }, [mapStyle]);

  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v11",
        center: NEW_DELHI,
        zoom: 11,
      });
    }
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
      if (source && source.coordinates) {
        if (!sourceMarker.current) {
          sourceMarker.current = new mapboxgl.Marker({ draggable: true, color: "#2563eb" })
            .setLngLat(source.coordinates)
            .addTo(map);
          sourceMarker.current.on("dragend", () => {
            const lngLat = sourceMarker.current.getLngLat();
            reverseGeocode(lngLat.lng, lngLat.lat, onSourceChange);
          });
        } else {
          sourceMarker.current.setLngLat(source.coordinates);
        }
      } else if (sourceMarker.current) {
        sourceMarker.current.remove();
        sourceMarker.current = null;
      }

      if (destination && destination.coordinates) {
        if (!destMarker.current) {
          destMarker.current = new mapboxgl.Marker({ draggable: true, color: "#f59e42" })
            .setLngLat(destination.coordinates)
            .addTo(map);
          destMarker.current.on("dragend", () => {
            const lngLat = destMarker.current.getLngLat();
            reverseGeocode(lngLat.lng, lngLat.lat, onDestinationChange);
          });
        } else {
          destMarker.current.setLngLat(destination.coordinates);
        }
      } else if (destMarker.current) {
        destMarker.current.remove();
        destMarker.current = null;
      }

      if (source && destination && source.coordinates && destination.coordinates) {
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend(source.coordinates);
        bounds.extend(destination.coordinates);
        map.fitBounds(bounds, { padding: 80 });
      } else if (source && source.coordinates) {
        map.flyTo({ center: source.coordinates, zoom: 14 });
      } else if (destination && destination.coordinates) {
        map.flyTo({ center: destination.coordinates, zoom: 14 });
      }

      // Remove all previous route layers and sources
      const existingLayers = map.getStyle().layers || [];
      existingLayers.forEach((layer) => {
        if (layer.id.startsWith("route-")) {
          if (map.getLayer(layer.id)) map.removeLayer(layer.id);
        }
      });
      const existingSources = Object.keys(map.getStyle().sources || {});
      existingSources.forEach((sourceId) => {
        if (sourceId.startsWith("route-")) {
          if (map.getSource(sourceId)) map.removeSource(sourceId);
        }
      });

      // Render multiple routes if provided
      if (routes && routes.length > 0) {
        routes.forEach((r, idx) => {
          const sourceId = `route-${idx}`;
          const layerId = `route-${idx}`;
          if (!map.getSource(sourceId)) {
            map.addSource(sourceId, {
              type: "geojson",
              data: r.geojson,
            });
          } else {
            map.getSource(sourceId).setData(r.geojson);
          }
          if (!map.getLayer(layerId)) {
            map.addLayer({
              id: layerId,
              type: "line",
              source: sourceId,
              layout: { "line-join": "round", "line-cap": "round" },
              paint: { "line-color": r.color || "#2563eb", "line-width": 5, "line-opacity": r.opacity || 1 },
            });
          }
        });
      } else if (route) {
        // Fallback: single route (legacy prop)
        if (map.getSource("route")) {
          map.getSource("route").setData(route);
        } else {
          map.addSource("route", {
            type: "geojson",
            data: route,
          });
          map.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#2563eb", "line-width": 5 },
          });
        }
      }

      // Remove previous member markers
      memberMarkerRefs.current.forEach(marker => marker.remove());
      memberMarkerRefs.current = [];
      // Add member markers
      if (memberMarkers && memberMarkers.length > 0) {
        memberMarkers.forEach((member, idx) => {
          if (member.coordinates) {
            // Create a custom marker with avatar if available
            const el = document.createElement('div');
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.alignItems = 'center';
            if (member.avatar) {
              const img = document.createElement('img');
              img.src = member.avatar;
              img.alt = member.fullName || 'Avatar';
              img.style.width = '32px';
              img.style.height = '32px';
              img.style.borderRadius = '50%';
              img.style.border = '2px solid #2563eb';
              img.style.background = '#fff';
              img.style.marginBottom = '-8px';
              el.appendChild(img);
            }
            // Marker dot
            const dot = document.createElement('div');
            dot.style.width = '16px';
            dot.style.height = '16px';
            dot.style.background = '#2563eb';
            dot.style.borderRadius = '50%';
            dot.style.border = '2px solid #fff';
            dot.style.boxShadow = '0 0 2px #0003';
            el.appendChild(dot);
            // Optionally, add name below
            // if (member.fullName) {
            //   const name = document.createElement('div');
            //   name.textContent = member.fullName;
            //   name.style.fontSize = '10px';
            //   name.style.marginTop = '2px';
            //   el.appendChild(name);
            // }
            const marker = new mapboxgl.Marker({ element: el })
              .setLngLat(member.coordinates)
              .addTo(map);
            memberMarkerRefs.current.push(marker);
          }
        });
      }
      // Live location marker
      if (liveLocation && liveLocation.coordinates) {
        if (!liveLocationMarker.current) {
          const el = document.createElement('div');
          el.style.width = '20px';
          el.style.height = '20px';
          el.style.background = '#22c55e';
          el.style.borderRadius = '50%';
          el.style.border = '3px solid #fff';
          el.style.boxShadow = '0 0 8px #22c55e88';
          liveLocationMarker.current = new mapboxgl.Marker({ element: el })
            .setLngLat(liveLocation.coordinates)
            .addTo(map);
        } else {
          liveLocationMarker.current.setLngLat(liveLocation.coordinates);
        }
      } else if (liveLocationMarker.current) {
        liveLocationMarker.current.remove();
        liveLocationMarker.current = null;
      }
    });

    return () => {};
  }, [source, destination, route, routes, memberMarkers, liveLocation]);

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
      <button
        onClick={handleToggleStyle}
        className="absolute top-4 right-4 z-20 bg-white bg-opacity-90 border border-gray-300 rounded px-3 py-1 shadow hover:bg-gray-100 text-sm font-medium"
        style={{ pointerEvents: 'auto' }}
      >
        {mapStyle.includes('satellite') ? 'Streets View' : 'Satellite View'}
      </button>
    </div>
  );
};

export default MapView; 