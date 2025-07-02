import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import MapView from "../components/MapView";
import axiosInstance from "../api/axiosInstance";

const RidePage = () => {
  const { rideId } = useParams();
  const [ride, setRide] = useState(null);
  const [group, setGroup] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!ride) return <div className="p-8">No ride found.</div>;

  // Prepare source/destination for MapView
  const source = ride.sourceCoordinates ? { coordinates: ride.sourceCoordinates, place_name: ride.source } : null;
  const destination = ride.destinationCoordinates ? { coordinates: ride.destinationCoordinates, place_name: ride.destination } : null;

  return (
    <div className="flex flex-col md:flex-row h-screen w-full">
      {/* Left: Ride and group details */}
      <div className="w-full max-w-md p-6 bg-white border-r border-gray-200 overflow-y-auto">
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
      {/* Right: Map */}
      <div className="flex-1 h-full">
        <MapView
          source={source}
          destination={destination}
          route={route}
        />
      </div>
    </div>
  );
};

export default RidePage;
