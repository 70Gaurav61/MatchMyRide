import { useState } from 'react'
import axios from '../api/axiosInstance.js'
import { useNavigate } from 'react-router-dom'

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
	const navigate = useNavigate()

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
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-green-50 to-white flex items-center justify-center px-4 py-8">
			<div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 sm:p-10">
				<h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-6">
					Create Your Account
				</h2>
				{message && (
					<p className="mb-4 text-center text-sm text-red-600">{message}</p>
				)}
				<form onSubmit={handleSubmit} className="space-y-5">
					<input
						name="fullName"
						type="text"
						placeholder="Full Name"
						value={formData.fullName}
						onChange={handleChange}
						className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
						required
					/>
					<input
						name="email"
						type="email"
						placeholder="Email"
						value={formData.email}
						onChange={handleChange}
						className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
						required
					/>
					<input
						name="password"
						type="password"
						placeholder="Password"
						value={formData.password}
						onChange={handleChange}
						className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
						required
					/>
					<select
						name="gender"
						value={formData.gender}
						onChange={handleChange}
						className="w-full p-3 border border-gray-300 rounded-xl bg-white hover:cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
						required
					>
						<option value="">Select Gender</option>
						<option value="Male">Male</option>
						<option value="Female">Female</option>
					</select>
					<input
						name="contactNumber"
						type="text"
						placeholder="Contact Number"
						value={formData.contactNumber}
						onChange={handleChange}
						className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
					/>
					<input
						name="avatar"
						type="file"
						accept="image/*"
						onChange={handleFileChange}
						className="w-full text-sm hover:cursor-pointer"
					/>
					<div className="flex justify-between gap-2">
						<button
							type="button"
							onClick={handleGeolocation}
							className="w-1/2 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-200 hover:cursor-pointer"
						>
							Use My Location
						</button>
						<button
							type="submit"
							className="w-1/2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition duration-200 hover:cursor-pointer"
						>
							Register
						</button>
					</div>
				</form>
				<div className="text-center mt-6">
					<span className="text-sm text-gray-600">Already have an account?</span>
					<button
						onClick={() => navigate('/login')}
						className="ml-2 text-blue-600 hover:underline text-sm hover:cursor-pointer"
					>
						Login
					</button>
				</div>
			</div>
		</div>
	)

}