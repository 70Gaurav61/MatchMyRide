import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, MoreVertical, Users, Clock, Calendar, Crown } from 'lucide-react';

export default function GroupHeader({ group, currentUser, onLeaveGroup, onReady, onStart, onShowGroupInfo }) {
    
    const navigate = useNavigate();
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);

    if (!group) return null;

    const members = Array.isArray(group.members) ? group.members : [];
    const adminId = typeof group.admin === 'string' ? group.admin : group.admin?._id;
    const isAdmin = Boolean(currentUser?._id && adminId && adminId === currentUser._id);
    
    
    // Get current user's ride for details
    const rideDetails = members.length > 0 ? members.find(member => member.user?._id === currentUser?._id)?.ride : null;
    const isReady = members.some(member => member.user?._id === currentUser?._id && member.isReady === true);

    const formatDateTime = (datetime) => {
        if (!datetime) return '';
        const date = new Date(datetime);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (datetime) => {
        if (!datetime) return '';
        const date = new Date(datetime);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (datetime) => {
        if (!datetime) return '';
        const date = new Date(datetime);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleShowOnMap = () => {
        // Navigate to map view page (to be implemented)
        navigate('/ride-map', { state: { groupId: group._id, group, rideDetails } });
    };

    return (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
            {/* Top Section - Back Button, Group Name, Options */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors flex-shrink-0"
                        aria-label="Go back"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold truncate">{group.name}</h1>
                        {isAdmin && (
                            <div className="flex items-center gap-1 text-xs text-yellow-300">
                                <Crown size={12} />
                                <span>Admin</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative flex-shrink-0">
                    <button
                        onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        aria-label="Group options"
                    >
                        <MoreVertical size={24} />
                    </button>
                    
                    {/* Options Dropdown Menu */}
                    {showOptionsMenu && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white text-gray-800 rounded-lg shadow-xl z-50 py-2">
                            <button
                                onClick={() => {
                                    setShowOptionsMenu(false);
                                    onShowGroupInfo?.();
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                            >
                                View Group Details
                            </button>
                            {/* <button
                                onClick={() => {
                                    setShowOptionsMenu(false);
                                    onShowMembers?.();
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                            >
                                Members List
                            </button> */}
                            <button
                                onClick={() => {
                                    setShowOptionsMenu(false);
                                    onLeaveGroup?.();
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 transition-colors"
                            >
                                Leave Group
                            </button>
                            {isAdmin && (
                                <>
                                    <div className="border-t my-2"></div>
                                    <div className="px-4 py-1 text-xs text-gray-500 font-semibold">Admin Options</div>
                                    <button
                                        onClick={() => {
                                            setShowOptionsMenu(false);
                                            // Handle add member
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                                    >
                                        Add Member
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowOptionsMenu(false);
                                            // Handle remove member
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                                    >
                                        Remove Member
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Ride Details Section
            {rideDetails && (
                <div className="px-4 py-3 space-y-2 border-b border-white/20">
                    <div className="flex items-center gap-2 text-sm">
                        <MapPin size={16} className="flex-shrink-0" />
                        <span className="truncate">
                            {rideDetails.source} → {rideDetails.destination}
                        </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            <span>{formatDate(rideDetails.datetime)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock size={14} />
                            <span>{formatTime(rideDetails.datetime)}</span>
                        </div>
                    </div>
                </div>
            )} */}

            {/* Members Avatars & Show on Map Button */}
            <div className="px-4 py-3 flex items-center justify-between gap-3">
                {/* Member Avatars */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex -space-x-2 overflow-x-auto max-w-xs scrollbar-hide">
                        {members.slice(0, 5).map((member, idx) => {
                            const memberUser = member.user || {};
                            const displayInitial = memberUser.fullName?.charAt(0).toUpperCase() || '?';
                            return (
                                <div key={member._id || memberUser._id || idx} className="relative flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-semibold text-sm border-2 border-white overflow-hidden">
                                        {memberUser.avatar ? (
                                            <img
                                                src={memberUser.avatar} alt={memberUser.fullName} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            displayInitial
                                        )}
                                    </div>
                                    {/* Ready status indicator */}
                                    {member.isReady && (
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                                    )}
                                    {!member.isReady && (
                                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
                                    )}
                                </div>
                            );
                        })}
                        {members.length > 5 && (
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-xs border-2 border-white flex-shrink-0">
                                +{members.length - 5}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onShowGroupInfo}
                        className="text-xs hover:underline whitespace-nowrap flex items-center gap-1"
                    >
                        <Users size={14} />
                        {members.length}
                    </button>
                </div>

                {/* Toggle Ready Button */}
                
                <button
                    onClick={onReady}
                    disabled={group.status !== 'open'}
                    className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                    {isReady ? 'Mark Not Ready' : 'Mark Ready'}
                </button>

                {/* Show on Map Button */}
                <button
                    onClick={handleShowOnMap}
                    className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                    <MapPin size={16} />
                    Show on Map
                </button>

                {/* Start Button */}
                {(isAdmin && <button
                    onClick={onStart}
                    disabled={group.status !== 'open'}
                    className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer"
                >
                    {group.status === 'open' ? 'Start' : 'In Progress'}
                </button>)}
            </div>
        </div>
    );
}
