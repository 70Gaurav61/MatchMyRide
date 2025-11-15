const MAPBOX_TOKEN = import.meta.env.VITE_REACT_APP_MAPBOX_API_KEY;

export function getDistanceMeters(coord1, coord2) {
  if (!coord1 || !coord2) return Infinity;
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getDistanceKm(coord1, coord2) {
  return getDistanceMeters(coord1, coord2) / 1000;
}

export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Fetch route between two or more waypoints from Mapbox Directions API
 * @param {Array<[number, number]>} waypoints - Array of [lng, lat] coordinates
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} GeoJSON route
 */
export async function fetchRoute(waypoints, options = {}) {
  if (!waypoints || waypoints.length < 2) {
    throw new Error('At least two waypoints required');
  }

  const {
    profile = 'driving', // 'driving', 'walking', 'cycling'
    alternatives = false,
    steps = false,
    banner_instructions = false,
    voice_instructions = false
  } = options;

  const coords = waypoints.map(wp => wp.join(',')).join(';');
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}?` +
    `geometries=geojson&` +
    `alternatives=${alternatives}&` +
    `steps=${steps}&` +
    `banner_instructions=${banner_instructions}&` +
    `voice_instructions=${voice_instructions}&` +
    `access_token=${MAPBOX_TOKEN}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch route from Mapbox');
  
  const data = await res.json();
  if (!data.routes || !data.routes[0]) throw new Error('No route found');
  
  return {
    type: 'Feature',
    geometry: data.routes[0].geometry,
    properties: {
      distance: data.routes[0].distance, // in meters
      duration: data.routes[0].duration, // in seconds
    },
  };
}

/**
 * Reverse geocode coordinates to address
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 * @returns {Promise<Object>} Location object with place_name and coordinates
 */
export async function reverseGeocode(lng, lat) {
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}`
    );
    const data = await res.json();
    if (data.features && data.features[0]) {
      return {
        place_name: data.features[0].place_name,
        coordinates: [lng, lat],
      };
    }
  } catch (err) {
    console.error("Reverse geocode error:", err);
  }
  return null;
}

/**
 * Forward geocode address to coordinates
 * @param {string} query - Address or place name
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} Array of location suggestions
 */
export async function forwardGeocode(query, options = {}) {
  const {
    country = 'IN',
    limit = 5,
    types = '',
    proximity = ''
  } = options;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
    `access_token=${MAPBOX_TOKEN}&` +
    `country=${country}&` +
    `limit=${limit}` +
    (types ? `&types=${types}` : '') +
    (proximity ? `&proximity=${proximity}` : '');

  const res = await fetch(url);
  const data = await res.json();
  return data.features || [];
}

/**
 * Assign unique color to user based on their ID
 * @param {string} userId - User ID
 * @param {Array<string>} colorPalette - Array of hex colors
 * @returns {string} Hex color
 */
export function getUserColor(userId, colorPalette = null) {
  const defaultPalette = [
    '#2563eb', // blue
    '#dc2626', // red
    '#16a34a', // green
    '#ca8a04', // yellow
    '#9333ea', // purple
    '#ec4899', // pink
    '#0891b2', // cyan
    '#ea580c'  // orange
  ];
  
  const colors = colorPalette || defaultPalette;
  if (!userId) return colors[0];
  
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

/**
 * Calculate bounds for a set of coordinates
 * @param {Array<[number, number]>} coordinates - Array of [lng, lat]
 * @returns {[[number, number], [number, number]]} [[minLng, minLat], [maxLng, maxLat]]
 */
export function calculateBounds(coordinates) {
  if (!coordinates || coordinates.length === 0) return null;
  
  let minLng = Infinity, minLat = Infinity;
  let maxLng = -Infinity, maxLat = -Infinity;
  
  coordinates.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
  
  return [[minLng, minLat], [maxLng, maxLat]];
}

/**
 * Check if coordinates are valid
 * @param {[number, number]} coords - [lng, lat]
 * @returns {boolean}
 */
export function isValidCoordinates(coords) {
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  const [lng, lat] = coords;
  return typeof lng === 'number' && typeof lat === 'number' &&
         lng >= -180 && lng <= 180 &&
         lat >= -90 && lat <= 90;
}

/**
 * Format duration in seconds to human-readable string
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration (e.g., "1h 30m" or "45m")
 */
export function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Calculate ETA based on distance and average speed
 * @param {number} distanceMeters - Distance in meters
 * @param {number} speedKmh - Average speed in km/h (default: 40)
 * @returns {Date} Estimated arrival time
 */
export function calculateETA(distanceMeters, speedKmh = 40) {
  const distanceKm = distanceMeters / 1000;
  const hours = distanceKm / speedKmh;
  const milliseconds = hours * 60 * 60 * 1000;
  return new Date(Date.now() + milliseconds);
}

/**
 * Get current user's location using browser geolocation API
 * @param {Object} options - Geolocation options
 * @returns {Promise<{coordinates: [number, number], accuracy: number}>}
 */
export function getCurrentLocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coordinates: [position.coords.longitude, position.coords.latitude],
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
      },
      (error) => {
        reject(error);
      },
      defaultOptions
    );
  });
}

/**
 * Watch user's location and call callback on updates
 * @param {Function} callback - Called with location data on each update
 * @param {Function} errorCallback - Called on errors
 * @param {Object} options - Geolocation options
 * @returns {number} Watch ID (use to clear watch with navigator.geolocation.clearWatch)
 */
export function watchLocation(callback, errorCallback, options = {}) {
  if (!navigator.geolocation) {
    if (errorCallback) errorCallback(new Error('Geolocation not supported'));
    return null;
  }

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 10000,
    ...options
  };

  return navigator.geolocation.watchPosition(
    (position) => {
      callback({
        coordinates: [position.coords.longitude, position.coords.latitude],
        accuracy: position.coords.accuracy,
        heading: position.coords.heading,
        speed: position.coords.speed,
        timestamp: position.timestamp
      });
    },
    errorCallback,
    defaultOptions
  );
}

/**
 * Create a GeoJSON LineString from coordinates
 * @param {Array<[number, number]>} coordinates - Array of [lng, lat]
 * @returns {Object} GeoJSON LineString feature
 */
export function createLineString(coordinates) {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: coordinates
    },
    properties: {}
  };
}

/**
 * Create a GeoJSON Point from coordinates
 * @param {[number, number]} coordinates - [lng, lat]
 * @param {Object} properties - Additional properties
 * @returns {Object} GeoJSON Point feature
 */
export function createPoint(coordinates, properties = {}) {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: coordinates
    },
    properties: properties
  };
}

/**
 * Simplify route coordinates (reduce number of points)
 * Useful for reducing data size while maintaining route shape
 * @param {Array<[number, number]>} coordinates - Array of [lng, lat]
 * @param {number} tolerance - Simplification tolerance (higher = more simplified)
 * @returns {Array<[number, number]>} Simplified coordinates
 */
export function simplifyRoute(coordinates, tolerance = 0.0001) {
  if (coordinates.length <= 2) return coordinates;
  
  // Simple Douglas-Peucker-like algorithm
  const simplified = [coordinates[0]];
  let prevCoord = coordinates[0];
  
  for (let i = 1; i < coordinates.length - 1; i++) {
    const distance = getDistanceMeters(prevCoord, coordinates[i]);
    if (distance > tolerance * 111000) { // Convert to meters
      simplified.push(coordinates[i]);
      prevCoord = coordinates[i];
    }
  }
  
  simplified.push(coordinates[coordinates.length - 1]);
  return simplified;
}

/**
 * Check if point is within radius of another point
 * @param {[number, number]} point - [lng, lat]
 * @param {[number, number]} center - [lng, lat]
 * @param {number} radiusMeters - Radius in meters
 * @returns {boolean}
 */
export function isWithinRadius(point, center, radiusMeters) {
  return getDistanceMeters(point, center) <= radiusMeters;
}

export async function getLocationSuggestions(q) {
    if (!q) return [];
    const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5&country=IN`
    );
    const data = await res.json();
    return data.features || [];
};