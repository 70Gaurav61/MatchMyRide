import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useSocket } from '../context/SocketContext';
import axios from '../api/axiosInstance';
import GroupHeader from '../components/chat/GroupHeader';
import ChatMessage, { DateSeparator, TypingIndicator, NewMessageIndicator } from '../components/chat/ChatMessage';
import MessageInput, { ConnectionStatus } from '../components/chat/MessageInput';
import GroupDrawer from '../components/chat/GroupDrawer';

export default function GroupChatPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user: currentUser } = useUser();
    const { 
        isConnected, 
        isReconnecting, 
        joinGroup, 
        leaveGroup, 
        sendMessage, 
        toggleReadyStatus,
        startRide,
        on, 
        off,
        sendTyping,
        stopTyping 
    } = useSocket();
    const groupId = location.state?.groupId;

    // State management
    const [group, setGroup] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);

    // Refs
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Scroll to bottom function
    const scrollToBottom = (behavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    // Check if user is at bottom of chat
    const checkIfAtBottom = () => {
        if (!messagesContainerRef.current) return true;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        return scrollHeight - scrollTop - clientHeight < 100;
    };

    // Handle scroll
    const handleScroll = () => {
        const atBottom = checkIfAtBottom();
        setIsAtBottom(atBottom);
        if (atBottom) {
            setShowNewMessageIndicator(false);
        }
    };

    // Socket.io setup (listeners)
    useEffect(() => {
        if (!groupId) {
            setError('Group ID missing');
            setLoading(false);
            return;
        }

        // Join the group room
        if (isConnected) {
            joinGroup(groupId);
        }

        // Set up event listeners
        const handleReceiveMessage = (msg) => {
            setMessages((prev) => [...prev, msg]);
            
            // Show new message indicator if not at bottom
            if (!checkIfAtBottom()) {
                setShowNewMessageIndicator(true);
            } else {
                setTimeout(() => scrollToBottom('smooth'), 100);
            }
        };

        const handleGroupUpdate = (updatedGroup) => {
            setGroup((prev) => ({ ...prev, ...updatedGroup }));
        };

        const handleReadyStatusUpdate = (data) => {
            setGroup((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    members: prev.members.map(member => {
                        const updatedMember = data.members.find(m => m.user === member.user._id);
                        return updatedMember ? { ...member, isReady: updatedMember.isReady } : member;
                    })
                };
            });
        };

        const handleUserTyping = (data) => {
            setTypingUsers((prev) => {
                if (!prev.includes(data.userName)) {
                    return [...prev, data.userName];
                }
                return prev;
            });
            
            // Remove typing indicator after 3 seconds
            setTimeout(() => {
                setTypingUsers((prev) => prev.filter(name => name !== data.userName));
            }, 3000);
        };

        // Register event listeners
        on('receive-message', handleReceiveMessage);
        on('group-update', handleGroupUpdate);
        on('group-ready-status-updated', handleReadyStatusUpdate);
        on('user-typing', handleUserTyping);

        // Cleanup
        return () => {
            if (groupId) {
                leaveGroup(groupId);
            }
            off('receive-message', handleReceiveMessage);
            off('group-update', handleGroupUpdate);
            off('group-ready-status-updated', handleReadyStatusUpdate);
            off('user-typing', handleUserTyping);
        };
    }, [groupId, isConnected]);

    // Fetch group and messages
    useEffect(() => { 
        if (!groupId) return;

        const fetchData = async () => {
            try {
                setLoading(true);
                
                // Fetch group details
                const groupRes = await axios.get(`/groups/${groupId}`);
                setGroup(groupRes.data.group);

                // Fetch messages
                const messagesRes = await axios.get(`/groups/${groupId}/messages`);
                setMessages(messagesRes.data.messages || []);

                setLoading(false);
                setTimeout(() => scrollToBottom('auto'), 100);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load group data');
                setLoading(false);
            }
        };

        fetchData();
    }, [groupId]);

    // Scroll to bottom on new messages if already at bottom
    useEffect(() => {
        if (isAtBottom && messages.length > 0) {
            setTimeout(() => scrollToBottom('smooth'), 100);
        }
    }, [messages]);

    // Handle send message
    const handleSendMessage = (content) => {
        if (content.trim()) {
            sendMessage(groupId, content.trim());

            // Emit typing stopped
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        }
    };

    // Handle ready toggle
    const handleReadyClick = () => {
        toggleReadyStatus(groupId);
        setGroup((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    members: prev.members.map(member => {
                        return currentUser && member.user._id === currentUser._id ? { ...member, isReady: !member.isReady } : member;
                    })
                };
            });
    };

    // Handle start ride
    const handleStartClick = () => {
        startRide(groupId);
    };

    // Handle typing indicator
    const handleTyping = () => {
        if (currentUser?.fullName) {
            sendTyping(groupId, currentUser.fullName);
            
            // Clear previous timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            
            // Set new timeout
            typingTimeoutRef.current = setTimeout(() => {
                stopTyping(groupId, currentUser.fullName);
            }, 1000);
        }
    };

    // Handle leave group
    const handleLeaveGroup = async () => {
        if (!window.confirm('Are you sure you want to leave this group?')) return;
        
        try {
            await axios.post('/groups/leave', { groupId });
            navigate('/');
        } catch (err) {
            console.error('Error leaving group:', err);
            alert('Failed to leave group');
        }
    };

    // Group messages by date
    const groupMessagesByDate = (messages) => {
        const grouped = [];
        let currentDate = null;

        messages.forEach((message, index) => {
            const messageDate = new Date(message.createdAt).toDateString();
            
            if (messageDate !== currentDate) {
                grouped.push({ type: 'date', date: message.createdAt });
                currentDate = messageDate;
            }

            // Check if this is the last message in a group from the same sender
            const nextMessage = messages[index + 1];
            const isLastInGroup = !nextMessage || 
                nextMessage.sender._id !== message.sender._id ||
                new Date(nextMessage.createdAt).getTime() - new Date(message.createdAt).getTime() > 60000;

            grouped.push({ type: 'message', message, isLastInGroup });
        });

        return grouped;
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading group...</p>
                </div>
            </div>
        );
    }

    if (error || !group) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="text-6xl mb-4">😕</div>
                    <p className="text-xl text-gray-800 font-semibold mb-2">Oops!</p>
                    <p className="text-gray-600 mb-4">{error || 'Group not found'}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    const groupedMessages = groupMessagesByDate(messages);

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <GroupHeader
                group={group}
                currentUser={currentUser}
                onLeaveGroup={handleLeaveGroup}
                onReady={handleReadyClick}
                onStart={handleStartClick}
                onShowGroupInfo={() => setIsDrawerOpen(true)}
            />

            {/* Chat Messages Area */}
            <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 py-6 space-y-1"
                style={{ scrollBehavior: 'smooth' }}
            >
                {groupedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <div className="text-6xl mb-4">💬</div>
                        <p className="text-lg font-medium">No messages yet</p>
                        <p className="text-sm">Be the first to send a message!</p>
                    </div>
                ) : (
                    groupedMessages.map((item, index) => {
                        if (item.type === 'date') {
                            return <DateSeparator key={`date-${index}`} date={item.date} />;
                        } else {
                            return (
                                <ChatMessage
                                    key={item.message._id || index}
                                    message={item.message}
                                    currentUser={currentUser}
                                    isLastInGroup={item.isLastInGroup}
                                />
                            );
                        }
                    })
                )}
                
                {/* Typing Indicator */}
                <TypingIndicator typingUsers={typingUsers.filter(name => name !== currentUser?.fullName)} />
                
                <div ref={messagesEndRef} />
            </div>

            {/* New Message Indicator */}
            {showNewMessageIndicator && !isAtBottom && (
                <NewMessageIndicator onClick={() => {
                    scrollToBottom('smooth');
                    setShowNewMessageIndicator(false);
                }} />
            )}

            {/* Connection Status */}
            <ConnectionStatus isConnected={isConnected} isReconnecting={isReconnecting} />

            {/* Message Input */}
            <MessageInput
                onSendMessage={handleSendMessage}
                disabled={!isConnected}
                placeholder={isConnected ? "Type a message..." : "Connecting..."}
            />

            {/* Group Drawer */}
            <GroupDrawer
                group={group}
                currentUser={currentUser}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onAcceptInvite={(inviteId) => {
                    // Handle accept invite
                    console.log('Accept invite:', inviteId);
                }}
                onRejectInvite={(inviteId) => {
                    // Handle reject invite
                    console.log('Reject invite:', inviteId);
                }}
                onRemoveMember={(userId) => {
                    // Handle remove member
                    console.log('Remove member:', userId);
                }}
            />
        </div>
    );
}
