import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Navigation } from 'lucide-react';
import MapView from '../components/mapbox/MapView_new';

// Color palette for different users
const USER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
];

// Create custom waypoint marker element
function createWaypointMarker(number, type, color, user) {
  const container = document.createElement('div');
  container.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
  `;

  // Number badge
  const badge = document.createElement('div');
  badge.style.cssText = `
    width: 36px;
    height: 36px;
    background: ${color};
    border: 3px solid white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 16px;
    color: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    position: relative;
  `;
  badge.textContent = number;

  // Type indicator (pickup or drop)
  const typeIcon = document.createElement('div');
  typeIcon.style.cssText = `
    position: absolute;
    top: -4px;
    right: -4px;
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  `;
  typeIcon.textContent = type === 'pickup' ? '🚶' : '🏁';
  badge.appendChild(typeIcon);

  container.appendChild(badge);

  // User avatar (if available)
  if (user?.avatar) {
    const avatar = document.createElement('img');
    avatar.src = user.avatar;
    avatar.alt = user.fullName;
    avatar.style.cssText = `
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid white;
      margin-top: -8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    `;
    container.appendChild(avatar);
  }

  return container;
}

function RideMap() {
  const location = useLocation();
  const navigate = useNavigate();
  const { group, currentUser } = location.state || {};
  
  const [mapData, setMapData] = useState({ markers: [], routes: [], waypoints: [] });
  const [loading, setLoading] = useState(true);
  const [userColorMap, setUserColorMap] = useState({});

  useEffect(() => {
    if (!group || !currentUser) {
      navigate(-1);
      return;
    }

    const prepareMapData = () => {
      try {
        // Check if group has optimized route
        if (!group.route || !group.route.directions || !group.route.waypointOrder) {
          console.error('Group does not have optimized route data');
          setLoading(false);
          return;
        }

        const members = Array.isArray(group.members) ? group.members : [];
        const colorMap = {};
        
        // Assign colors to users
        members.forEach((member, index) => {
          const userId = member.user?._id;
          if (userId) {
            const isCurrentUser = userId === currentUser._id;
            colorMap[userId] = isCurrentUser ? '#3b82f6' : USER_COLORS[(index + 1) % USER_COLORS.length];
          }
        });
        setUserColorMap(colorMap);

        // Extract the optimized route from directions
        const routeGeometry = group.route.directions.routes[0]?.geometry;
        const optimizedRoute = {
          id: 'optimized-route',
          geojson: {
            type: 'Feature',
            geometry: routeGeometry,
            properties: {}
          },
          color: '#6366f1', // Indigo for the main route
          opacity: 0.9,
          width: 6
        };

        // Create waypoint markers from waypointOrder
        const waypoints = group.route.waypointOrder || [];
        const waypointMarkers = waypoints.map((waypoint, index) => {
          const userId = waypoint.userId;
          const user = members.find(m => m.user?._id === userId)?.user;
          const color = colorMap[userId] || '#6366f1';
          
          return {
            waypoint,
            index: index + 1,
            user,
            color
          };
        });

        setMapData({
          markers: waypointMarkers,
          routes: [optimizedRoute],
          waypoints
        });

      } catch (error) {
        console.error('Error preparing map data:', error);
      } finally {
        setLoading(false);
      }
    };

    prepareMapData();
  }, [group, currentUser, navigate]);

  if (!group || !currentUser) {
    return null;
  }

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading route...</p>
        </div>
      </div>
    );
  }

  // Custom markers for waypoints
  const customMarkers = mapData.markers.map((marker) => ({
    id: `waypoint-${marker.index}`,
    coordinates: marker.waypoint.location,
    label: `
      <div style="font-weight: 600; color: #1f2937;">
        <div style="font-size: 14px; margin-bottom: 4px;">
          ${marker.waypoint.type === 'pickup' ? '🚶 Pickup' : '🏁 Drop'} #${marker.index}
        </div>
        <div style="font-size: 13px; color: ${marker.color};">
          ${marker.user?.fullName || 'Unknown'}
        </div>
      </div>
    `,
    color: marker.color,
    element: createWaypointMarker(marker.index, marker.waypoint.type, marker.color, marker.user)
  }));

  return (
    <div className="relative w-full h-screen">
      {/* Map Container */}
      <MapView
        config={{
          mode: 'view',
          showControls: true,
          fitBounds: true
        }}
        routes={mapData.routes}
        markers={customMarkers}
      />

      {/* Route Journey Legend */}
      <div className="absolute bottom-6 left-4 z-30 bg-white rounded-lg shadow-xl p-4 max-w-sm max-h-[80vh] overflow-y-auto">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b">
          <Navigation className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-gray-800 text-lg">Journey Order</h3>
        </div>
        
        <div className="space-y-2">
          {mapData.waypoints.map((waypoint, index) => {
            const user = group.members.find(m => m.user?._id === waypoint.userId)?.user;
            const color = userColorMap[waypoint.userId] || '#6366f1';
            const isCurrentUser = waypoint.userId === currentUser._id;

            return (
              <div 
                key={index}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {/* Step number and connector */}
                <div className="flex flex-col items-center">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {index + 1}
                  </div>
                  {index < mapData.waypoints.length - 1 && (
                    <div className="w-0.5 h-8 bg-gray-300 my-1"></div>
                  )}
                </div>

                {/* Waypoint details */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    {waypoint.type === 'pickup' ? (
                      <MapPin className="w-4 h-4 text-green-600" />
                    ) : (
                      <MapPin className="w-4 h-4 text-red-600 fill-red-600" />
                    )}
                    <span className="text-xs font-semibold text-gray-600 uppercase">
                      {waypoint.type}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.fullName}
                        className="w-6 h-6 rounded-full border-2 border-white shadow"
                      />
                    ) : (
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs"
                        style={{ backgroundColor: color }}
                      >
                        {waypoint.fullName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {waypoint.fullName}
                        {isCurrentUser && (
                          <span className="ml-1 text-xs text-indigo-600 font-semibold">(You)</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Group Info Card */}
      <div className="absolute top-4 right-4 z-30 bg-white rounded-lg shadow-xl p-4 max-w-xs">
        <h3 className="font-bold text-gray-800 mb-2 text-lg">{group.name}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{mapData.waypoints.length} stops</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Navigation className="w-4 h-4" />
            <span>
              {group.route?.directions?.routes?.[0]?.distance 
                ? `${(group.route.directions.routes[0].distance / 1000).toFixed(1)} km`
                : 'Distance N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <span>⏱️</span>
            <span>
              {group.route?.directions?.routes?.[0]?.duration 
                ? `${Math.round(group.route.directions.routes[0].duration / 60)} min`
                : 'Time N/A'}
            </span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500">
            Optimized route showing all pickups and drops in order
          </p>
        </div>
      </div>

      {/* Member Legend */}
      <div className="absolute bottom-6 right-4 z-30 bg-white rounded-lg shadow-xl p-4 max-w-xs">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm">Group Members</h3>
        <div className="space-y-2">
          {group.members.map((member) => {
            const user = member.user;
            const color = userColorMap[user._id] || '#6366f1';
            const isCurrentUser = user._id === currentUser._id;

            return (
              <div key={user._id} className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                ></div>
                
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.fullName}
                    className="w-7 h-7 rounded-full border-2 border-white shadow flex-shrink-0"
                  />
                ) : (
                  <div 
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {user.fullName}
                    {isCurrentUser && (
                      <span className="ml-1 text-xs text-indigo-600 font-semibold">(You)</span>
                    )}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RideMap;