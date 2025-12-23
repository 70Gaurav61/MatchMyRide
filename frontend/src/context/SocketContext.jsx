import { createContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useUser } from './useUser.js';
import { getAccessToken } from '../auth/tokenStore.js'
import { refreshAccessToken } from '../auth/refreshToken.js';

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(false);
    const socketRef = useRef(null);
    const { user, isAuthenticated } = useUser();
    const userRef = useRef(user);

    // Keep userRef updated
    useEffect(() => {
        userRef.current = user;
    }, [user]);

    useEffect(() => {
        // Create socket connection
        if (!isAuthenticated) {
            if (socketRef.current) {
                socketRef.current.removeAllListeners();
                socketRef.current.disconnect();
                socketRef.current = null;
                setIsConnected(false);
            }
            return;
        };

        if(socketRef.current) {
            return;
        }

        const socketUrl = import.meta.env.VITE_APP_API_URL 
            ? import.meta.env.VITE_APP_API_URL.replace('/api/v1', '') 
            : 'http://localhost:3000';

        const newSocket = io(socketUrl, {
            auth: {
                token: getAccessToken(),
            },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
            transports: ['websocket', 'polling']
        });
        socketRef.current = newSocket;

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

        newSocket.on('auth:token-expiring', async () => {
            try {
                console.log('Socket token expiring soon. Refreshing...');
                const newToken = await refreshAccessToken();
                window.dispatchEvent(new CustomEvent('auth:token-refreshed', { 
                    detail: { source: 'socket' } 
                }));

                newSocket.emit('session:refresh', { token: newToken });
                
                newSocket.auth.token = newToken;
                
            } catch (error) {
                console.error('Socket refresh failed:', error);
            }
        });

        const handleTokenRefresh = (e) => {
            // improve: if the event was triggered by axios then it is implied that access token has expired and our backend 
            // would have already invalidated the socket session. So we need to refresh it here.

            if(e.detail?.source === 'socket') {
                return;
            }

            const newToken = getAccessToken();
            console.log('Socket detected token refresh, syncing session...');

            if (newSocket.connected) {
                newSocket.emit('session:refresh', { token: newToken });
            }

            // If the socket disconnects 5 mins from now, it needs the NEW token to reconnect
            newSocket.auth.token = newToken; 
        };

        window.addEventListener('auth:token-refreshed', handleTokenRefresh);

        // Cleanup on unmount
        return () => {
            window.removeEventListener('auth:token-refreshed', handleTokenRefresh);
            newSocket.removeAllListeners();
            newSocket.disconnect();
            socketRef.current = null;
            setIsConnected(false);
            setIsReconnecting(false);
        };
    }, [isAuthenticated]);

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
