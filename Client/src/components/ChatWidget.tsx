import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { submitContactMessage } from '../services/chat';
import './ChatWidget.css';

/** Chat chỉ ở trạng thái OFFLINE: form để lại tin nhắn */

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  // Form offline
  const [offlineForm, setOfflineForm] = useState({ name: '', phone: '', content: '' });
  const [offlineSubmitting, setOfflineSubmitting] = useState(false);
  const [offlineSuccess, setOfflineSuccess] = useState(false);

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
        <span className="chat-widget-online-dot chat-status-offline" />
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
                  <span className="chat-status-dot chat-status-offline" />
                  Tiếp nhận tin nhắn
                </div>
              </div>
            </div>
            <button className="chat-header-close" onClick={() => setIsOpen(false)}>
              <X size={20} />
            </button>
          </div>

          {/* Vùng tin nhắn */}
          <div className="chat-messages">
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
                      Vui lòng để lại tin nhắn, chúng tôi sẽ liên hệ sớm nhất:
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
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
