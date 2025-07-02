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
        <div className='bg-gradient-to-br from-blue-100 via-green-100 to-white'>
            <div className="max-w-3xl mx-auto p-4">
                <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">My Rides</h2>

                {loading && <p className="text-center text-gray-600">Loading...</p>}
                {message && <p className="text-center text-red-500 mb-4">{message}</p>}
                {!loading && rides.length === 0 && (
                    <p className="text-center text-gray-600">You have not created any rides yet.</p>
                )}

                <ul className="space-y-4">
                    {rides.map((ride) => (
                    <li
                        key={ride._id}
                        className="bg-blue-100 shadow-sd rounded-xl p-4 border hover:shadow-lg transition"
                    >
                        <p className="text-lg font-semibold text-gray-800">From: {ride.source}</p>
                        <p className="text-lg font-semibold text-gray-800">To: {ride.destination}</p>
                        <p className="text-sm text-gray-600">
                            Date: {new Date(ride.datetime).toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">Status: {ride.status}</p>
                        <p className="text-sm text-gray-600">
                            Gender Preference: {ride.genderPreference}
                        </p>
                        <button
                            className="mt-3 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded w-full sm:w-auto hover:cursor-pointer"
                            onClick={() => {
                                if (ride.status === 'Matched') {
                                    navigate(`/ride/${ride._id}`);
                                } else {
                                    navigate('/ride-matches', { state: { rideId: ride._id } });
                                }
                            }}
                        >
                            {ride.status === 'Matched' ? 'Go to Ride' : 'View Matches'}
                        </button>
                    </li>
                    ))}
                </ul>

                <div className="flex justify-center mt-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-6 rounded hover:cursor-pointer"
                        >
                        Back
                    </button>
                </div>
            </div>
        </div>
    );
} 