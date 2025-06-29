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

	const bottomRef = useRef(null)

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

		socket.on('countdown-started', () => {
			alert('All members confirmed! Ride starting in 30 seconds.')
		})

		return () => {
			socket.emit('leave-group', groupId)
			socket.disconnect()
		}
	}, [groupId])

	useEffect(() => {
		if (!groupId) return
		const fetchGroup = async () => {
			try {
				const res = await axios.get(`/groups/${groupId}`, {
					withCredentials: true,
				})
				setGroup(res.data.group)
				setMessages(res.data.group.messages || [])
			} catch (err) {
				setMessage('Failed to load group')
			}
		}
		fetchGroup()
	}, [groupId])

	const handleSendMessage = () => {
		if (newMsg.trim() && socket) {
			socket.emit('send-message', {
				groupId,
				content: newMsg,
			})
			setNewMsg('')
		}
	}

	const handleReadyToggle = async () => {
		try {
			const res = await axios.patch(
				'/api/v1/groups/ready',
				{ groupId, ready: !isReady },
				{ withCredentials: true }
			)
			setIsReady(res.data.ready)
		} catch (err) {
			setMessage('Failed to update readiness')
		}
	}

	const handleLeave = async () => {
		try {
			await axios.post(
				'/api/v1/groups/leave',
				{ groupId },
				{ withCredentials: true }
			)
			navigate('/')
		} catch (err) {
			setMessage('Failed to leave group')
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
						<strong>{msg.senderName}:</strong> {msg.content}
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
		</div>
	)
}
