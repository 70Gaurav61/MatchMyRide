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

export async function generateOptimizedRoute(members) {
  const MAPBOX_API_KEY = process.env.MAPBOX_API_KEY;
  if (!MAPBOX_API_KEY) throw new Error("MAPBOX_API_KEY not set");

  // Build points
  const points = [];
  for (const m of members) {
    const uid = String(m.user._id);
    const fullName = m.user.fullName;
    const avatar = m.user.avatar;
    const src = (m.ride && m.ride.sourceLocation && m.ride.sourceLocation.coordinates) || null;
    const dest = (m.ride && m.ride.destinationLocation && m.ride.destinationLocation.coordinates) || null;

    if (!src || !dest) {
      throw new Error(`Missing coordinates for user ${uid}`);
    }

    points.push({ userId: uid, fullName, avatar, type: "pickup", loc: src });
    points.push({ userId: uid, fullName, avatar, type: "drop",   loc: dest });
  }

  // Determine dominant axis (0 = lng, 1 = lat)
  const lats = points.map(p => p.loc[1]);
  const lngs = points.map(p => p.loc[0]);
  const dLat = Math.max(...lats) - Math.min(...lats);
  const dLng = Math.max(...lngs) - Math.min(...lngs);
  const axis = Math.abs(dLng) > Math.abs(dLat) ? 0 : 1; // 0 -> lng, 1 -> lat

  // Determine travel direction using avg pickup vs avg drop on same axis
  const pickups = points.filter(p => p.type === "pickup");
  const drops   = points.filter(p => p.type === "drop");
  const avgPickup = pickups.reduce((s, p) => s + p.loc[axis], 0) / pickups.length;
  const avgDrop   = drops.reduce((s, p) => s + p.loc[axis], 0) / drops.length;

  // If avgDrop > avgPickup, travel is increasing along axis, so sort ascending.
  // Else sort descending.
  const ascending = avgDrop > avgPickup;

  // Sort all points by axis with chosen direction
  points.sort((a, b) => {
    if (a.loc[axis] === b.loc[axis]) return 0;
    return ascending ? a.loc[axis] - b.loc[axis] : b.loc[axis] - a.loc[axis];
  });

  // Build final order by walking sorted list,
  // deferring drops whose pickups haven't been seen and inserting them right after the pickup.
  const finalOrder = [];
  const seenPickup = new Set();
  const pendingDrop = new Map(); // userId -> dropPoint

  for (const p of points) {
    if (p.type === "pickup") {
      finalOrder.push(p);
      seenPickup.add(p.userId);

      // if drop was pending for this user, attach it immediately after pickup
      if (pendingDrop.has(p.userId)) {
        finalOrder.push(pendingDrop.get(p.userId));
        pendingDrop.delete(p.userId);
      }
    } else {
      // drop
      if (seenPickup.has(p.userId)) {
        finalOrder.push(p);
      } else {
        // postpone drop until pickup is seen
        // but if a drop for same user is already pending, keep whichever is earlier (shouldn't happen)
        pendingDrop.set(p.userId, p);
      }
    }
  }

  // If any pending drops remain (edge-case where pickup never appeared), append them at the end
  for (const [uid, dropPoint] of pendingDrop.entries()) {
    finalOrder.push(dropPoint);
  }

  // Prepare coordinates for Mapbox Directions
  const orderedCoordinates = finalOrder.map(p => p.loc);
  const coordsStr = orderedCoordinates.map(c => c.join(",")).join(";");

  const directionsURL =
    `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsStr}` +
    `?steps=true&geometries=geojson&overview=full&access_token=${MAPBOX_API_KEY}`;

  const directionsRes = await fetch(directionsURL);
  if (!directionsRes.ok) {
    const text = await directionsRes.text();
    throw new Error(`Mapbox Directions error: ${directionsRes.status} ${text}`);
  }
  const directions = await directionsRes.json();

  return {
    waypointOrder: finalOrder.map(p => ({
      userId: p.userId,
      fullName: p.fullName,
      avatar: p.avatar,
      type: p.type,
      location: p.loc
    })),
    orderedCoordinates,
    directions
  };
}