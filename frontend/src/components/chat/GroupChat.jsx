import { useEffect, useState, useRef } from 'react';
import { useUser } from '../../context/useUser.js';
import { useSocket } from '../../context/useSocket.js';
import axios from '../../api/axiosInstance';
import { ArrowLeft } from 'lucide-react';

import GroupHeader from './GroupHeader';
import ChatMessage, { DateSeparator, TypingIndicator, NewMessageIndicator } from './ChatMessage';
import MessageInput, { ConnectionStatus } from './MessageInput';
import GroupDrawer from './GroupDrawer';

export default function GroupChat({ groupId, onBack }) {
    const { user: currentUser } = useUser();
    const { 
        isConnected, isReconnecting, joinGroup, leaveGroup, 
        sendMessage, toggleReadyStatus, startRide, 
        on, off, sendTyping, stopTyping 
    } = useSocket();

    // State
    const [group, setGroup] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [typingUsers, setTypingUsers] = useState([]);
    const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [countdownEndTime, setCountdownEndTime] = useState(null);

    // Refs
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const scrollToBottom = (behavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    const checkIfAtBottom = () => {
        if (!messagesContainerRef.current) return true;
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        return scrollHeight - scrollTop - clientHeight < 100;
    };

    const handleScroll = () => {
        const atBottom = checkIfAtBottom();
        setIsAtBottom(atBottom);
        if (atBottom) setShowNewMessageIndicator(false);
    };

    // 1. Socket Logic
    useEffect(() => {
        if (!groupId || !isConnected) return;

        // Join room
        if (isConnected) joinGroup(groupId);

        // Define Handlers
        const handleReceiveMessage = (msg) => {
            setMessages((prev) => [...prev, msg]);
            if (!checkIfAtBottom()) setShowNewMessageIndicator(true);
            else setTimeout(() => scrollToBottom('smooth'), 100);
        };

        const handleGroupUpdate = (data) => {
            if (data.group) {
                setGroup(data.group);
            }
        }
        
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
                if (!prev.includes(data.userName)) return [...prev, data.userName];
                return prev;
            });
            setTimeout(() => {
                setTypingUsers((prev) => prev.filter(name => name !== data.userName));
            }, 3000);
        };

        const handleRideStarted = (data) => {
            setCountdownEndTime(null);
            // In a component context, we might want to refresh data instead of reload page
             // fetchGroupData(); // Implementation depends on your preference
             window.location.reload(); 
        };

        const handleUserRemoved = (data) => {
           if (data.userId === currentUser?._id) {
               alert('You were removed from the group.');
               onBack(); // Go back to list instead of navigating away
           } else {
               // Refresh logic
           }
        };

        // Listeners
        on('receive-message', handleReceiveMessage);
        on('group-update', handleGroupUpdate);
        on('group-ready-status-updated', handleReadyStatusUpdate);
        on('user-typing', handleUserTyping);
        on('ride-started', handleRideStarted);
        on('user-removed', handleUserRemoved);

        return () => {
            leaveGroup(groupId);
            off('receive-message', handleReceiveMessage);
            off('group-update', handleGroupUpdate);
            off('group-ready-status-updated', handleReadyStatusUpdate);
            off('user-typing', handleUserTyping);
            off('ride-started', handleRideStarted);
            off('user-removed', handleUserRemoved);
        };
    }, [groupId, isConnected]);

    // 2. Fetch Data
    useEffect(() => {
        if (!groupId) return;
        const fetchData = async () => {
            try {
                setLoading(true);
                const groupRes = await axios.get(`/groups/${groupId}`);
                setGroup(groupRes.data.group);
                const messagesRes = await axios.get(`/groups/${groupId}/messages`);
                setMessages(messagesRes.data.messages || []);
                setLoading(false);
                setTimeout(() => scrollToBottom('auto'), 100);
            } catch (err) {
                setError('Failed to load data');
                setLoading(false);
            }
        };
        fetchData();
    }, [groupId]);

    // Helper functions
    const handleSendMessage = (content) => {
        if (content.trim()) {
            sendMessage(groupId, content.trim());
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        }
    };

    const handleTyping = () => {
        if (currentUser?.fullName) {
            sendTyping(groupId, currentUser.fullName);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => stopTyping(groupId, currentUser.fullName), 1000);
        }
    };

    const groupMessagesByDate = (msgs) => {
        const grouped = [];
        let currentDate = null;
        msgs.forEach((message, index) => {
            const messageDate = new Date(message.createdAt).toDateString();
            if (messageDate !== currentDate) {
                grouped.push({ type: 'date', date: message.createdAt });
                currentDate = messageDate;
            }
            const nextMessage = msgs[index + 1];
            const isLastInGroup = !nextMessage || nextMessage.sender._id !== message.sender._id || new Date(nextMessage.createdAt) - new Date(message.createdAt) > 60000;
            grouped.push({ type: 'message', message, isLastInGroup });
        });
        return grouped;
    };

    if (loading) return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
    if (error || !group) return <div className="h-full flex items-center justify-center text-error">{error || 'Group not found'}</div>;

    const groupedMessages = groupMessagesByDate(messages);

    return (
        <div className="flex flex-col h-full bg-background relative">
            {/* Custom Mobile Header Override (if needed) or injected back button */}
            <div className="hidden md:hidden flex items-center p-4 border-b bg-surface">
                 <button onClick={onBack} className="mr-3 p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft size={20} />
                 </button>
                 <span className="font-bold truncate">{group.name}</span>
            </div>

            {/* Existing Header - Passing props */}
            <div className="md:block">
                <GroupHeader 
                    group={group} 
                    currentUser={currentUser} 
                    onLeaveGroup={() => {}} // Handle logic
                    onReady={() => toggleReadyStatus(groupId)}
                    onStart={() => startRide(groupId)}
                    onShowGroupInfo={() => setIsDrawerOpen(true)}
                    countdownEndTime={countdownEndTime}
                    onBack={onBack}
                />
            </div>

            {/* Chat Area */}
            <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-6 space-y-1 scroll-smooth">
                {groupedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted">
                        <p>No messages yet.</p>
                    </div>
                ) : (
                    groupedMessages.map((item, index) => 
                        item.type === 'date' 
                        ? <DateSeparator key={`date-${index}`} date={item.date} /> 
                        : <ChatMessage key={item.message._id || index} message={item.message} currentUser={currentUser} isLastInGroup={item.isLastInGroup} />
                    )
                )}
                <TypingIndicator typingUsers={typingUsers.filter(n => n !== currentUser?.fullName)} />
                <div ref={messagesEndRef} />
            </div>

            {/* Indicators & Input */}
            {showNewMessageIndicator && !isAtBottom && <NewMessageIndicator onClick={() => scrollToBottom('smooth')} />}
            <ConnectionStatus isConnected={isConnected} isReconnecting={isReconnecting} />
            
            <MessageInput 
                onSendMessage={handleSendMessage} 
                onTyping={handleTyping}
                disabled={!isConnected} 
                placeholder={isConnected ? "Type a message..." : "Connecting..."} 
            />

            {/* Drawer */}
            <GroupDrawer 
                group={group} 
                currentUser={currentUser} 
                isOpen={isDrawerOpen} 
                onClose={() => setIsDrawerOpen(false)} 
                // ... pass other handlers
            />
        </div>
    );
}