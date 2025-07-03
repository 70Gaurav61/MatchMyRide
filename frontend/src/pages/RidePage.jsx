import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import MapView from "../components/MapView";
import axiosInstance from "../api/axiosInstance";

// Helper to find the closest point index in a LineString to a given coordinate
function findClosestIndex(lineCoords, targetCoord) {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < lineCoords.length; i++) {
    const [lng, lat] = lineCoords[i];
    const d = Math.sqrt(
      Math.pow(lng - targetCoord[0], 2) + Math.pow(lat - targetCoord[1], 2)
    );
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }
  return minIdx;
}

const RidePage = () => {
  const { rideId } = useParams();
  const [ride, setRide] = useState(null);
  const [group, setGroup] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDetails, setShowDetails] = useState(false); // For mobile details panel
  const [liveLocation, setLiveLocation] = useState(null);
  const watchIdRef = useRef(null);

  // Helper to detect mobile view
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchRideDetails = async () => {
      setLoading(true);
      try {
        const res = await axiosInstance.get(`/rides/${rideId}/details`);
        setRide(res.data.ride);
        setGroup(res.data.group);
        setRoute(res.data.route);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch ride details");
      } finally {
        setLoading(false);
      }
    };
    fetchRideDetails();
  }, [rideId]);

  // Extract group member markers
  let memberMarkers = [];
  if (group && group.confirmedMembers && group.members) {
    // Map userId to avatar
    const userIdToAvatar = {};
    group.confirmedMembers.forEach(m => {
      userIdToAvatar[m.user] = m.avatar;
    });
    // For each group member, get their ride's sourceLocation
    group.members.forEach(m => {
      if (m.ride && m.ride.sourceLocation && m.ride.sourceLocation.coordinates) {
        memberMarkers.push({
          coordinates: m.ride.sourceLocation.coordinates,
          avatar: userIdToAvatar[m.user?._id || m.user],
          fullName: m.user?.fullName || '',
        });
      }
    });
  }

  // Live navigation handler
  const handleStartNavigation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    if (watchIdRef.current !== null) return; // Already tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLiveLocation({
          coordinates: [pos.coords.longitude, pos.coords.latitude],
        });
      },
      (err) => {
        alert('Unable to retrieve your location');
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );
  };
  // Stop tracking on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!ride) return <div className="p-8">No ride found.</div>;

  // Prepare source/destination for MapView
  const source = ride.sourceCoordinates ? { coordinates: ride.sourceCoordinates, place_name: ride.source } : null;
  const destination = ride.destinationCoordinates ? { coordinates: ride.destinationCoordinates, place_name: ride.destination } : null;

  // Prepare routes for MapView
  let routes = [];
  if (route && route.geometry && route.geometry.coordinates && ride.sourceCoordinates && ride.destinationCoordinates) {
    // Full group route (light color)
    routes.push({ geojson: route, color: "#60a5fa", opacity: 0.5 });
    // User segment (dark color)
    const lineCoords = route.geometry.coordinates;
    const userSrcIdx = findClosestIndex(lineCoords, ride.sourceCoordinates);
    const userDestIdx = findClosestIndex(lineCoords, ride.destinationCoordinates);
    const [startIdx, endIdx] = userSrcIdx < userDestIdx ? [userSrcIdx, userDestIdx] : [userDestIdx, userSrcIdx];
    const userSegmentCoords = lineCoords.slice(startIdx, endIdx + 1);
    if (userSegmentCoords.length > 1) {
      routes.push({
        geojson: {
          type: "Feature",
          geometry: {
            type: "LineString",
            coordinates: userSegmentCoords,
          },
        },
        color: "#2563eb",
        opacity: 1,
      });
    }
  }

  // Details panel content
  const detailsPanel = (
    <div className="w-full max-w-md p-6 bg-white border-r border-gray-200 overflow-y-auto h-full md:h-auto">
      <h2 className="text-2xl font-bold mb-4">Ride Details</h2>
      <div className="mb-4">
        <div><span className="font-medium">Source:</span> {ride.source}</div>
        <div><span className="font-medium">Destination:</span> {ride.destination}</div>
        <div><span className="font-medium">Date & Time:</span> {new Date(ride.datetime).toLocaleString()}</div>
        <div><span className="font-medium">Status:</span> {ride.status}</div>
        <div><span className="font-medium">Gender Preference:</span> {ride.genderPreference}</div>
      </div>
      {group && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Group Members</h3>
          <ul>
            {group.confirmedMembers?.map((member) => (
              <li key={member.user} className="flex items-center gap-2 mb-1">
                {member.avatar && <img src={member.avatar} alt={member.fullName} className="w-6 h-6 rounded-full" />}
                <span>{member.fullName}</span>
                {member.ready && <span className="text-green-600 text-xs ml-2">Ready</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative h-screen w-full">
      {/* Desktop: Side-by-side layout */}
      <div className={`hidden md:flex flex-col md:flex-row h-screen w-full`}>
        {/* Left: Ride and group details */}
        {detailsPanel}
        {/* Right: Map */}
        <div className="flex-1 h-full">
          <MapView
            source={source}
            destination={destination}
            routes={routes}
            memberMarkers={memberMarkers}
            liveLocation={liveLocation}
          />
        </div>
        {/* Start Navigation Button */}
        <button
          className="fixed bottom-8 right-8 z-30 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg text-lg font-semibold hover:bg-green-700 transition"
          onClick={handleStartNavigation}
          style={{ minWidth: 120 }}
        >
          Start
        </button>
      </div>
      {/* Mobile: Map full screen, floating button for details and navigation */}
      <div className="md:hidden h-full w-full relative">
        <MapView
          source={source}
          destination={destination}
          routes={routes}
          memberMarkers={memberMarkers}
          liveLocation={liveLocation}
        />
        {/* Floating button for details */}
        <button
          className="fixed bottom-20 right-6 z-20 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg focus:outline-none"
          onClick={() => setShowDetails(true)}
        >
          Show Details
        </button>
        {/* Start Navigation Button */}
        <button
          className="fixed bottom-6 right-6 z-30 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg text-lg font-semibold hover:bg-green-700 transition"
          onClick={handleStartNavigation}
          style={{ minWidth: 120 }}
        >
          Start
        </button>
        {/* Slide-up panel */}
        {showDetails && (
          <div className="fixed inset-0 z-30 flex items-end justify-center" style={{ pointerEvents: 'none' }}>
            {/* Click-catcher for closing panel */}
            <div
              className="absolute inset-0"
              style={{ pointerEvents: 'auto' }}
              onClick={() => setShowDetails(false)}
            />
            <div
              className="w-full max-w-md bg-white rounded-t-2xl p-6 shadow-lg animate-slideup"
              style={{ maxHeight: '80vh', overflowY: 'auto', pointerEvents: 'auto', position: 'relative' }}
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-2 right-4 text-gray-500 text-2xl font-bold"
                onClick={() => setShowDetails(false)}
                aria-label="Close"
              >
                &times;
              </button>
              {detailsPanel}
            </div>
          </div>
        )}
      </div>
      {/* Slide-up animation */}
      <style>{`
        @keyframes slideup {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slideup {
          animation: slideup 0.3s cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>
    </div>
  );
};

export default RidePage;
