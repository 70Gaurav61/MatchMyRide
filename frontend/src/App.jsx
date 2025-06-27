import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import RideForm from './pages/RideForm.jsx'
import RideMatches from './pages/RideMatches.jsx'
import GroupPage from './pages/GroupPage.jsx'
import MapNavigation from "./components/MapNavigation.jsx";
import "mapbox-gl/dist/mapbox-gl.css";


function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/ride-form" element={<RideForm />} />
				<Route path="/ride-matches" element={<RideMatches />} />
				<Route path="/group" element={<GroupPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
                <Route path="/ride-form" element={<MapNavigation />} />
            </Routes>
        </Router>
    )
}

export default App