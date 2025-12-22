import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios, { setLogoutCallback } from '../api/axiosInstance.js';
import { setAccessToken, clearAccessToken } from "../auth/tokenStore.js";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Verify authentication with backend on mount
    useEffect(() => {
        const initializeUser = async () => {
            try {
                const res = await axios.get('/users/me');
                if (res.data.user) {
                    setUser(res.data.user);
                    setIsAuthenticated(true);
                }
            } catch (err) {
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                setLoading(false);
            }
        };

        initializeUser();
    }, []);

    const login = ({user: userData, accessToken, refreshToken}) => {
        localStorage.setItem('refreshToken', refreshToken);
        setAccessToken(accessToken);
        setUser(userData);
        setIsAuthenticated(true);
    };

    const logout = async () => {
        try {
            await axios.post('/users/logout', {});
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    useEffect(() => {
        setLogoutCallback(() => {
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem('refreshToken');
            clearAccessToken();
        })
    }, []);

    const updateUser = (userData) => {
        setUser(userData);
    };

    return (
        <UserContext.Provider value={{ user, isAuthenticated, loading, login, logout, updateUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};