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
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <div className="w-full max-w-2xl bg-surface shadow-xl rounded-2xl p-8">
                <h1 className="text-3xl font-bold text-primary mb-6 text-center">Welcome to Match My Ride</h1>

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
                            <p className="text-xl font-semibold text-content">Hello, {user.fullName}</p>
                            <p className="text-sm text-muted">Email: {user.email}</p>
                            {user.contactNumber && (
                                <p className="text-sm text-muted">Phone: {user.contactNumber}</p>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate('/ride-form')}
                        className="px-5 py-2 bg-primary/80 hover:bg-primary text-white rounded-md shadow-md transition hover:cursor-pointer"
                    >
                        Create Ride
                    </button>
                    <button
                        onClick={() => navigate('/my-rides')}
                        className="px-5 py-2 bg-primary/80 hover:bg-primary text-white rounded-md shadow-md transition hover:cursor-pointer"
                    >
                        View My Rides
                    </button>
                    <button
                        onClick={() => navigate('/my-groups')}
                        className="px-5 py-2 bg-primary/80 hover:bg-primary text-white rounded-md shadow-md transition hover:cursor-pointer"
                    >
                        View My Groups
                    </button>
                    <button
                        onClick={handleLogout}
                        className="px-5 py-2 bg-error/90 hover:bg-error text-white rounded-md shadow-md transition hover:cursor-pointer"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    )
}