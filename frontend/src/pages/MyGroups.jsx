import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { Users, Search, ArrowLeft } from 'lucide-react'; // Icons
import GroupChat from '../components/chat/GroupChat'; // Import the component we created above

export default function MyGroups() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    
    const navigate = useNavigate();
    const location = useLocation();

    // 1. Fetch Groups
    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const res = await axiosInstance.get('/groups/my-groups');
                setGroups(res.data.groups || []);                
            } catch (err) {
                setError('Failed to load groups');
            } finally {
                setLoading(false);
            }
        };
        fetchGroups();
    }, []);

    // 2. Handle Initial State from Navigation (e.g., if redirected from Create Group)
    useEffect(() => {
        if (location.state?.groupId) {
            setSelectedGroupId(location.state.groupId);
        }
    }, [location.state]);

    // 3. Selection Handler
    const handleGroupSelect = (id) => {
        setSelectedGroupId(id);
    };

    return (
        <div className='bg-background h-screen w-full flex overflow-hidden relative'>
            
            {/* Custom Animation Styles */}
            <style>{`
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-in-right { animation: slideInRight 0.3s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
            `}</style>

            {/* =======================================================
               LEFT SIDE: GROUP LIST
               - Hidden on mobile IF a group is selected
               - Takes 1/3 width on desktop
            ======================================================== */}
            <div className={`
                flex flex-col w-full md:w-1/3 lg:w-1/4 border-r border-border bg-surface h-full z-10
                ${selectedGroupId ? 'hidden md:flex' : 'flex'}
            `}>
                {/* Header */}
                <div className="p-4 border-b border-border bg-surface sticky top-0 z-20">
                    <button 
                        onClick={() => navigate('/')} 
                        className="flex items-center text-sm text-muted hover:text-primary mb-4 transition-colors"
                    >
                        <ArrowLeft size={16} /> <span className="ml-2">Back to Dashboard</span>
                    </button>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-content">Chats</h2>
                    </div>
                    
                    {/* Search Bar Placeholder */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted h-4 w-4" />
                        <input 
                            type="text" 
                            placeholder="Search groups..." 
                            className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto">
                    {loading && (
                        <div className="flex flex-col items-center justify-center p-8 space-y-4">
                             {[1,2,3].map(i => (
                                 <div key={i} className="w-full h-16 bg-gray-100 animate-pulse rounded-lg"/>
                             ))}
                        </div>
                    )}

                    {!loading && groups.length === 0 && (
                        <div className="text-center p-8 text-muted">
                            <Users size={48} className="mx-auto mb-2 opacity-20" />
                            <p>You are not part of any groups.</p>
                        </div>
                    )}

                    <ul className="divide-y divide-border">
                        {groups.map((group, index) => {
                            // Mocking "Last message" data if your API doesn't provide it yet
                            // Ideally, your GET /groups/my-groups should return the last message
                            const isSelected = selectedGroupId === group._id;
                            
                            return (
                                <li
                                    key={group._id}
                                    onClick={() => handleGroupSelect(group._id)}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                    className={`
                                        w-full p-4 cursor-pointer transition-all duration-200 animate-slide-up hover:bg-gray-50
                                        ${isSelected ? 'bg-primary/5 border-l-4 border-primary' : 'border-l-4 border-transparent'}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Avatar */}
                                        <div className={`
                                            w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-lg font-bold
                                            ${isSelected ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'}
                                        `}>
                                            {group.name.charAt(0).toUpperCase()}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h3 className={`font-semibold truncate ${isSelected ? 'text-primary' : 'text-gray-800'}`}>
                                                    {group.name}
                                                </h3>
                                                {/* Timestamp Placeholder */}
                                                <span className="text-xs text-muted">
                                                    {new Date(group.createdAt).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted truncate">
                                                {group.members?.length} members • Tap to chat
                                            </p>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            {/* =======================================================
               RIGHT SIDE: CHAT INTERFACE
               - Desktop: Visible always (shows placeholder if null)
               - Mobile: Covers screen when group selected
            ======================================================== */}
            <div className={`
                bg-white h-full overflow-hidden relative
                ${selectedGroupId ? 'flex fixed w-full inset-0 z-50 md:static md:w-2/3 lg:w-3/4' : 'hidden md:flex md:w-2/3 lg:w-3/4 items-center justify-center'}
            `}>
                {selectedGroupId ? (
                    // This wrapper ensures the animation plays when the ID changes
                    <div key={selectedGroupId} className="w-full h-full animate-slide-in-right">
                        <GroupChat 
                            groupId={selectedGroupId} 
                            onBack={() => setSelectedGroupId(null)} 
                        />
                    </div>
                ) : (
                    // Empty State
                    <div className="text-center p-10 animate-fade-in opacity-50 flex flex-col items-center">
                        <div className="p-6 bg-gray-100 rounded-full mb-4">
                            <Users size={48} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-medium text-gray-800">Your Groups</h3>
                        <p className="text-gray-500 mt-2">Select a group to start chatting and tracking rides.</p>
                    </div>
                )}
            </div>
        </div>
    );
}