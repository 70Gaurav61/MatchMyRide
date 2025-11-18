import { useState, useRef, useEffect } from 'react';
import { Send, Smile, Paperclip } from 'lucide-react';

export default function MessageInput({ onSendMessage, disabled = false, placeholder = "Type a message..." }) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef(null);

    const handleSend = () => {
        if (message.trim() && !disabled) {
            onSendMessage(message.trim());
            setMessage('');
            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
        }
    }, [message]);

    return (
        <div className="bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
            <div className="max-w-6xl mx-auto flex items-end gap-3">
                {/* Future: Attachment button */}
                <button
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 mb-1 opacity-50 cursor-not-allowed"
                    aria-label="Attach file (coming soon)"
                    disabled
                    title="Coming soon"
                >
                    <Paperclip size={22} />
                </button>

                {/* Message Input */}
                <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2 flex items-end gap-2">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={placeholder}
                        disabled={disabled}
                        rows={1}
                        className="flex-1 bg-transparent text-gray-800 placeholder-gray-500 resize-none outline-none max-h-[120px] text-sm py-1"
                        style={{ minHeight: '24px' }}
                    />
                    
                    {/* Future: Emoji picker */}
                    <button
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 opacity-50 cursor-not-allowed"
                        aria-label="Emoji (coming soon)"
                        disabled
                        title="Coming soon"
                    >
                        <Smile size={20} />
                    </button>
                </div>

                {/* Send Button */}
                <button
                    onClick={handleSend}
                    disabled={!message.trim() || disabled}
                    className={`p-3 rounded-full flex-shrink-0 transition-all mb-1 ${
                        message.trim() && !disabled
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:scale-105'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                    aria-label="Send message"
                >
                    <Send size={20} />
                </button>
            </div>

            {/* Character count or typing indicator could go here */}
        </div>
    );
}

export function ConnectionStatus({ isConnected, isReconnecting }) {
    if (isConnected) return null;

    return (
        <div className="bg-yellow-100 border-t border-yellow-200 px-4 py-2 text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-yellow-800">
                {isReconnecting ? (
                    <>
                        <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Reconnecting to server...</span>
                    </>
                ) : (
                    <>
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span>Connection lost. Trying to reconnect...</span>
                    </>
                )}
            </div>
        </div>
    );
}
