import { useState } from 'react'
import axios from '../api/axiosInstance.js'

export default function Register(){
    const [formData, setFormData] = useState({
		fullName: '',
		email: '',
		password: '',
		gender: '',
		contactNumber: '',
		location: [0, 0],
		avatar: null,
	})
    const [message, setMessage] = useState('')

    const handleChange = (e) => {
		const { name, value } = e.target
		setFormData({ ...formData, [name]: value })
	}

    const handleFileChange = (e) => {
		setFormData({ ...formData, avatar: e.target.files[0] })
	}

    const handleGeolocation = () => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition((pos) => {
				const { latitude, longitude } = pos.coords
				setFormData({ ...formData, location: [longitude, latitude] })
			})
		}
	}

    const handleSubmit = async (e) => {
		e.preventDefault()
		const form = new FormData()
		Object.entries(formData).forEach(([key, val]) => {
			if (key === 'avatar' && val) form.append('avatar', val)
			else form.append(key, val)
		})

		try {
			const res = await axios.post('users/register', form, {
				headers: { 'Content-Type': 'multipart/form-data' },
				withCredentials: true
			})
			setMessage(res.data.message)
		} catch (err) {
			setMessage(err.response?.data?.message || 'Registration failed')
		}
	}

    return (
		<div className="max-w-xl mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">Register</h2>
			{message && <p className="mb-2 text-red-500">{message}</p>}
			<form onSubmit={handleSubmit} className="space-y-4">
				<input name="fullName" type="text" placeholder="Full Name" value={formData.fullName} onChange={handleChange} className="w-full p-2 border rounded" required />
				<input name="email" type="email" placeholder="Email" value={formData.email} onChange={handleChange} className="w-full p-2 border rounded" required />
				<input name="password" type="password" placeholder="Password" value={formData.password} onChange={handleChange} className="w-full p-2 border rounded" required />
				<select name="gender" value={formData.gender} onChange={handleChange} className="w-full p-2 border rounded" required>
					<option value="">Select Gender</option>
					<option value="Male">Male</option>
					<option value="Female">Female</option>
				</select>
				<input name="contactNumber" type="text" placeholder="Contact Number" value={formData.contactNumber} onChange={handleChange} className="w-full p-2 border rounded" />
				<input name="avatar" type="file" accept="image/*" onChange={handleFileChange} className="w-full" />
				<button type="button" onClick={handleGeolocation} className="bg-blue-500 text-white px-4 py-2 rounded">Use My Location</button>
				<button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Register</button>
			</form>
		</div>
	)
}