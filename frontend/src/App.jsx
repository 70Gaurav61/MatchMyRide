import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import MapNavigation from "./components/MapNavigation.jsx";
import "mapbox-gl/dist/mapbox-gl.css";

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Home />} />
                <Route path="*" element={<Navigate to="/" replace />} />
                <Route path="/ride-form" element={<MapNavigation />} />
            </Routes>
        </Router>
    )
}

export default App