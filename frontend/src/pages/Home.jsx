import { useEffect, useState } from 'react'
import axios from '../api/axiosInstance.js'
import { useNavigate } from 'react-router-dom'

export default function Home() {
    const [user, setUser] = useState(null)
    const [message, setMessage] = useState('')
    const navigate = useNavigate()

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get('/users/me', {
                    withCredentials: true,
                })
                setUser(res.data.user)
            } catch (err) {
                setMessage('Not authenticated')
                navigate('/login')
            }
        }
        fetchUser()
    }, [navigate])

    const handleLogout = async () => {
        try {
            await axios.post('/users/logout', {}, { withCredentials: true })
            navigate('/login')
        } catch (err) {
            setMessage(err.response?.data?.message || 'Logout failed')
        }
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">Welcome to RideShare</h1>
            {message && <p className="text-red-500 mb-4">{message}</p>}
            {user && (
                <div className="flex items-center gap-4 mb-6">
                    {user.avatar && (
                        <img
                            src={user.avatar}
                            alt="Avatar"
                            className="w-16 h-16 rounded-full object-cover border"
                        />
                    )}
                    <div>
                        <p className="text-lg font-semibold">Hello, {user.fullName}</p>
                        <p className="text-sm text-gray-600">Email: {user.email}</p>
                        {user.contactNumber && (
                            <p className="text-sm text-gray-600">Phone: {user.contactNumber}</p>
                        )}
                    </div>
                </div>
            )}
            <div className="flex flex-wrap gap-4">
                <button
                    onClick={() => navigate('/ride-form')}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                >
                    Create Ride
                </button>
                <button
                    onClick={() => navigate('/my-rides')}
                    className="px-4 py-2 bg-green-500 text-white rounded"
                >
                    View My Rides
                </button>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-500 text-white rounded"
                >
                    Logout
                </button>
            </div>
        </div>
    )
}