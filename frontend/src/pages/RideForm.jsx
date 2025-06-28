import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from '../api/axiosInstance'

export default function RideForm() {
    const [formData, setFormData] = useState({
        source: '',
        destination: '',
        datetime: '',
        genderPreference: 'Any',
        sourceLocation: [0, 0],
        destinationLocation: [0, 0],
    })

    const [message, setMessage] = useState('')
    const navigate = useNavigate()

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData({ ...formData, [name]: value })
    }

    const handleGeoLocate = (type) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const coords = [position.coords.longitude, position.coords.latitude]
                if (type === 'source') {
                    setFormData({ ...formData, sourceLocation: coords })
                } else {
                    setFormData({ ...formData, destinationLocation: coords })
                }
            })
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const res = await axios.post('/rides/create', formData, {
                withCredentials: true,
            })
            setMessage(res.data.message)
            navigate('/my-rides')
        } catch (err) {
            setMessage(err.response?.data?.message || 'Failed to create ride')
        }
    }

    return (
        <div className="max-w-xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-4">Create Ride</h2>
            {message && <p className="text-red-500 mb-2">{message}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    name="source"
                    type="text"
                    placeholder="Source Address"
                    value={formData.source}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                />
                <button
                    type="button"
                    onClick={() => handleGeoLocate('source')}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:cursor-pointer"
                >
                    Use Current Location as Source
                </button>

                <input
                    name="destination"
                    type="text"
                    placeholder="Destination Address"
                    value={formData.destination}
                    onChange={handleChange}
                    className="w-full p-2 border rounded hover:cursor-pointer"
                    required
                />
                <button
                    type="button"
                    onClick={() => handleGeoLocate('destination')}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:cursor-pointer"
                >
                    Use Current Location as Destination
                </button>

                <input
                    name="datetime"
                    type="datetime-local"
                    value={formData.datetime}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                    required
                />
                <select
                    name="genderPreference"
                    value={formData.genderPreference}
                    onChange={handleChange}
                    className="w-full p-2 border rounded"
                >
                    <option value="Any">Any</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                </select>
                <button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded hover:cursor-pointer"
                >
                    Create Ride
                </button>
            </form>
        </div>
    )

}