import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/register" element={<Register />} />
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<Home />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    )
}

export default App