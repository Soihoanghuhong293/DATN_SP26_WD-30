import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { sendChatMessage, submitContactMessage } from '../services/chat';
import './ChatWidget.css';

/** Online 8h-22h (giờ địa phương). Offline = form để lại tin nhắn. VITE_CHAT_ONLINE=true/false để ghi đè */
function getIsChatOnline(): boolean {
  const force = (import.meta as any)?.env?.VITE_CHAT_ONLINE;
  if (force === 'true') return true;
  if (force === 'false') return false;
  const hour = new Date().getHours();
  return hour >= 8 && hour < 22; // 8h sáng - 10h tối
}

/** Gợi ý ban đầu khi chưa có tin nhắn (chỉ dùng khi online) */
const INITIAL_SUGGESTIONS = ['Xin chào', 'Tour có những gì?', 'Giá tour thế nào?', 'Liên hệ hỗ trợ'];

/**
 * Cây gợi ý: sau mỗi intent, hiển thị gợi ý tiếp theo để khách chọn
 * Khách chọn → gửi tin nhắn → bot trả lời → hiện gợi ý tương ứng intent mới
 */
const SUGGESTION_TREE: Record<string, string[]> = {
  initial: INITIAL_SUGGESTIONS,
  greeting: ['Đặt tour', 'Xem danh sách tour', 'Giá tour thế nào?', 'Liên hệ hỗ trợ'],
  'tour-list': ['Tour trong nước', 'Tour nước ngoài', 'Xem theo điểm đến', 'Đặt tour ngay'],
  'tour-price': ['Tour giá rẻ', 'Tour trung bình', 'Tour cao cấp', 'Gọi 0364902031 tư vấn'],
  booking: ['Đặt tour ngay', 'Xem hướng dẫn đặt tour', 'Liên hệ 0364902031', 'Quay lại trang Tour'],
  payment: ['Chuyển khoản', 'Tiền mặt', 'Ví điện tử', 'Liên hệ 0364902031'],
  'cancel-booking': ['Hủy tour', 'Đổi ngày đi', 'Gọi 0364902031', 'Xem chính sách'],
  contact: ['Gọi 0364902031', 'Email hỗ trợ', 'Địa chỉ văn phòng', 'Quay lại'],
  thanks: ['Đặt tour', 'Xem tour', 'Liên hệ khi cần'],
  schedule: ['Xem lịch tour', 'Đặt tour', 'Liên hệ 0364902031'],
  duration: ['Tour 1N2Đ', 'Tour 3N2Đ', 'Tour dài ngày', 'Liên hệ tư vấn'],
  'destination-provided': ['Gửi nơi xuất phát', 'Gửi tháng đi', 'Gọi 0364902031 đặt tour', 'Xem tour'],
  default: ['Xem danh sách tour', 'Giá tour', 'Liên hệ 0364902031'],
};

function getSuggestions(intentId: string | undefined): string[] {
  if (!intentId) return SUGGESTION_TREE.default;
  return SUGGESTION_TREE[intentId] ?? SUGGESTION_TREE.default;
}

const ChatWidget = () => {
  const isChatOnline = getIsChatOnline();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; content: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastIntentId, setLastIntentId] = useState<string | undefined>(undefined);

  // Form offline
  const [offlineForm, setOfflineForm] = useState({ name: '', phone: '', content: '' });
  const [offlineSubmitting, setOfflineSubmitting] = useState(false);
  const [offlineSuccess, setOfflineSuccess] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage = text.trim();
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);
    setLastIntentId(undefined);

    try {
      const res = await sendChatMessage(userMessage);
      const data = res.data?.data;
      const botContent = data?.response ?? 'Xin lỗi, không thể xử lý tin nhắn.';
      const intentId = data?.intentId;
      setMessages((prev) => [...prev, { role: 'bot', content: botContent }]);
      setLastIntentId(intentId);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: 'Xin lỗi, có lỗi xảy ra. Bạn vui lòng thử lại hoặc liên hệ hotline 0364902031.' },
      ]);
      setLastIntentId('default');
    } finally {
      setLoading(false);
    }
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

  const handleOfflineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, phone, content } = offlineForm;
    if (!name.trim() || !phone.trim() || !content.trim()) return;

    setOfflineSubmitting(true);
    try {
      const res = await submitContactMessage({ name: name.trim(), phone: phone.trim(), content: content.trim() });
      if (res.data?.success) {
        setOfflineSuccess(true);
        setOfflineForm({ name: '', phone: '', content: '' });
      } else {
        alert(res.data?.message || 'Gửi thất bại');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gửi thất bại. Vui lòng thử lại hoặc gọi 0364902031.');
    } finally {
      setOfflineSubmitting(false);
    }
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
        <span className={`chat-widget-online-dot ${!isChatOnline ? 'chat-status-offline' : ''}`} />
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
                  <span className={`chat-status-dot ${!isChatOnline ? 'chat-status-offline' : ''}`} />
                  {isChatOnline ? 'Trực tuyến' : 'Offline'}
                </div>
              </div>
            </div>
            <button className="chat-header-close" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Vùng tin nhắn */}
          <div className="chat-messages">
            {!isChatOnline ? (
              <div className="chat-welcome chat-offline-form">
                {offlineSuccess ? (
                  <div className="chat-offline-success">
                    <p className="chat-welcome-text">✓ Gửi tin nhắn thành công!</p>
                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>
                      Chúng tôi sẽ liên hệ sớm nhất. Trong lúc chờ, bạn có thể gọi 0364902031.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="chat-welcome-text">
                      Chúng tôi đang offline. Vui lòng để lại tin nhắn:
                    </p>
                    <form onSubmit={handleOfflineSubmit} className="chat-offline-fields">
                      <input
                        type="text"
                        placeholder="Họ và tên *"
                        value={offlineForm.name}
                        onChange={(e) => setOfflineForm((f) => ({ ...f, name: e.target.value }))}
                        required
                      />
                      <input
                        type="tel"
                        placeholder="Số điện thoại *"
                        value={offlineForm.phone}
                        onChange={(e) => setOfflineForm((f) => ({ ...f, phone: e.target.value }))}
                        required
                      />
                      <textarea
                        placeholder="Nội dung câu hỏi *"
                        rows={3}
                        value={offlineForm.content}
                        onChange={(e) => setOfflineForm((f) => ({ ...f, content: e.target.value }))}
                        required
                      />
                      <button type="submit" className="chat-offline-submit" disabled={offlineSubmitting}>
                        {offlineSubmitting ? 'Đang gửi...' : 'Gửi tin nhắn'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            ) : messages.length === 0 ? (
              <div className="chat-welcome">
                <p className="chat-welcome-text">
                  Xin chào! Chúng tôi có thể giúp gì cho bạn hôm nay? 🤗
                </p>
                <div className="chat-quick-replies">
                  {INITIAL_SUGGESTIONS.map((reply) => (
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
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={`chat-message ${msg.role}`}>
                    <div className="chat-bubble">{msg.content}</div>
                  </div>
                ))}
                {loading && (
                  <div className="chat-message bot">
                    <div className="chat-bubble">Đang xử lý...</div>
                  </div>
                )}
                {!loading && (
                  <div className="chat-quick-replies chat-quick-replies-inline">
                    {getSuggestions(lastIntentId).map((reply) => (
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
                )}
              </>
            )}
          </div>

          {/* Ô nhập tin nhắn - chỉ hiện khi online */}
          {isChatOnline && (
          <form className="chat-input-area" onSubmit={handleSend}>
            <div className="chat-input-wrapper">
              <input
                type="text"
                className="chat-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Nhập tin nhắn..."
              />
              <button type="submit" className="chat-send-btn" aria-label="Gửi" disabled={loading}>
                <Send size={20} />
              </button>
            </div>
          </form>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;
