import { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

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

    useEffect(() => {
        // Create socket connection
        const newSocket = io();
        socketRef.current = newSocket;
        setSocket(newSocket);

        // Connection event handlers
        newSocket.on('connect', () => {
            console.log('Socket connected:', newSocket.id);
            setIsConnected(true);
            setIsReconnecting(false);
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
    }, []);

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
