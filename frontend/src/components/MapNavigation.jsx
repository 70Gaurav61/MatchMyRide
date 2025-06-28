import { useState, useEffect } from "react";
import LocationInput from "./LocationInput";
import MapView from "./MapView";
import axiosInstance from "../api/axiosInstance";
import { useNavigate } from "react-router-dom";

const MAPBOX_TOKEN = import.meta.env.VITE_REACT_APP_MAPBOX_API_KEY;

const MapNavigation = () => {
  const [source, setSource] = useState(null); 
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    source: '',
    destination: '',
    datetime: '',
    genderPreference: 'Any',
    sourceCoordinates: [0, 0],
    destinationCoordinates: [0, 0],
  });
  const [message, setMessage] = useState('')
  const [locating, setLocating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    const formatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setFormData((prev) => ({ ...prev, datetime: formatted }));
  }, []);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSourceChange = (val) => {
    setSource(val);
    setFormData((prev) => ({
      ...prev,
      source: val?.place_name || '',
      sourceCoordinates: val?.coordinates || [0, 0],
    }));
  };
  const handleDestinationChange = (val) => {
    setDestination(val);
    setFormData((prev) => ({
      ...prev,
      destination: val?.place_name || '',
      destinationCoordinates: val?.coordinates || [0, 0],
    }));
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    setMessage('');
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      try {
        // Reverse geocode using Mapbox
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}`
        );
        const data = await res.json();
        
        const place = data.features && data.features[0];
        
        if (place) {
          const val = {
            place_name: place.place_name,
            coordinates: [longitude, latitude],
          };
          setSource(val);
          setFormData((prev) => ({
            ...prev,
            source: val.place_name,
            sourceCoordinates: val.coordinates,
          }));
        } else {
          setMessage('Could not determine your address');
        }
      } catch (err) {
        setMessage('Failed to get location');
      } finally {
        setLocating(false);
      }
    }, (err) => {
      setMessage('Permission denied or unavailable');
      setLocating(false);
    });
  };

  const handleCreateRide = async (e) => {
    try {
      e.preventDefault();
      const res = await axiosInstance.post('/rides/create', formData)
      setMessage(res.data.message)
      navigate('/my-rides')
    } catch (err) {
        setMessage(err.response?.data?.message || 'Failed to create ride')
    }
    
  };

  return (
    <div className="flex h-screen w-full">
      {/* Left: Form */}
      {message && <p className="text-red-500 mb-2">{message}</p>}
      <div className="w-full h-full max-w-md p-6 bg-white border-r border-gray-200">
        <h2 className="text-2xl font-bold mb-4 p-2">Create Ride</h2>

        <form onSubmit={handleCreateRide}>
          <div className="flex items-center gap-2">
            <LocationInput
              label="Source"
              value={source}
              onChange={handleSourceChange}
            />
            <button
              type="button"
              className="bg-gray-200 px-2 py-1 rounded text-xs"
              onClick={handleUseCurrentLocation}
              disabled={locating}
            >
              {locating ? 'Locating...' : 'Use Current Location'}
            </button>
          </div>

          <LocationInput
            label="Destination"
            value={destination}
            onChange={handleDestinationChange}
          />

          <div className="mt-4">
            <label className="block mb-1 font-medium">Date & Time</label>
            <input
              type="datetime-local"
              name="datetime"
              value={formData.datetime}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1"
              required
            />
          </div>

          <div className="mt-4">
            <label className="block mb-1 font-medium">Gender Preference</label>
            <select
              name="genderPreference"
              value={formData.genderPreference}
              onChange={handleInputChange}
              className="w-full border rounded px-2 py-1"
            >
              <option value="Any">Any</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <button
            type="button"
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 mr-2"
            onClick={handleShowRoute}
            disabled={!source || !destination || loading}
          >
            {loading ? "Loading..." : "Show Route"}
          </button>

          <button
            type="submit"
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={
              !formData.source ||
              !formData.destination ||
              !formData.datetime ||
              loading
            }
          >
            Create Ride
          </button>
        </form>
      </div>
      {/* Right: Map */}
      <div className="flex h-full w-full">
        <MapView
          source={source}
          destination={destination}
          route={route}
          onSourceChange={handleSourceChange}
          onDestinationChange={handleDestinationChange}
        />
      </div>
    </div>
  );
};

export default MapNavigation;
