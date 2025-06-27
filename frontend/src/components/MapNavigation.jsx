import { useState } from "react";
import LocationInput from "./LocationInput";
import MapView from "./MapView";

const MAPBOX_TOKEN = import.meta.env.VITE_REACT_APP_MAPBOX_API_KEY;

const MapNavigation = () => {
  const [source, setSource] = useState(null); 
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleShowRoute = async () => {
    if (!source?.coordinates || !destination?.coordinates) return;
    setLoading(true);
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${source.coordinates[0]},${source.coordinates[1]};${destination.coordinates[0]},${destination.coordinates[1]}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        setRoute({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: data.routes[0].geometry,
              properties: {},
            },
          ],
        });
      } else {
        setRoute(null);
      }
    } catch (err) {
      setRoute(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full">
      {/* Left: Form */}
      <div className="w-full h-full max-w-md p-6 bg-white border-r border-gray-200">
        <h2 className="text-2xl font-bold mb-4 p-2">Map Navigation</h2>

        <LocationInput
          label="Source"
          value={source}
          onChange={setSource}
        />

        <LocationInput
          label="Destination"
          value={destination}
          onChange={setDestination}
        />

        <button
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          onClick={handleShowRoute}
          disabled={!source || !destination || loading}
        >
          {loading ? "Loading..." : "Show Route"}
        </button>
        
      </div>
      {/* Right: Map */}
      <div className="flex h-full w-full">
        <MapView
          source={source}
          destination={destination}
          route={route}
          onSourceChange={setSource}
          onDestinationChange={setDestination}
        />
      </div>
    </div>
  );
};

export default MapNavigation;
