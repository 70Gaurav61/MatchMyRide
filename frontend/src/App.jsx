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


function App() {
    return (
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
    )
}

export default App