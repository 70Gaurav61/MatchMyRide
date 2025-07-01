import { useEffect, useState, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import io from 'socket.io-client'
import axios from '../api/axiosInstance'

let socket

export default function GroupPage() {
	const location = useLocation()
	const navigate = useNavigate()
	const groupId = location.state?.groupId

	const [group, setGroup] = useState(null)
	const [message, setMessage] = useState('')
	const [messages, setMessages] = useState([])
	const [newMsg, setNewMsg] = useState('')
	const [isReady, setIsReady] = useState(false)
	const [countdown, setCountdown] = useState(null)
	const [countdownStarted, setCountdownStarted] = useState(false)
	const [countdownEndTime, setCountdownEndTime] = useState(null)

	const bottomRef = useRef(null)

	// socket.io
	useEffect(() => {
		if (!groupId) return setMessage('Group ID missing')

		// Connect to WebSocket server
		socket = io('http://localhost:3000', {
			withCredentials: true,
		})

		socket.emit('join-group', groupId)

		socket.on('receive-message', (msg) => {
			setMessages((prev) => [...prev, msg])
		})

		socket.on('group-update', (updatedGroup) => {
			setGroup(updatedGroup)
		})


		socket.on('group-ready-status-updated', (data) => {
			// Update group members' ready status in real time
			setGroup((prev) => prev ? { ...prev, confirmedMembers: data.members } : prev)
			// Update isReady for the current user
			const user = JSON.parse(localStorage.getItem('user'));
			if (user) {
				const me = data.members.find(m => m.user === user._id)
				setIsReady((me && me.ready))
			}
		})

		socket.on('countdown-started', (data) => {
			setCountdownStarted(true)
			setCountdownEndTime(data.endTime)
			setCountdown(Math.max(0, Math.ceil((data.endTime - Date.now()) / 1000)))
		})

		socket.on('ride-started', () => {
			setCountdownStarted(false)
			setCountdown(null)
			setCountdownEndTime(null)
		})

		return () => {
			socket.emit('leave-group', groupId)
			socket.disconnect()
		}
	}, [groupId])

	// api
	useEffect(() => {
		if (!groupId) return
		const fetchGroup = async () => {
			try {
				const res = await axios.get(`/groups/${groupId}`, {
					withCredentials: true,
				})
				setGroup(res.data.group)
				setMessages(res.data.group.messages || [])
				// Set isReady for the current user based on group data
				const user = JSON.parse(localStorage.getItem('user'));
				if (user && res.data.group && res.data.group.confirmedMembers) {
					const me = res.data.group.confirmedMembers.find(m => m.user === user._id);
					setIsReady(me ? me.ready : false);
				}
			} catch (err) {
				setMessage('Failed to load group')
			}
		}

		// Fetch group messages for the current group
		const fetchMessages = async () => {
			try {
				const res = await axios.get(`/groups/${groupId}/messages`, {
					withCredentials: true,
				})
				setMessages(res.data.messages || [])
			} catch (err) {
				console.error('Failed to fetch group messages', err)
				setMessage('Failed to load group messages')
			}
		}
		fetchGroup()
		fetchMessages()
	}, [groupId])

	// Countdown timer effect
	useEffect(() => {
		if (!countdownStarted || countdownEndTime === null) return
		const updateCountdown = () => {
			const remaining = Math.max(0, Math.ceil((countdownEndTime - Date.now()) / 1000))
			setCountdown(remaining)
		}
		updateCountdown()
		if (countdown === 0) return
		const timer = setInterval(updateCountdown, 1000)
		return () => clearInterval(timer)
	}, [countdownStarted, countdownEndTime])

	const handleSendMessage = () => {
		if (newMsg.trim() && socket) {
			socket.emit('send-message', {
				groupId,
				content: newMsg,
			})
			setNewMsg('')
		}
	}

	const handleReadyToggle = () => {
		if (socket && groupId) {
			socket.emit('toggle-ready-status', { groupId })
		}
	}

	const handleLeave = async () => {
		try {
			await axios.post(
				'/groups/leave',
				{ groupId },
				{ withCredentials: true }
			)
			navigate('/')
		} catch (err) {
			setMessage('Failed to leave group')
		}
	}

	const handleStartRide = () => {
		if (socket && groupId) {
			socket.emit('start-ride', { groupId })
		}
	}

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	if (!group) return <p className="p-4 text-center">Loading group...</p>

	return (
		<div className="max-w-4xl mx-auto p-4">
			<h2 className="text-2xl font-bold mb-4">{group.name}</h2>
			{message && <p className="text-red-500 mb-4">{message}</p>}

			<div className="mb-4">
				<h3 className="font-semibold mb-2">Members</h3>
				<ul className="space-y-2">
					{group.confirmedMembers.map((m) => (
						<li key={m.user} className="flex justify-between p-2 border rounded">
							<span>{m.fullName}</span>
							<span
								className={`text-sm font-medium ${
									m.ready ? 'text-green-600' : 'text-gray-400'
								}`}
							>
								{m.ready ? 'Ready' : 'Not Ready'}
							</span>
						</li>
					))}
				</ul>
			</div>

			<div className="mb-4 border p-4 rounded h-64 overflow-y-auto bg-gray-100">
				{messages.map((msg, idx) => (
					<p key={idx} className="text-sm mb-1">
						<strong>{msg.sender.fullName}:</strong> {msg.content}
					</p>
				))}
				<div ref={bottomRef}></div>
			</div>

			<div className="flex gap-2 mb-4">
				<input
					value={newMsg}
					onChange={(e) => setNewMsg(e.target.value)}
					className="flex-1 p-2 border rounded"
					placeholder="Type a message"
				/>
				<button
					onClick={handleSendMessage}
					className="bg-blue-600 text-white px-4 py-2 rounded hover:cursor-pointer"
				>
					Send
				</button>
			</div>

			<div className="flex gap-4 justify-between items-center">
				<div className="flex gap-4">
					<button
						onClick={handleReadyToggle}
						className={`px-4 py-2 rounded hover:cursor-pointer ${
							isReady ? 'bg-yellow-500' : 'bg-green-600'
						} text-white`}
					>
						{isReady ? 'Cancel Ready' : 'Mark Ready'}
					</button>
					<button
						onClick={handleLeave}
						className="px-4 py-2 bg-red-500 text-white rounded hover:cursor-pointer"
					>
						Leave Group
					</button>
				</div>

				{(() => {
					const user = JSON.parse(localStorage.getItem('user'));
					if (user && group.admin === user._id) {
						const isDisabled = countdownStarted || group.status !== 'open';
						return (
							<button
								onClick={handleStartRide}
								disabled={isDisabled}
								className={`px-4 py-2 bg-green-700 text-white rounded hover:cursor-pointer ml-auto ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
							>
								Start Ride
							</button>
						)
					}
					return null;
				})()}
			</div>

			{/* Non-admin waiting/countdown message */}
			{(() => {
				const user = JSON.parse(localStorage.getItem('user'));
				if (!user || !group) return null;
				if (group.admin !== user._id) {
					if (countdownStarted) {
						return (
							<p className="text-center text-lg font-semibold text-yellow-700 mb-4">
								Ride starting in {countdown} seconds...
							</p>
						)
					} else {
						return (
							<p className="text-center text-lg font-semibold text-gray-600 mb-4">
								Waiting for admin to start the ride...
							</p>
						)
					}
				}
				return null;
			})()}
		</div>
	)
}
