import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, MoreVertical, Users, Clock, Crown, Timer, Navigation as NavIcon } from 'lucide-react';

export default function GroupHeader({ group, currentUser, onLeaveGroup, onReady, onStart, onShowGroupInfo, countdownEndTime, onBack }) {
    
    const navigate = useNavigate();
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [countdown, setCountdown] = useState(null);

    // Countdown timer effect
    useEffect(() => {
        if (!countdownEndTime) {
            setCountdown(null);
            return;
        }

        const updateCountdown = () => {
            const remaining = Math.max(0, Math.ceil((countdownEndTime - Date.now()) / 1000));
            setCountdown(remaining);
            
            if (remaining === 0) {
                setCountdown(null);
            }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 100);

        return () => clearInterval(interval);
    }, [countdownEndTime]);

    if (!group) return null;

    const members = Array.isArray(group.members) ? group.members : [];
    const adminId = typeof group.admin === 'string' ? group.admin : group.admin?._id;
    const isAdmin = Boolean(currentUser?._id && adminId && adminId === currentUser._id);
    
    const isReady = members.some(member => member.user?._id === currentUser?._id && member.isReady === true);

    const handleShowOnMap = () => {
        navigate('/ride-map', { state: { groupId: group._id, group, currentUser } });
    };

    const handleShowNavigation = () => {
        navigate('/navigation', { state: { groupId: group._id, group } });
    }

    return (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md z-20 relative flex-shrink-0">
            
            {/* =======================
                TOP ROW: Title & Menu
               ======================= */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    
                    {/* Back Button - Visible ONLY on Mobile */}
                    <button
                        onClick={onBack} // Or pass a prop if using state-based navigation
                        className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0 md:hidden"
                        aria-label="Go back"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h1 className="text-lg md:text-xl font-bold truncate">{group.name}</h1>
                            {isAdmin && (
                                <span className="hidden sm:inline-flex items-center gap-1 bg-yellow-400/20 px-2 py-0.5 rounded text-[10px] text-yellow-200 border border-yellow-400/30">
                                    <Crown size={10} /> ADMIN
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Options Menu */}
                <div className="relative flex-shrink-0">
                    <button
                        onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <MoreVertical size={24} />
                    </button>
                    
                    {showOptionsMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowOptionsMenu(false)}></div>
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white text-gray-800 rounded-lg shadow-xl z-50 py-2 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                                <button
                                    onClick={() => { setShowOptionsMenu(false); onShowGroupInfo?.(); }}
                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-2"
                                >
                                    <Users size={16} className="text-gray-500"/> Group Details
                                </button>
                                <div className="border-t my-1"></div>
                                <button
                                    onClick={() => { setShowOptionsMenu(false); onLeaveGroup?.(); }}
                                    className="w-full px-4 py-3 text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
                                >
                                    <ArrowLeft size={16} /> Leave Group
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* =======================
                BOTTOM ROW: Avatars & Actions
               ======================= */}
            <div className="px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* 1. Avatars Section */}
                <div className="flex items-center justify-between md:justify-start gap-4">
                    <div className="flex -space-x-2 overflow-hidden py-1">
                        {members.slice(0, 5).map((member, idx) => {
                            const memberUser = member.user || {};
                            return (
                                <div key={member._id || idx} className="relative flex-shrink-0 transition-transform hover:z-10 hover:scale-110">
                                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-indigo-400 flex items-center justify-center text-white font-bold text-xs border-2 border-indigo-600 overflow-hidden">
                                        {memberUser.avatar ? (
                                            <img src={memberUser.avatar} alt="user" className="w-full h-full object-cover" />
                                        ) : (
                                            memberUser.fullName?.charAt(0).toUpperCase() || '?'
                                        )}
                                    </div>
                                    {/* Status Dot */}
                                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-indigo-600 ${member.isReady ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                                </div>
                            );
                        })}
                        {members.length > 5 && (
                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white font-medium text-xs border-2 border-white/20">
                                +{members.length - 5}
                            </div>
                        )}
                    </div>
                    
                    <button onClick={onShowGroupInfo} className="md:hidden text-xs bg-white/10 px-2 py-1 rounded-full whitespace-nowrap">
                        View all
                    </button>
                </div>

                {/* 2. Actions Scrollable Container 
                    - Mobile: Scrollable horizontal row
                    - Desktop: Flex row
                */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide no-scrollbar w-full md:w-auto md:justify-end">
                    
                    {/* Toggle Ready */}
                    {group.status !== 'closed' && (
                        <button
                            onClick={onReady}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap shadow-sm
                                ${isReady 
                                    ? 'bg-white text-indigo-700 hover:bg-gray-100' 
                                    : 'bg-white/20 hover:bg-white/30 text-white'}`}
                        >
                            {isReady ? <><div className="w-2 h-2 rounded-full bg-green-500" /> Ready</> : 'Mark Ready'}
                        </button>
                    )}

                    {/* Map Buttons */}
                    <button
                        onClick={handleShowOnMap}
                        className="bg-white/20 hover:bg-white/30 px-3 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                        <MapPin size={16} /> <span className="hidden sm:inline">Map</span>
                    </button>

                    {group.status === 'closed' && ( 
                        <button 
                            onClick={handleShowNavigation}
                            className="bg-green-500/90 hover:bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 whitespace-nowrap shadow-lg"
                        >
                            <NavIcon size={16} /> Navigate
                        </button>
                    )}

                    {/* Status / Start Button */}
                    <div className="ml-auto md:ml-2 pl-2 border-l border-white/20">
                        {countdown !== null ? (
                            <div className="bg-yellow-400 text-yellow-900 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap animate-pulse shadow-lg">
                                <Timer size={16} />
                                {countdown}s
                            </div>
                        ) : group.status === 'open' ? (
                            <button
                                onClick={onStart}
                                disabled={!isAdmin}
                                className={`px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-md ${
                                    isAdmin 
                                        ? 'bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-white transform hover:scale-105' 
                                        : 'bg-white/10 cursor-not-allowed text-white/50'
                                }`}
                            >
                                {isAdmin ? 'Start Ride' : 'Waiting...'}
                            </button>
                        ) : (
                            <div className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 whitespace-nowrap ${
                                group.status === 'locked' ? 'bg-orange-500/90' : 'bg-red-500/90'
                            }`}>
                                <Clock size={16} />
                                {group.status === 'locked' ? 'Locked' : 'Closed'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}