import { useState } from "react";

const MAPBOX_TOKEN = import.meta.env.VITE_REACT_APP_MAPBOX_API_KEY;

const LocationInput = ({ label, value, onChange }) => {
  const [query, setQuery] = useState(value?.place_name || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchSuggestions = async (q) => {
    if (!q) return setSuggestions([]);
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&country=IN`
    );
    const data = await res.json();
    setSuggestions(data.features || []);
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