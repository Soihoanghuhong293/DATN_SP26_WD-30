import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import './ChatWidget.css';

const QUICK_REPLIES = ['Xin chào', 'Tour có những gì?', 'Giá tour thế nào?', 'Liên hệ hỗ trợ'];

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; content: string }[]>([]);
  const [inputValue, setInputValue] = useState('');

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: text.trim() }]);

    // Placeholder - sẽ kết nối API chatbot sau
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content: 'Xin chào! Tôi là trợ lý hỗ trợ tour du lịch. Chức năng chatbot đang được phát triển.',
        },
      ]);
    }, 500);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');
    sendMessage(text);
  };

  const handleQuickReply = (text: string) => {
    sendMessage(text);
  };

  return (
    <>
      {/* Nút floating */}
      <button
        className="chat-widget-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Đóng chat' : 'Mở chat'}
      >
        <MessageCircle size={26} color="white" strokeWidth={2} />
        <span className="chat-widget-online-dot" />
      </button>

      {/* Khung chat */}
      {isOpen && (
        <div className="chat-panel">
          {/* Header */}
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div className="chat-header-avatar">
                <MessageCircle size={22} />
              </div>
              <div>
                <div className="chat-header-title">Hỗ trợ khách hàng</div>
                <div className="chat-header-status">
                  <span className="chat-status-dot" />
                  Trực tuyến
                </div>
              </div>
            </div>
            <button className="chat-header-close" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Vùng tin nhắn */}
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <p className="chat-welcome-text">
                  Xin chào! Chúng tôi có thể giúp gì cho bạn hôm nay? 🤗
                </p>
                <div className="chat-quick-replies">
                  {QUICK_REPLIES.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      className="chat-quick-reply"
                      onClick={() => handleQuickReply(reply)}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`chat-message ${msg.role}`}
                >
                  <div className="chat-bubble">{msg.content}</div>
                </div>
              ))
            )}
          </div>

          {/* Ô nhập tin nhắn */}
          <form className="chat-input-area" onSubmit={handleSend}>
            <div className="chat-input-wrapper">
              <input
                type="text"
                className="chat-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Nhập tin nhắn..."
              />
              <button type="submit" className="chat-send-btn" aria-label="Gửi">
                <Send size={20} />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
