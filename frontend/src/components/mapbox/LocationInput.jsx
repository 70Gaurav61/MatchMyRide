import { useState, useEffect } from "react";
import { getLocationSuggestions, getCurrentLocation, reverseGeocode } from "../mapbox/mapUtils";

const LocationInput = ({ label, value, onChange, showCurrentLocationBtn = true }) => {
  const [query, setQuery] = useState(value?.place_name || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    setQuery(value?.place_name || "");
  }, [value]);

  const fetchSuggestions = async (q) => {
    const data = await getLocationSuggestions(q);
    setSuggestions(data || []);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);
    fetchSuggestions(val);
  };

  const handleSelect = (feature) => {
    setQuery(feature.place_name);
    setShowDropdown(false);
    setSuggestions([]);
    onChange({
      place_name: feature.place_name,
      coordinates: feature.center,
    });
  };

  const handleCurrentLocation = async () => {
    setLocating(true);
    const { coordinates} = await getCurrentLocation();

    if (coordinates) {
      const { place_name } = await reverseGeocode(coordinates[0], coordinates[1]);
      if (place_name) {
        handleSelect({ place_name, center: coordinates });
      }
    }
    setLocating(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <input
        type="text"
        className="w-full border px-3 py-2 rounded focus:outline-none focus:ring"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setShowDropdown(true)}
        autoComplete="off"
        placeholder={`Enter ${label} location`}
      />
      {showCurrentLocationBtn && (
        <button
          type="button"
          className="absolute right-2 top-8 bg-gray-200 px-2 py-0.5 rounded text-xs whitespace-nowrap cursor-pointer"
          disabled={locating}
          title="Your Location"
          onClick={handleCurrentLocation}
        >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="white" stroke="#3443e6ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="2" x2="5" y1="12" y2="12"/>
          <line x1="19" x2="22" y1="12" y2="12"/>
          <line x1="12" x2="12" y1="2" y2="5"/>
          <line x1="12" x2="12" y1="19" y2="22"/>
          <circle cx="12" cy="12" r="7"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
        </button>
      )}
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-10 bg-white border w-full mt-1 rounded shadow max-h-48 overflow-y-auto">
          {suggestions.map((feature) => (
            <li
              key={feature.id}
              className="px-3 py-2 hover:bg-blue-100 cursor-pointer"
              onClick={() => handleSelect(feature)}
            >
              {feature.place_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationInput; 