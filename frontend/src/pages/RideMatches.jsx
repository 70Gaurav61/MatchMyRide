import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from '../api/axiosInstance'

export default function RideMatches() {
    const [matches, setMatches] = useState([])
    const [selected, setSelected] = useState([])
    const [message, setMessage] = useState('')
    const navigate = useNavigate()
    const location = useLocation()
    const rideId = location.state?.rideId // passed from createRide navigation

    useEffect(() => {
        const fetchMatches = async () => {
            try {
                const res = await axios.post(
                    '/api/v1/rides/match',
                    { rideId },
                    { withCredentials: true }
                )
                setMatches(res.data.matches)
            } catch (err) {
                setMessage('Could not fetch matches')
            }
        }

        if (rideId) fetchMatches()
        else setMessage('Ride ID not provided')
    }, [rideId])

    const toggleSelection = (id) => {
        if (selected.includes(id)) {
            setSelected(selected.filter((uid) => uid !== id))
        } else if (selected.length < 3) {
            setSelected([...selected, id])
        }
    }

    const handleCreateGroup = async () => {
        try {
            const invites = matches
                .filter((match) => selected.includes(match.user._id))
                .map((match) => ({
                    user: match.user._id,
                    ride: match._id,
                }))
            const res = await axios.post(
                '/api/v1/groups/create', // check again the route
                {
                    name: 'My Ride Group',
                    rideId,
                    invites,
                },
                { withCredentials: true }
            )
            navigate('/group', { state: { groupId: res.data.group._id } })
        } catch (err) {
            setMessage(err.response?.data?.message || 'Group creation failed')
        }
    }

    return (
        <div className="max-w-3xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Matched Rides</h2>
            {message && <p className="text-red-500 mb-4">{message}</p>}
            {matches.length === 0 && <p>No matches found</p>}
            <ul className="space-y-4">
                {matches.map((ride) => (
                    <li
                        key={ride._id}
                        onClick={() => toggleSelection(ride.user._id)}
                        className={`border rounded p-4 cursor-pointer ${
                            selected.includes(ride.user._id)
                                ? 'bg-green-100 border-green-500'
                                : ''
                        }`}
                    >
                        <p className="font-semibold">{ride.user.fullName}</p>
                        <p className="text-sm">Phone: {ride.user.contactNumber}</p>
                        <p className="text-sm text-gray-500">
                            From {ride.source} to {ride.destination} at{' '}
                            {new Date(ride.datetime).toLocaleString()}
                        </p>
                    </li>
                ))}
            </ul>
            {selected.length > 0 && (
                <button
                    onClick={handleCreateGroup}
                    className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded"
                >
                    Create Group with Selected
                </button>
            )}
        </div>
    )
}