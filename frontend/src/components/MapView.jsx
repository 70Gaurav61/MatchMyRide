import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";

const MAPBOX_TOKEN = import.meta.env.VITE_REACT_APP_MAPBOX_API_KEY;
mapboxgl.accessToken = MAPBOX_TOKEN;

const NEW_DELHI = [77.209, 28.6139];

const MapView = ({ source, destination, route, routes = [], onSourceChange, onDestinationChange }) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const sourceMarker = useRef(null);
  const destMarker = useRef(null);

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
    });

    return () => {};
  }, [source, destination, route, routes]);

  return (
    <div ref={mapContainer} className="w-full h-full rounded" />
  );
};

export default MapView; 