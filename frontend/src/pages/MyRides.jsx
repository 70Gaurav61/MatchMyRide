import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, MapPinIcon, CarIcon } from 'lucide-react'
import Navigation from '../components/Navigation'
import RideMatches from '../components/RideMatches'
import axios from '../api/axiosInstance'

export default function MyRides() {
    const [rides, setRides] = useState([])
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')
    
    // UI State
    const [selectedRide, setSelectedRide] = useState(null)
    const [rideGroup, setRideGroup] = useState(null)
    
    const navigate = useNavigate()

    useEffect(() => {
        const fetchRides = async () => {
            try {
                const res = await axios.get('/rides/user-rides', { withCredentials: true })
                setRides(res.data.rides)
            } catch (err) {
                setMessage('Could not fetch your rides')
            } finally {
                setLoading(false)
            }
        }
        fetchRides()
    }, [])

    useEffect(() => {
        const fetchRideGroup = async () => {
            if (selectedRide?.status === 'Matched') {
                try {
                    const res = await axios.get(`/rides/group/${selectedRide._id}`);
                    setRideGroup(res.data?.group || null);
                }
                catch (err) {
                    console.error('Failed to fetch ride group:', err);
                    setMessage('Could not fetch ride group details');
                    setRideGroup(null);
                }
            } else {
                setRideGroup(null);
            }
        }
        fetchRideGroup();
    }, [selectedRide]);

    // Handler for the Action Button (moved from the list to the detail view)
    const handleRideAction = async (ride) => {
        if (ride.status === 'Matched') {
            const res = await axios.get(`/rides/group/${ride._id}`);
            navigate(`/navigation`, { state: { groupId: res.data?.group?._id, group: res.data?.group } });
        } else {
            navigate('/ride-matches', { state: { rideId: ride._id } });
        }
    }

    return (
        <div className='bg-background h-screen w-full flex overflow-hidden relative'>
            
            {/* INJECT CUSTOM ANIMATION STYLES */}
            <style>{`
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-slide-in-right { animation: slideInRight 0.4s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.4s ease-out forwards; }
                .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
            `}</style>

            {/* =======================================================
               LEFT SIDE: LIST VIEW
               - Hidden on mobile IF a ride is selected
               - Takes 1/3 width on desktop
            ======================================================== */}
            <div className={`
                flex flex-col w-full md:w-1/3 lg:w-1/4 border-r border-border bg-surface h-full z-10
                ${selectedRide ? 'hidden md:flex' : 'flex'}
            `}>
                {/* Header */}
                <div className="p-6 border-b border-border bg-surface sticky top-0 z-20">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center text-sm text-muted hover:text-primary mb-4 transition-colors"
                    >
                        <ArrowLeftIcon /> <span className="ml-2">Back to Dashboard</span>
                    </button>
                    <h2 className="text-2xl font-bold text-content">My Rides</h2>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading && <p className="text-center text-muted animate-pulse">Loading rides...</p>}
                    
                    {message && <p className="text-center text-error mb-4">{message}</p>}
                    
                    {!loading && rides.length === 0 && (
                        <div className="text-center p-8 text-muted border-2 border-dashed rounded-xl">
                            <p>No rides created yet.</p>
                        </div>
                    )}

                    {rides.map((ride, index) => (
                        <div
                            key={ride._id}
                            onClick={() => setSelectedRide(ride)}
                            style={{ animationDelay: `${index * 50}ms` }} // Staggered animation
                            className={`
                                cursor-pointer rounded-xl p-4 border transition-all duration-200 animate-slide-up
                                ${selectedRide?._id === ride._id 
                                    ? 'bg-primary/10 border-primary shadow-md' 
                                    : 'bg-surface shadow-sd border-transparent hover:shadow-lg hover:border-border'}
                            `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${ride.status === 'Matched' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {ride.status || 'Pending'}
                                </span>
                                <span className="text-xs text-muted">{new Date(ride.datetime).toLocaleDateString()}</span>
                            </div>
                            <h3 className="font-semibold text-content truncate">{ride.destination}</h3>
                            <p className="text-sm text-muted truncate">From: {ride.source}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* =======================================================
               RIGHT SIDE: DETAIL VIEW
               - Hidden on mobile IF NO ride selected
               - Takes 2/3 width on desktop
               - Uses 'key' to force animation on change
            ======================================================== */}
            <div className={`
                flex-col bg-background h-full overflow-y-auto
                ${selectedRide ? 'flex fixed inset-0 z-50 md:static md:w-2/3 lg:w-3/4' : 'hidden md:flex md:w-2/3 lg:w-3/4 items-center justify-center'}
            `}>
                
                {selectedRide ? (
                    <div 
                        key={selectedRide._id} // CRITICAL: This forces the animation to replay when ID changes
                        className="flex flex-col h-full w-full animate-slide-in-right bg-background"
                    >
                        {/* Mobile Only Header */}
                        <div className="md:hidden p-4 border-b border-border bg-surface flex items-center shadow-sm">
                            <button 
                                onClick={() => setSelectedRide(null)}
                                className="p-2 hover:bg-gray-100 rounded-full mr-2"
                            >
                                <ArrowLeftIcon />
                            </button>
                            <span className="font-semibold text-lg">Ride Details</span>
                        </div>

                        {selectedRide.status === 'Matched' && rideGroup && (
                            <Navigation groupId={rideGroup._id} initialGroup={rideGroup} />
                        )}

                        {selectedRide.status !== 'Matched' && (
                            <RideMatches rideId={selectedRide._id} />
                        )}
                    </div>
                ) : (
                    /* Empty State (Desktop Only) */
                    <div className="text-center p-10 animate-fade-in opacity-50">
                        <div className="inline-block p-6 bg-surface rounded-full mb-4">
                            <CarIcon />
                        </div>
                        <h3 className="text-xl font-medium text-content">Select a ride</h3>
                        <p className="text-muted">Click on a ride from the left to view details</p>
                    </div>
                )}
            </div>
        </div>
    )
}