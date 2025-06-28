import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../api/axiosInstance.js'

export default function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })
    const [message, setMessage] = useState('')
    const navigate = useNavigate()

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData({ ...formData, [name]: value })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const res = await axios.post('/users/login', formData)
            setMessage(res.data.message)
            navigate('/') // Redirect to homepage on success
        } catch (err) {
            setMessage(err.response?.data?.message || 'Login failed')
        }
    }

    return (
        <div className="max-w-md mx-auto p-6">
            <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
            {message && <p className="text-center text-red-500 mb-4">{message}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    name="email"
                    type="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                />
                <input
                    name="password"
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                />
                <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded hover:cursor-pointer"
                >
                    Login
                </button>
            </form>
            <div className="text-center mt-4">
                <span className="text-sm text-gray-600">Don't have an account?</span>
                <button
                    onClick={() => navigate('/register')}
                    className="ml-2 text-blue-600 hover:underline text-sm hover:cursor-pointer"
                >
                    Sign up
                </button>
            </div>

        </div>
    )
}