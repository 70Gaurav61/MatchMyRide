import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from './context/UserContext';
import ProtectedRoute from './components/ProtectedRoute';
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
import InviteOverlay from './components/InviteOverlay.jsx'

function App() {
    return (
        <UserProvider>
            <InviteOverlay />
            <Router>
                <Routes>
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                    <Route path="/ride-form" element={<ProtectedRoute><RideForm /></ProtectedRoute>} />
                    <Route path="/my-rides" element={<ProtectedRoute><MyRides /></ProtectedRoute>} />
                    <Route path="/ride-matches" element={<ProtectedRoute><RideMatches /></ProtectedRoute>} />
                    <Route path="/my-groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
                    <Route path="/group" element={<ProtectedRoute><GroupPage /></ProtectedRoute>} />
                    <Route path="/ride/:rideId" element={<ProtectedRoute><RidePage /></ProtectedRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </UserProvider>
    )
}

export default App