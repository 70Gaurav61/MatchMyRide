import { Check, CheckCheck, AlertCircle } from 'lucide-react';

export default function ChatMessage({ message, currentUser, isLastInGroup }) {
    const isOwnMessage = message.sender._id === currentUser?._id;
    
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const getDeliveryStatus = () => {
        // Future: track delivery status
        // For now, assume all messages are delivered
        if (message.failed) {
            return <AlertCircle size={14} className="text-red-400" />;
        }
        if (message.read) {
            return <CheckCheck size={14} className="text-blue-400" />;
        }
        if (message.delivered) {
            return <CheckCheck size={14} className="text-gray-400" />;
        }
        if (message.sent) {
            return <Check size={14} className="text-gray-400" />;
        }
        return <Check size={14} className="text-gray-300" />;
    };

    return (
        <div className={`flex gap-3 mb-4 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} ${isLastInGroup ? '' : 'mb-1'}`}>
            {/* Profile Picture */}
            {!isOwnMessage && (
                <div className={`flex-shrink-0 ${isLastInGroup ? '' : 'invisible'}`}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                        {message.sender?.avatar ? (
                            <img
                                src={message.sender.avatar} alt={message.sender.fullName} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <>
                                    {message.sender.fullName?.charAt(0).toUpperCase() || '?'}
                                </> 
                        )}
                    </div>
                </div>
            )}

            {/* Message Bubble */}
            <div className={`flex flex-col max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                {/* Sender Name (only for other's messages and first in group) */}
                {!isOwnMessage && isLastInGroup && (
                    <span className="text-xs text-gray-600 font-medium mb-1 px-1">
                        {message.sender.fullName}
                    </span>
                )}

                {/* Message Content */}
                <div
                    className={`px-4 py-2 rounded-2xl shadow-sm ${
                        isOwnMessage
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-md'
                            : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
                    }`}
                >
                    <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                    </p>
                </div>

                {/* Timestamp and Status */}
                <div className={`flex items-center gap-1 mt-1 px-1 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-xs text-gray-500">
                        {formatTime(message.createdAt)}
                    </span>
                    {isOwnMessage && (
                        <span className="flex items-center">
                            {getDeliveryStatus()}
                        </span>
                    )}
                </div>
            </div>

            {/* Spacer for own messages to maintain alignment */}
            {isOwnMessage && (
                <div className="w-10 flex-shrink-0"></div>
            )}
        </div>
    );
}

export function DateSeparator({ date }) {
    const formatDate = (dateStr) => {
        const msgDate = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        // Reset time parts for comparison
        today.setHours(0, 0, 0, 0);
        yesterday.setHours(0, 0, 0, 0);
        msgDate.setHours(0, 0, 0, 0);

        if (msgDate.getTime() === today.getTime()) {
            return 'Today';
        } else if (msgDate.getTime() === yesterday.getTime()) {
            return 'Yesterday';
        } else {
            return msgDate.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: msgDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    };

    return (
        <div className="flex items-center justify-center my-4">
            <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full shadow-sm">
                {formatDate(date)}
            </div>
        </div>
    );
}

export function TypingIndicator({ typingUsers }) {
    if (!typingUsers || typingUsers.length === 0) return null;

    const getTypingText = () => {
        if (typingUsers.length === 1) {
            return `${typingUsers[0]} is typing`;
        } else if (typingUsers.length === 2) {
            return `${typingUsers[0]} and ${typingUsers[1]} are typing`;
        } else {
            return 'Multiple people are typing';
        }
    };

    return (
        <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-10 h-10 flex-shrink-0"></div>
            <div className="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-2xl">
                <span className="text-sm text-gray-600">{getTypingText()}</span>
                <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
            </div>
        </div>
    );
}

export function NewMessageIndicator({ onClick }) {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 text-sm font-medium animate-bounce"
        >
            <span>↓</span>
            <span>New messages</span>
        </button>
    );
}
