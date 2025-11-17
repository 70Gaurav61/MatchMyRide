import { useState, useEffect } from "react";
import LocationInput from "../components/mapbox/LocationInput";
// import MapView from "../components/mapbox/MapView";
import MapView from "../components/mapbox/MapView_new";
import { fetchRoute } from "../components/mapbox/mapUtils";
import axiosInstance from "../api/axiosInstance";
import { useNavigate } from "react-router-dom";

const RideForm = () => {
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
  const [message, setMessage] = useState('');
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
      const feature = await fetchRoute([source.coordinates, destination.coordinates]);
      if (feature.geometry) {
        setRoute(feature);
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

  const handleCreateRide = async (e) => {
    try {
      e.preventDefault();
      const res = await axiosInstance.post('/rides/create', formData);
      setMessage(res.data.message);
      navigate('/my-rides');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to create ride');
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full md:h-screen w-full">
      {/* Left: Form */}
      <div className="w-full md:max-w-md p-4 md:p-6 bg-white border-b md:border-b-0 md:border-r border-gray-200">
        <h2 className="text-2xl font-bold mb-4 p-2 hidden md:block">Create Ride</h2>
        {message && <p className="text-red-500 mb-2">{message}</p>}
        <form onSubmit={handleCreateRide}>
          <LocationInput
            label="Source"
            value={source}
            onChange={handleSourceChange}
          />

          <LocationInput
            label="Destination"
            value={destination}
            onChange={handleDestinationChange}
            showCurrentLocationBtn={false}
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
          <div className="flex flex-row gap-2 mt-4">
            <button
              type="button"
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 w-full sm:w-auto"
              onClick={handleShowRoute}
              disabled={!source || !destination || loading}
            >
              {loading ? "Loading..." : "Show Route"}
            </button>
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50 w-full sm:w-auto"
              disabled={
                !formData.source ||
                !formData.destination ||
                !formData.datetime ||
                loading
              }
            >
              Create Ride
            </button>
          </div>
        </form>
      </div>
      {/* Right: Map */}
      <div className="flex h-[70vh] w-full min-w-0 md:h-full">
        <MapView
          // source={source} // markers props
          // destination={destination} // markers props
          // route={route} // route prop
          // onSourceChange={handleSourceChange} // markers change handlers
          // onDestinationChange={handleDestinationChange} // markers change handlers
          markers={[{
            coordinates: source?.coordinates,
            label: source?.place_name,
            color: '#0000ff',
            draggable: true,
            onDragEnd: (geocoded) => handleSourceChange({
              place_name: geocoded?.place_name || source.place_name,
              coordinates: geocoded?.coordinates || source.coordinates,
            }),
          },{
            coordinates: destination?.coordinates,
            label: destination?.place_name,
            color: '#ff0000',
            draggable: true,
            onDragEnd: (geocoded) => handleDestinationChange({
              place_name: geocoded?.place_name || destination.place_name,
              coordinates: geocoded?.coordinates || destination.coordinates,
            }),
          }]}
          routes={[
            {
              geojson: route,
            }
          ]}
        />
      </div>
    </div>
  );
};

export default RideForm;
