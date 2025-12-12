import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
    User, Phone, MapPin, Clock, 
    CheckCircle2, Circle, Users 
} from 'lucide-react' // Assuming you have lucide-react installed
import axios from '../api/axiosInstance'

export default function RideMatches({ rideId }) {
    const [matches, setMatches] = useState([])
    const [selected, setSelected] = useState([])
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        const fetchMatches = async () => {
            setLoading(true)
            try {
                const res = await axios.post(
                    '/rides/matched',
                    { rideId }
                )
                setMatches(res.data.matches)
            } catch (err) {
                setMessage('Could not fetch matches')
            } finally {
                setLoading(false)
            }
        }

        if (rideId) fetchMatches()
        else {
            setMessage('Ride ID not provided')
            setLoading(false)
        }
    }, [rideId])

    const toggleSelection = (id) => {
        if (selected.includes(id)) {
            setSelected(selected.filter((uid) => uid !== id))
        } else {
            setSelected([...selected, id])
        }
    }

    const handleCreateGroup = async () => {
        if (selected.length === 0) return;
        
        try {
            const invites = matches
                .filter((match) => selected.includes(match.user._id))
                .map((match) => ({
                    user: match.user._id,
                    ride: match._id,
                }))
            
            const res = await axios.post(
                '/groups/create', 
                {
                    rideId,
                    invites,
                }
            )
            
            if (res.data.group?._id)
                navigate('/my-groups', { state: { groupId: res.data.group._id } })
            else
                setMessage('Invalid response from server')

        } catch (err) {
            setMessage(err.response?.data?.message || 'Group creation failed')
        }
    }

    // Helper to format date
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return {
            date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
            time: date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        };
    }

    return (
        <div className="flex flex-col h-full bg-background relative overflow-hidden">
            
            {/* 1. Header Section */}
            <div className="hidden md:block p-6 md:p-7.5 border-b border-border bg-surface shrink-0">
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-bold text-content flex items-center gap-2">
                            <Users className="w-6 h-6 text-primary" />
                            Potential Matches
                        </h2>
                        <p className="text-muted mt-1">
                            Select people to form a ride group.
                        </p>
                    </div>
                    <div className="text-sm font-medium bg-secondary/50 px-3 py-1 rounded-full text-secondary-fg">
                        {matches.length} Found
                    </div>
                </div>
                {message && <p className="text-error mt-2 text-sm bg-error/10 p-2 rounded">{message}</p>}
            </div>

            {/* 2. Scrollable List Section */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
                {loading && (
                    <div className="flex flex-col items-center justify-center h-40 text-muted space-y-2">
                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                        <p>Finding compatible rides...</p>
                    </div>
                )}

                {!loading && matches.length === 0 && (
                    <div className="text-center py-12 px-4 border-2 border-dashed border-border rounded-xl bg-surface/50">
                        <Users className="w-12 h-12 mx-auto text-muted mb-3" />
                        <h3 className="font-semibold text-lg text-content">No matches yet</h3>
                        <p className="text-muted text-sm max-w-xs mx-auto">
                            We couldn't find anyone with a similar route and time right now. Check back later!
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {matches.map((ride, index) => {
                        const isSelected = selected.includes(ride.user._id);
                        const { date, time } = formatDate(ride.datetime);
                        
                        return (
                            <div
                                key={ride._id}
                                onClick={() => toggleSelection(ride.user._id)}
                                style={{ animationDelay: `${index * 50}ms` }}
                                className={`
                                    group relative p-5 rounded-xl border cursor-pointer transition-all duration-200 animate-slide-up
                                    flex flex-col justify-between
                                    ${isSelected 
                                        ? 'bg-primary/5 border-primary shadow-md ring-1 ring-primary' 
                                        : 'bg-surface border-border hover:border-primary/50 hover:shadow-md'}
                                `}
                            >
                                {/* Selection Indicator (Top Right) */}
                                <div className={`absolute top-4 right-4 transition-colors ${isSelected ? 'text-primary' : 'text-muted/30 group-hover:text-primary/50'}`}>
                                    {isSelected ? <CheckCircle2 size={24} fill="blue" className="text-primary-fg" /> : <Circle size={24} />}
                                </div>

                                {/* User Info */}
                                <div className="flex items-start gap-3 mb-4 pr-8">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 `}>
                                        <img src={ride.user.avatar} alt={`${ride.user.fullName}'s avatar`} className="w-full h-full rounded-full object-cover" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-content leading-tight">
                                            {ride.user.fullName}
                                        </h4>
                                        <div className="flex items-center text-xs text-muted mt-1 gap-1">
                                            <Phone size={12} />
                                            <span>Hidden</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Route Info */}
                                <div className="space-y-2 border-t border-dashed border-border pt-3 mt-auto">
                                    <div className="flex items-start gap-2 text-sm text-content">
                                        <MapPin size={16} className="text-muted shrink-0 mt-0.5" />
                                        <div className="flex flex-col">
                                            <span className="text-xs text-muted">Route</span>
                                            <span className="font-medium truncate max-w-[200px] md:max-w-[400px]">{ride.source}</span>
                                            <span className="font-medium truncate max-w-[200px] md:max-w-[400px]"> → {ride.destination}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-content">
                                        <Clock size={16} className="text-muted shrink-0" />
                                        <span className="font-medium">{date} at {time}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* 3. Sticky Action Footer */}
            <div className="p-4 md:p-6 bg-surface border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 shrink-0">
                <div className="flex items-center justify-between gap-4 max-w-4xl mx-auto">
                    <div className="hidden md:block">
                        <span className="text-sm font-medium text-muted">
                            {selected.length}/{matches.length} Selected
                        </span>
                    </div>
                    <button
                        onClick={handleCreateGroup}
                        disabled={selected.length === 0}
                        className={`
                            flex-1 md:flex-none md:w-64 py-3 px-6 rounded-xl font-bold transition-all
                            flex items-center justify-center gap-2
                            ${selected.length > 0 
                                ? 'bg-primary text-primary-fg hover:bg-primary/90 shadow-lg hover:shadow-primary/20 transform hover:-translate-y-0.5' 
                                : 'bg-muted/30 text-muted-fg cursor-not-allowed'}
                        `}
                    >
                        <span>Create Group</span>
                        {selected.length > 0 && (
                            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                                {selected.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}