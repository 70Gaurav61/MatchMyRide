import { useUser } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'

export default function Home() {
    const { user, logout } = useUser()
    const navigate = useNavigate()

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center px-4">
            <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl p-8">
                <h1 className="text-3xl font-bold text-blue-700 mb-6 text-center">Welcome to RideShare</h1>

                {user && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 mb-8 text-center sm:text-left">
                        {user.avatar && (
                            <img
                                src={user.avatar}
                                alt="Avatar"
                                className="w-20 h-20 rounded-full object-cover border"
                            />
                        )}
                        <div>
                            <p className="text-xl font-semibold text-gray-800">Hello, {user.fullName}</p>
                            <p className="text-sm text-gray-600">Email: {user.email}</p>
                            {user.contactNumber && (
                                <p className="text-sm text-gray-600">Phone: {user.contactNumber}</p>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate('/ride-form')}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-md transition hover:cursor-pointer"
                    >
                        Create Ride
                    </button>
                    <button
                        onClick={() => navigate('/my-rides')}
                        className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-md transition hover:cursor-pointer"
                    >
                        View My Rides
                    </button>
                    <button
                        onClick={() => navigate('/my-groups')}
                        className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-md transition hover:cursor-pointer"
                    >
                        View My Groups
                    </button>
                    <button
                        onClick={handleLogout}
                        className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md shadow-md transition hover:cursor-pointer"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    )
}