const MAPBOX_API_KEY = process.env.MAPBOX_API_KEY;

export async function getRouteGeoJSON(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    throw new Error('At least two waypoints required');
  }
  const coords = waypoints.map(wp => wp.join(',')).join(';');
  
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}?geometries=geojson&access_token=${MAPBOX_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch route from Mapbox');
  const data = await res.json();
  if (!data.routes || !data.routes[0]) throw new Error('No route found');
  return {
    type: 'Feature',
    geometry: data.routes[0].geometry,
    properties: {},
  };
} 