import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import MyRides from './pages/MyRides.jsx'
import RideMatches from './pages/RideMatches.jsx'
import GroupPage from './pages/GroupPage.jsx'
import Groups from "./components/groups.jsx";
import RideForm from './pages/RideForm.jsx'
import RidePage from './pages/RidePage';
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useState } from 'react'
import axios from './api/axiosInstance.js'

function InviteOverlay() {
    // use socket.io later(use Socket Context and auth Context)
    const [invites, setInvites] = useState([])
    const [inviteMsg, setInviteMsg] = useState('')
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const fetchInvites = async () => {
            try {
                const res = await axios.get('/groups/my-invites', { withCredentials: true })
                setInvites(res.data.invites || [])
            } catch (err) {
                setInvites([])
            }
        }
        fetchInvites()
    }, [])

    const handleInviteAction = async (groupId, action) => {
        try {
            const url = action === 'accept' ? '/groups/accept-invite' : '/groups/reject-invite'
            await axios.post(url, { groupId }, { withCredentials: true })
            setInvites(invites.filter(inv => inv.groupId !== groupId))
            setInviteMsg(action === 'accept' ? 'Invite accepted!' : 'Invite rejected!')
            setTimeout(() => setInviteMsg(''), 2000)
        } catch (err) {
            setInviteMsg(err.response?.data?.message || 'Action failed')
        }
    }

    if (!visible || invites.length === 0) return null

    return (
        <div style={{position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(60,0,120,0.15)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full relative border-2 border-purple-300">
                <button onClick={() => setVisible(false)} className="absolute top-2 right-3 text-xl text-gray-400 hover:text-gray-700">&times;</button>
                <h2 className="text-2xl font-bold text-purple-700 mb-4 text-center">Pending Group Invites</h2>
                {inviteMsg && <p className="text-green-600 text-center mb-2">{inviteMsg}</p>}
                <ul className="space-y-3">
                    {invites.map(invite => (
                        <li key={invite.groupId} className="flex flex-col sm:flex-row items-center justify-between bg-purple-50 rounded-lg p-4 shadow">
                            <div className="flex-1 text-center sm:text-left">
                                <span className="font-bold text-gray-800">{invite.groupName}</span>
                                {invite.admin && (
                                    <span className="ml-2 text-sm text-gray-600">(Admin: {invite.admin.fullName})</span>
                                )}
                                {invite.ride && invite.ride.name && (
                                    <span className="ml-2 text-sm text-blue-600">Ride: {invite.ride.name}</span>
                                )}
                            </div>
                            <div className="flex gap-2 mt-2 sm:mt-0">
                                <button
                                    onClick={() => handleInviteAction(invite.groupId, 'accept')}
                                    className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded shadow"
                                >
                                    Accept
                                </button>
                                <button
                                    onClick={() => handleInviteAction(invite.groupId, 'reject')}
                                    className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded shadow"
                                >
                                    Reject
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

function App() {
    return (
        <>
            <InviteOverlay />
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
					<Route path="/ride-matches" element={<RideMatches />} />
					<Route path="/my-groups" element={<Groups />} />
					<Route path="/group" element={<GroupPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                    <Route path="/ride-form" element={<RideForm />} />
                    <Route path="/my-rides" element={<MyRides />} />
                    <Route path="/ride-matches" element={<RideMatches />} />
                    <Route path="/ride/:rideId" element={<RidePage />} />
                </Routes>
            </Router>
        </>
    )
}

export default App