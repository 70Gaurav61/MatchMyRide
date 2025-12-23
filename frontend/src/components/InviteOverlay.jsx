import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, X, ChevronDown, UserPlus } from 'lucide-react';
import { useUser } from '../context/useUser.js';
import { useSocket } from '../context/useSocket.js';
import axios from '../api/axiosInstance';

export default function InviteOverlay() {
    const { user } = useUser();
    const { on, off } = useSocket();
    
    // State
    const [invites, setInvites] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loadingAction, setLoadingAction] = useState(false);

    // 1. Fetch Offline/Pending Invites on Mount
    useEffect(() => {
        if (!user) return;

        const fetchPendingInvites = async () => {
            try {
                const res = await axios.get('/groups/my-invites');                
                setInvites(res.data.invites || []);
            } catch (err) {
                console.error("Failed to fetch pending invites", err);
            }
        };

        fetchPendingInvites();
    }, [user]);

    // 2. Listen for Real-Time Socket Events
    useEffect(() => {
        if (!user) return;

        const handleNewInvite = (data) => {
            // Check if invite already exists to prevent duplicates
            setInvites((prev) => {
                if (prev.find(inv => inv.groupId === data.groupId)) return prev;
                return [...prev, data];
            });
        };

        // Listen for both direct invites and admin join requests
        on('group-invite', handleNewInvite); 
        // on('join-request', handleNewInvite); // Add other event names as needed

        return () => {
            off('group-invite', handleNewInvite);
            // off('join-request', handleNewInvite);
        };
    }, [user, on, off]);

    // 3. Action Handler
    const handleInviteAction = async (invite, action) => {
        setLoadingAction(true);
        try {
            const url = action === 'accept' ? '/groups/accept-invite' : '/groups/reject-invite';
            
            // Adjust payload based on your backend needs (groupId or inviteId)
            await axios.post(url, { groupId: invite.groupId });
            // Remove from local state
            setInvites((prev) => prev.filter((inv) => (inv.groupId !== invite.groupId)));
            // Close if no invites left
            if (invites.length <= 1) setIsOpen(false);

        } catch (err) {
            console.error(err.response?.data?.message || 'Action failed');
        } finally {
            setLoadingAction(false);
        }
    };

    // Render Logic
    if (!user || invites.length === 0) return null;

    const currentInvite = invites[0]; // Always show the first one in queue

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col items-end pointer-events-none">
            {/* We use pointer-events-auto on the motion div so the user can click it, 
                but the container doesn't block clicks on the page behind it.
            */}
            
            <AnimatePresence mode='wait'>
                <motion.div
                    layout
                    initial={{ y: -50, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className={`
                        pointer-events-auto shadow-2xl overflow-hidden
                        ${isOpen ? 'bg-white rounded-2xl' : 'bg-gray-900 text-white rounded-full'}
                    `}
                    style={{ 
                        // Dynamic width based on state
                        width: isOpen ? 320 : 'auto',
                        cursor: 'pointer'
                    }}
                >
                    {/* =================================================
                        STATE 1: COLLAPSED (The Pill)
                       ================================================= */}
                    {!isOpen && (
                        <motion.div 
                            className="flex items-center gap-3 px-4 py-3"
                            onClick={() => setIsOpen(true)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            {/* Pulse Animation Indicator */}
                            <div className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                    {/* Show simple avatar stack */}
                                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center border border-gray-900 text-[10px]">
                                        {currentInvite.senderName?.charAt(0) || <UserPlus size={12}/>}
                                    </div>
                                </div>
                                <span className="text-sm font-medium">
                                    {invites.length} Pending Invite{invites.length > 1 ? 's' : ''}
                                </span>
                            </div>
                        </motion.div>
                    )}

                    {/* =================================================
                        STATE 2: EXPANDED (The Card)
                       ================================================= */}
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col"
                        >
                            {/* Header */}
                            <div 
                                className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 flex justify-between items-start text-white"
                                onClick={() => setIsOpen(false)}
                            >
                                <div>
                                    <h3 className="font-bold text-lg">Group Invite</h3>
                                    <p className="text-indigo-100 text-xs mt-1">
                                        {invites.length > 1 ? `+${invites.length - 1} more in queue` : 'New Request'}
                                    </p>
                                </div>
                                <button className="p-1 hover:bg-white/20 rounded-full transition-colors">
                                    <ChevronDown size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-5 bg-white">
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-xl shrink-0">
                                        {currentInvite.admin.avatar ? (
                                            <img src={currentInvite.admin.avatar} className="w-full h-full rounded-full object-cover"/>
                                        ) : (
                                            currentInvite.admin.fullName?.charAt(0) || '?'
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-gray-900 font-semibold">
                                            {currentInvite.admin.fullName || 'Someone'}
                                        </p>
                                        <p className="text-gray-500 text-sm leading-snug">
                                            invited you to join <span className="text-indigo-600 font-medium">{currentInvite.groupName || 'a group'}</span>.
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        disabled={loadingAction}
                                        onClick={() => handleInviteAction(currentInvite, 'reject')}
                                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors text-sm"
                                    >
                                        <X size={16} /> Decline
                                    </button>
                                    <button
                                        disabled={loadingAction}
                                        onClick={() => handleInviteAction(currentInvite, 'accept')}
                                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 text-white hover:bg-black font-medium transition-colors text-sm shadow-lg hover:shadow-xl"
                                    >
                                        {loadingAction ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Check size={16} /> Accept
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}