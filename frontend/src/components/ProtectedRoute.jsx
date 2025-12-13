import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { Server, Coffee, Loader2, RefreshCw, AlertCircle } from 'lucide-react';

export default function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useUser();
    
    // State to track time stages
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const SHOW_DETAILED_THRESHOLD = 5; // Show detailed UI after 5 seconds
    const TIMEOUT_THRESHOLD = 60; // Show reload button after 50s of detailed UI (5 + 50)

    useEffect(() => {
        let interval;
        if (loading) {
            interval = setInterval(() => {
                setSecondsElapsed((prev) => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [loading]);

    // Calculate countdown for the detailed view
    const countdown = Math.max(0, TIMEOUT_THRESHOLD - secondsElapsed);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                
                {/* Background Decoration (Always present) */}
                <motion.div 
                    animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute inset-0 bg-gradient-to-tr from-indigo-100/50 via-transparent to-purple-100/50 pointer-events-none"
                />

                <AnimatePresence mode="wait">
                    
                    {/* STAGE 1: SIMPLE LOADER (0s - 5s) */}
                    {secondsElapsed < SHOW_DETAILED_THRESHOLD && (
                        <motion.div
                            key="simple-loader"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-20 animate-pulse rounded-full"></div>
                                <div className="bg-white p-4 rounded-full shadow-sm border border-indigo-50 relative z-10">
                                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm font-medium animate-pulse">Loading...</p>
                        </motion.div>
                    )}

                    {/* STAGE 2: DETAILED SERVER WAKING UI (5s - 55s) */}
                    {secondsElapsed >= SHOW_DETAILED_THRESHOLD && secondsElapsed < TIMEOUT_THRESHOLD && (
                        <motion.div 
                            key="detailed-loader"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5 }}
                            className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative z-10"
                        >
                            {/* Top Accent Line */}
                            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                            <div className="p-8">
                                {/* Icon Section */}
                                <div className="flex justify-center mb-6 relative">
                                    <motion.div 
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.1, 0.2] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute inset-0 bg-indigo-500 rounded-full blur-xl"
                                    />
                                    <div className="relative bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                        <Server className="w-10 h-10 text-indigo-600" />
                                        <motion.div 
                                            animate={{ y: [-2, 2, -2] }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                            className="absolute -right-2 -top-2 bg-orange-100 text-orange-600 p-1.5 rounded-full border border-white shadow-sm"
                                        >
                                            <Coffee size={14} />
                                        </motion.div>
                                    </div>
                                </div>

                                {/* Text Content */}
                                <div className="text-center space-y-3 mb-8">
                                    <h2 className="text-xl font-bold text-gray-900">
                                        Waking up the server
                                    </h2>
                                    <p className="text-sm text-gray-500 leading-relaxed">
                                        Our backend is hosted on Render's free tier. It goes to sleep when inactive to save energy.
                                    </p>
                                    
                                    {/* Timer Badge */}
                                    <div className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg text-xs font-bold inline-flex items-center gap-2">
                                        <Loader2 size={12} className="animate-spin" />
                                        Estimated wait: {countdown}s
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                                        <span>Spinning up</span>
                                        <span>Almost there</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden relative">
                                        <motion.div
                                            className="absolute top-0 bottom-0 left-0 bg-indigo-600 rounded-full w-1/3"
                                            animate={{ x: ["-100%", "350%"] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                    {secondsElapsed >= SHOW_DETAILED_THRESHOLD && secondsElapsed < TIMEOUT_THRESHOLD && (
                        <p className="mt-6 text-xs text-gray-400 text-center max-w-xs mx-auto">
                            This usually only happens on the first load of the day. Thanks for your patience!
                        </p>
                    )}


                    {/* STAGE 3: TIMEOUT / RELOAD UI (55s+) */}
                    {secondsElapsed >= TIMEOUT_THRESHOLD && (
                        <motion.div
                            key="timeout-ui"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden relative z-10 p-8 text-center"
                        >
                            <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
                                <AlertCircle size={32} />
                            </div>
                            
                            <h2 className="text-xl font-bold text-gray-900 mb-2">
                                Taking longer than expected
                            </h2>
                            <p className="text-gray-500 text-sm mb-6">
                                The server might be experiencing heavy traffic or a cold start delay. Please try refreshing the connection.
                            </p>

                            <button 
                                onClick={() => window.location.reload()}
                                className="w-full bg-gray-700 hover:bg-black text-white py-3 px-6 rounded-xl font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95 cursor-pointer"
                            >
                                <RefreshCw size={18} />
                                Reload Page
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}