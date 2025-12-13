import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from './context/UserContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import MyRides from './pages/MyRides.jsx'
import MyGroups from "./pages/MyGroups.jsx"
import RideForm from './pages/RideForm.jsx'
import RideMap from './pages/RideMap.jsx';
import Navigation from './pages/Navigation.jsx';
import "mapbox-gl/dist/mapbox-gl.css";
import InviteOverlay from './components/InviteOverlay.jsx'

import { SpeedInsights } from '@vercel/speed-insights/react';

function App() {
    return (
        <>
            <SpeedInsights />
            
            <UserProvider>
                <SocketProvider>
                    <InviteOverlay />
                    <Router>
                        <Routes>
                            <Route path="/register" element={<Register />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                            <Route path="/ride-form" element={<ProtectedRoute><RideForm /></ProtectedRoute>} />
                            <Route path="/my-rides" element={<ProtectedRoute><MyRides /></ProtectedRoute>} />
                            <Route path="/my-groups" element={<ProtectedRoute><MyGroups /></ProtectedRoute>} />
                            <Route path="/ride-map" element={<ProtectedRoute><RideMap /></ProtectedRoute>} />
                            <Route path="/navigation" element={<ProtectedRoute><Navigation /></ProtectedRoute>} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Router>
                </SocketProvider>
            </UserProvider>
        </>
    )
}

export default App