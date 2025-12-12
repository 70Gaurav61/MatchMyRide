import { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useUser } from './UserContext';

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const socketRef = useRef(null);
    const { user } = useUser();
    const userRef = useRef(user);

    // Keep userRef updated
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        // Create socket connection
        const socketUrl = import.meta.env.VITE_APP_API_URL ? import.meta.env.VITE_APP_API_URL.replace('/api/v1', '') : 'http://localhost:3000';

        const newSocket = io(socketUrl, {
            withCredentials: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
            transports: ['websocket', 'polling']
        });
        socketRef.current = newSocket;
        setSocket(newSocket);

        // Connection event handlers
        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setIsConnected(true);
            setIsReconnecting(false);
            
            // Register user to their personal room for receiving invites
            if (userRef.current?._id) {
                console.log('Registering user to room:', userRef.current._id);
                newSocket.emit('register', userRef.current._id);
            }
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            setIsConnected(false);
        });

        newSocket.on('reconnect_attempt', (attemptNumber) => {
            console.log('Reconnection attempt:', attemptNumber);
            setIsReconnecting(true);
        });

        newSocket.on('reconnect', (attemptNumber) => {
            console.log('Socket reconnected after', attemptNumber, 'attempts');
            setIsConnected(true);
            setIsReconnecting(false);
            
            // Re-register user after reconnection
            if (userRef.current?._id) {
                console.log('Re-registering user to room:', userRef.current._id);
                newSocket.emit('register', userRef.current._id);
            }
        });

        newSocket.on('reconnect_failed', () => {
            console.log('Socket reconnection failed');
            setIsReconnecting(false);
        });

        newSocket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        // Cleanup on unmount
        return () => {
            console.log('Cleaning up socket connection');
            newSocket.removeAllListeners();
            newSocket.disconnect();
        };
    }, []); // Empty dependency array - socket created only once

    // Socket methods
    const emit = (event, data) => {
        if (socketRef.current && isConnected) {
            socketRef.current.emit(event, data);
            return true;
        }
        console.warn('Cannot emit: socket not connected');
        return false;
    };

    const on = (event, callback) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback);
        }
    };

    const off = (event, callback) => {
        if (socketRef.current) {
            if (callback) {
                socketRef.current.off(event, callback);
            } else {
                socketRef.current.off(event);
            }
        }
    };

    const joinGroup = (groupId) => {
        return emit('join-group', groupId);
    };

    const leaveGroup = (groupId) => {
        return emit('leave-group', groupId);
    };

    const sendMessage = (groupId, content) => {
        return emit('send-message', { groupId, content });
    };

    const toggleReadyStatus = (groupId) => {
        return emit('toggle-ready-status', { groupId });
    };

    const sendTyping = (groupId, userName) => {
        return emit('typing', { groupId, userName });
    };

    const stopTyping = (groupId, userName) => {
        return emit('stop-typing', { groupId, userName });
    };

    const startRide = (groupId) => {
        return emit('start-ride', { groupId });
    };

    const value = {
        socket: socketRef.current,
        isConnected,
        isReconnecting,
        // Event handlers
        emit,
        on,
        off,
        // Group-specific methods
        joinGroup,
        leaveGroup,
        sendMessage,
        toggleReadyStatus,
        sendTyping,
        stopTyping,
        startRide,
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketContext;
