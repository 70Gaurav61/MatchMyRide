import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/useUser.js';
import { useSocket } from '../context/useSocket.js';
import MapView from '../components/mapbox/MapView_new';
import { getDistanceMeters, formatDistance, watchLocation } from '../components/mapbox/mapUtils';
import { ArrowLeft, Navigation as NavigationIcon, Users, MapPin, Clock, Zap } from 'lucide-react';
import axios from '../api/axiosInstance';

function Navigation({groupId, initialGroup}) {
  const navigate = useNavigate();
  const { user: currentUser } = useUser();
  const { isConnected, on, off, emit } = useSocket();
  
  
  const [group, setGroup] = useState(initialGroup);
  const [members, setMembers] = useState([]);
  const [waypoints, setWaypoints] = useState([]);
  const [commonRoute, setCommonRoute] = useState(null);
  const [coveredRoute, setCoveredRoute] = useState(null);
  const [remainingRoute, setRemainingRoute] = useState(null);
  const [userLocations, setUserLocations] = useState({});
  const [myLocation, setMyLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eta, setEta] = useState(null);
  const [distanceRemaining, setDistanceRemaining] = useState(null);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [isTracking, setIsTracking] = useState(false);
  
  const watchIdRef = useRef(null);
  const coveredPointsRef = useRef([]);
  const lastLocationRef = useRef(null);

  // Fetch group data if not passed
  useEffect(() => {
    if (!groupId) {
      setError('Group ID missing');
      setLoading(false);
      return;
    }

    if (!group) {
      const fetchGroup = async () => {
        try {
          const res = await axios.get(`/groups/${groupId}`);
          setGroup(res.data.group);
        } catch (err) {
          console.error('Failed to fetch group:', err);
          setError('Failed to load group data');
        } finally {
          setLoading(false);
        }
      };
      fetchGroup();
    } else {
      setLoading(false);
    }
  }, [groupId, group]);

  // Extract route and member data from group
  useEffect(() => {
    if (!group || !group.members) return;

    try {
      // Extract member data
      const memberData = group.members
        .filter(m => m.ride && m.ride.sourceLocation && m.ride.destinationLocation)
        .map(m => ({
          id: m.user._id,
          name: m.user.fullName,
          avatar: m.user.avatar,
          source: m.ride.sourceLocation.coordinates,
          destination: m.ride.destinationLocation.coordinates,
        }));

      setMembers(memberData);

      if (memberData.length === 0) {
        setError('No rides found for this group');
        return;
      }

      // Use the pre-calculated group route
      if (group.route && group.route.directions && group.route.directions.routes && group.route.directions.routes[0]) {
        const routeData = group.route.directions.routes[0];
        
        // Create GeoJSON from the route geometry
        const routeGeoJSON = {
          type: 'Feature',
          geometry: routeData.geometry,
          properties: {
            distance: routeData.distance,
            duration: routeData.duration,
          },
        };
        
        setCommonRoute(routeGeoJSON);
        setRemainingRoute(routeGeoJSON); // Initially, all route is remaining
        
        // Extract waypoints for pickup/drop markers
        if (group.route.waypointOrder) {
          setWaypoints(group.route.waypointOrder);
        }
        
        // Calculate initial stats
        setDistanceRemaining(routeData.distance);
        const etaTime = new Date(Date.now() + routeData.duration * 1000);
        setEta(etaTime);
      } else {
        setError('Group route not available');
      }
    } catch (err) {
      console.error('Failed to process route:', err);
      setError('Failed to process route');
    }
  }, [group]);
  // Start location tracking
  useEffect(() => {
    if (!currentUser || !commonRoute) return;

    const startTracking = () => {
      setIsTracking(true);
      
      watchIdRef.current = watchLocation(
        (locationData) => {
          const { coordinates, speed, timestamp } = locationData;
          
          setMyLocation(coordinates);
          lastLocationRef.current = coordinates;
          
          // Calculate speed in km/h
          if (speed !== null && speed !== undefined) {
            setSpeedKmh(Math.round(speed * 3.6)); // Convert m/s to km/h
          }
          
          // Emit location to other group members via socket
          if (isConnected && groupId) {
            emit('location-update', {
              groupId,
              userId: currentUser._id,
              location: coordinates,
              timestamp,
            });
          }
          
          // Update covered route
          updateCoveredRoute(coordinates);
        },
        (error) => {
          console.error('Location tracking error:', error);
          setError('Failed to track location');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    };

    startTracking();

    // Cleanup
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        setIsTracking(false);
      }
    };
  }, [currentUser, commonRoute, isConnected, groupId]);

  // Listen for other users' location updates via socket
  useEffect(() => {
    if (!isConnected || !groupId) return;

    const handleLocationUpdate = (data) => {
      const { userId, location, timestamp } = data;
      
      setUserLocations(prev => ({
        ...prev,
        [userId]: { coordinates: location, timestamp }
      }));
    };

    on('location-update', handleLocationUpdate);

    return () => {
      off('location-update', handleLocationUpdate);
    };
  }, [isConnected, groupId, on, off]);

  // Update covered route based on current location
  const updateCoveredRoute = useCallback((currentCoords) => {
    if (!commonRoute || !currentCoords) return;

    const routeCoordinates = commonRoute.geometry.coordinates;
    
    // Find the closest point on the route to the current location
    let closestIndex = 0;
    let minDistance = Infinity;
    
    routeCoordinates.forEach((coord, index) => {
      const distance = getDistanceMeters(currentCoords, coord);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // Only update if we've made significant progress (moved to a new point)
    const lastIndex = coveredPointsRef.current.length > 0 
      ? coveredPointsRef.current[coveredPointsRef.current.length - 1] 
      : 0;
    
    if (closestIndex > lastIndex) {
      coveredPointsRef.current.push(closestIndex);
      
      // Create covered route (grey) - from start to current position
      const coveredCoords = routeCoordinates.slice(0, closestIndex + 1);
      if (coveredCoords.length > 1) {
        setCoveredRoute({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coveredCoords,
          },
          properties: {},
        });
      }
      
      // Create remaining route - from current position to end
      const remainingCoords = routeCoordinates.slice(closestIndex);
      if (remainingCoords.length > 1) {
        setRemainingRoute({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: remainingCoords,
          },
          properties: {},
        });
        
        // Calculate remaining distance
        let totalDistance = 0;
        for (let i = 0; i < remainingCoords.length - 1; i++) {
          totalDistance += getDistanceMeters(remainingCoords[i], remainingCoords[i + 1]);
        }
        setDistanceRemaining(totalDistance);
        
        // Update ETA based on current speed
        if (speedKmh > 5) { // Only calculate if moving
          const hoursRemaining = (totalDistance / 1000) / speedKmh;
          const etaTime = new Date(Date.now() + hoursRemaining * 3600 * 1000);
          setEta(etaTime);
        }
      }
    }
  }, [commonRoute, speedKmh]);

  // Prepare data for MapView
  const mapUsers = members.map(member => {
    const userLocation = userLocations[member.id];
    const isMe = currentUser && member.id === currentUser._id;
    
    return {
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      // Don't show source/destination markers - only live location
      liveLocation: isMe && myLocation 
        ? { coordinates: myLocation }
        : userLocation 
        ? { coordinates: userLocation.coordinates }
        : null,
      color: isMe ? '#22c55e' : '#3b82f6',
    };
  });

  // Prepare waypoint markers for pickup/drop locations
  const waypointMarkers = waypoints.map((waypoint, index) => {
    const isPickup = waypoint.type === 'pickup';
    
    // Create marker element
    const markerEl = document.createElement('div');
    markerEl.style.cssText = `
      width: 32px;
      height: 32px;
      background: ${isPickup ? '#10b981' : '#ef4444'};
      color: white;
      border: 3px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 14px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      cursor: pointer;
    `;
    markerEl.textContent = (index + 1).toString(); // 1, 2, 3, 4...
    
    return {
      id: `waypoint-${index}`,
      coordinates: waypoint.location,
      label: `${isPickup ? '📍 Pickup' : '🎯 Drop'}: ${waypoint.fullName}`,
      element: markerEl,
    };
  });

  // Prepare routes for MapView
  const mapRoutes = [];
  
  // Covered route (grey)
  if (coveredRoute) {
    mapRoutes.push({
      id: 'covered-route',
      geojson: coveredRoute,
      color: '#9ca3af', // Grey
      opacity: 0.7,
      width: 8,
    });
  }
  
  // Remaining route (blue/active)
  if (remainingRoute) {
    mapRoutes.push({
      id: 'remaining-route',
      geojson: remainingRoute,
      color: '#3b82f6', // Blue
      opacity: 1,
      width: 8,
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading navigation...</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error || 'Group not found'}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen relative">
      {/* Map - Full Screen */}
      <div className="h-full w-full">
        <MapView
          config={{
            mode: 'live',
            showControls: true,
            fitBounds: true,
          }}
          users={mapUsers}
          routes={mapRoutes}
          markers={waypointMarkers}
          liveLocation={myLocation}
        />

        {/* Stats Panel - Bottom Right */}
        <div className="absolute bottom-1 right-0 md:bottom-4 md:right-0 backdrop-blur-sm rounded-lg p-4 z-10">
          <div className="flex flex-col-reverse md:flex-row items-center gap-4 md:gap-8 md:pr-4 ">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <MapPin size={12} />
                <span>Distance</span>
              </div>
              <div className="text-sm font-bold text-gray-800">
                {distanceRemaining !== null ? formatDistance(distanceRemaining) : '--'}
              </div>
            </div>
            
            {/* <div className="w-10 h-px md:w-px md:h-10 bg-gray-200"></div> */}
            
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Clock size={12} />
                <span>ETA</span>
              </div>
              <div className="text-sm font-bold text-gray-800">
                {eta ? eta.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}
              </div>
            </div>
            
            {/* <div className="w-10 h-px md:w-px md:h-10 bg-gray-200"></div> */}
            
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Zap size={12} />
                <span>Speed</span>
              </div>
              <div className="text-sm font-bold text-gray-800">
                {speedKmh > 0 ? `${speedKmh} km/h` : '--'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Active Users Panel */}
        <div className="absolute bottom-1 left-0 md:bottom-4 md:left-4 w-64 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg p-2 md:p-4 max-h-64 overflow-y-auto z-10">
          <div className="hidden md:flex items-center gap-2 mb-3">
            <Users size={18} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-800">Active Members</h3>
            <span className="ml-auto text-sm text-gray-500">
              {Object.keys(userLocations).length + (myLocation ? 1 : 0)} / {members.length}
            </span>
          </div>
          
          <div className="space-y-2">
            {mapUsers.map(user => {
              const isActive = user.liveLocation !== null;
              const isMe = currentUser && user.id === currentUser._id;
              
              return (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    isActive ? 'bg-green-50' : 'bg-gray-50'
                  }`}
                >
                  <div className="relative">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isActive && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="font-medium text-gray-800 flex items-center gap-2">
                      {user.name}
                      {isMe && (
                        <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isActive ? (
                        <span className="text-green-600 font-medium">● Live</span>
                      ) : (
                        <span className="text-gray-400">Offline</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Navigation;