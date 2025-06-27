import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../api/axiosInstance'

export default function MyRides() {
    const [rides, setRides] = useState([])
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')
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

    return (
        <div className="max-w-3xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">My Rides</h2>
            {loading && <p>Loading...</p>}
            {message && <p className="text-red-500 mb-4">{message}</p>}
            {!loading && rides.length === 0 && <p>You have not created any rides yet.</p>}
            <ul className="space-y-4">
                {rides.map((ride) => (
                    <li key={ride._id} className="border rounded p-4">
                        <p className="font-semibold">From: {ride.source}</p>
                        <p className="font-semibold">To: {ride.destination}</p>
                        <p className="text-sm text-gray-500">Date: {new Date(ride.datetime).toLocaleString()}</p>
                        <p className="text-sm">Status: {ride.status}</p>
                        <p className="text-sm">Gender Preference: {ride.genderPreference}</p>
                        <button
                            className="mt-2 bg-blue-500 text-white py-1 px-3 rounded"
                            onClick={() => navigate('/ride-matches', { state: { rideId: ride._id } })}
                        >
                            View Matches
                        </button>
                    </li>
                ))}
            </ul>
            <button
                onClick={() => navigate(-1)}
                className="mt-6 bg-gray-400 text-white py-2 px-4 rounded"
            >
                Back
            </button>
        </div>
    )
} 