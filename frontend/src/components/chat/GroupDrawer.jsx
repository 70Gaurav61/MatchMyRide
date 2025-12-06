import { X, Crown, MapPin, Calendar, Clock, User, Users, CheckCircle, XCircle, UserPlus, UserMinus } from 'lucide-react';

export default function GroupDrawer({ group, currentUser, isOpen, onClose, onAcceptInvite, onRejectInvite, onRemoveMember }) {
    if (!isOpen) return null;

    const isAdmin = currentUser && group.admin._id === currentUser._id;
    const userInvite = group.invites?.find(inv => inv.user._id === currentUser._id);

    const formatDateTime = (datetime) => {
        if (!datetime) return '';
        const date = new Date(datetime);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get ride details of current user from member
    const rideDetails = group.members && group.members.length > 0 ? group.members.find(m => m.user._id === currentUser._id)?.ride : null;

    return (
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Drawer Panel */}
            <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between shadow-md">
                    <h2 className="text-xl font-bold">Group Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        aria-label="Close drawer"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Group Info Section */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <Users size={20} className="text-indigo-600" />
                            Group Information
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div>
                                <label className="text-xs text-gray-500 font-medium">Group Name</label>
                                <p className="text-sm font-medium text-gray-800">{group.name}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">Created By</label>
                                <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                                    <Crown size={14} className="text-yellow-500" />
                                    {group?.admin?.fullName || 'Unknown'}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-medium">Status</label>
                                <p className="text-sm">
                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                        group.status === 'open' ? 'bg-green-100 text-green-800' :
                                        group.status === 'closed' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {group.status.toUpperCase()}
                                    </span>
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Ride Details Section */}
                    {rideDetails && (
                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <MapPin size={20} className="text-indigo-600" />
                                Ride Details
                            </h3>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <div>
                                    <label className="text-xs text-gray-500 font-medium">Route</label>
                                    <p className="text-sm font-medium text-gray-800">
                                        {rideDetails.source} → {rideDetails.destination}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium flex items-center gap-1">
                                            <Calendar size={12} />
                                            Date & Time
                                        </label>
                                        <p className="text-sm font-medium text-gray-800">
                                            {formatDateTime(rideDetails.datetime)}
                                        </p>
                                    </div>
                                </div>
                                {/* {rideDetails.sourceLocation && (
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium">Pickup Coordinates</label>
                                        <p className="text-xs text-gray-600 font-mono">
                                            {rideDetails.sourceLocation.coordinates[1].toFixed(6)}, {rideDetails.sourceLocation.coordinates[0].toFixed(6)}
                                        </p>
                                    </div>
                                )}
                                {rideDetails.destinationLocation && (
                                    <div>
                                        <label className="text-xs text-gray-500 font-medium">Drop Coordinates</label>
                                        <p className="text-xs text-gray-600 font-mono">
                                            {rideDetails.destinationLocation.coordinates[1].toFixed(6)}, {rideDetails.destinationLocation.coordinates[0].toFixed(6)}
                                        </p>
                                    </div>
                                )} */}
                            </div>
                        </section>
                    )}

                    {/* Members List Section */}
                    
                    <section>
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <Users size={20} className="text-indigo-600" />
                            Members ({group.members?.length || 0})
                        </h3>
                        <div className="space-y-2">
                            {group.members?.map((member) => {
                                const isMemberAdmin = member.user?._id === group.admin?._id;
                                const isReady = member.isReady === true;
                                
                                return (
                                    <div
                                        key={member.user._id}
                                        className="flex items-center justify-between bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shadow">
                                                {member.user?.avatar ? (
                                                <img
                                                    src={member.user.avatar} alt={member.user.fullName} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    <>
                                                        {member.user.fullName?.charAt(0).toUpperCase() || '?'}
                                                    </>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                                                    {member.user?.fullName}
                                                    {isMemberAdmin && (
                                                        <Crown size={14} className="text-yellow-500" />
                                                    )}
                                                </p>
                                                <p className={`text-xs ${isReady ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {isReady ? '✓ Ready' : 'Not Ready'}
                                                </p>
                                            </div>
                                        </div>
                                        
                                        {isAdmin && !isMemberAdmin && (
                                            <button
                                                onClick={() => onRemoveMember?.(member.user)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                aria-label="Remove member"
                                            >
                                                <UserMinus size={18} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Pending Invites for Current User */}
                    {userInvite && (
                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <User size={20} className="text-indigo-600" />
                                Your Pending Invite
                            </h3>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <p className="text-sm text-gray-700 mb-3">
                                    You have a pending invite to join this group.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onAcceptInvite?.(userInvite._id)}
                                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        <CheckCircle size={16} />
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => onRejectInvite?.(userInvite._id)}
                                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                                    >
                                        <XCircle size={16} />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Admin Controls Section */}
                    {isAdmin && (
                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Crown size={20} className="text-yellow-500" />
                                Admin Controls
                            </h3>
                            <div className="space-y-2">
                                <button
                                    className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-medium"
                                >
                                    <UserPlus size={18} />
                                    Add Member
                                </button>
                                {group.requests && group.requests.length > 0 && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                        <p className="text-sm text-blue-800 font-medium mb-2">
                                            {group.requests.length} Join Request(s) Pending
                                        </p>
                                        <button className="text-sm text-blue-600 hover:underline">
                                            Review Requests
                                        </button>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Future Feature Placeholder */}
                    <section className="opacity-50">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <MapPin size={20} className="text-indigo-600" />
                            Live Location Sharing
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-600 mb-3">
                                Share your real-time location with group members during the ride.
                            </p>
                            <button
                                disabled
                                className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed text-sm font-medium"
                            >
                                Coming Soon
                            </button>
                        </div>
                    </section>
                </div>
            </div>

            <style>{`
                @keyframes slide-in-right {
                    from {
                        transform: translateX(100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.3s ease-out;
                }
            `}</style>
        </>
    );
}
