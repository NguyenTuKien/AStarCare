import { useState, useRef, useEffect } from 'react'
import { Plus, Mic, Send, Image as ImageIcon, Settings, ThumbsUp, ThumbsDown, Copy, User } from 'lucide-react'

function MainChat({ onOpenSettings, activeSession, onSendMessage }) {
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [recognition, setRecognition] = useState(null)
  const [selectedImages, setSelectedImages] = useState([])
  
  const menuRef = useRef(null)
  const profileMenuRef = useRef(null)
  const fileInputRef = useRef(null)
  const chatEndRef = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages])

  // Setup SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'vi-VN';

      rec.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setInputValue(prev => prev + finalTranscript + ' ');
        }
      };

      rec.onend = () => setIsListening(false);
      rec.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      alert("Trình duyệt của bạn không hỗ trợ nhận diện giọng nói (Vui lòng sử dụng Chrome).");
      return;
    }
    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (e) {
        console.error('Mic start error:', e);
        setIsListening(false);
      }
    }
  };

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowPlusMenu(false)
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSend = async () => {
    if (isSending) return;
    if (!inputValue.trim() && selectedImages.length === 0) return;
    const text = inputValue;
    const imgs = selectedImages;
    setInputValue('');
    setSelectedImages([]);
    setIsSending(true);
    try {
      await onSendMessage(text, imgs);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="main-content">
      <div className="header">
        <div className="brand">A* Care</div>
        <div className="user-profile" style={{ position: 'relative' }} ref={profileMenuRef}>
          <div className="user-info">
            <span className="user-name">Khách</span>
            <span className="user-role">Khách</span>
          </div>
          <div className="avatar" onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ cursor: 'pointer' }}>K</div>
          
          {showProfileMenu && (
            <div className="profile-popover">
              <div className="profile-popover-header">
                <div><strong>Xin chào Khách</strong></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Khách</div>
              </div>
              <div className="profile-popover-body">
                Đăng nhập ở hệ thống A* Care để đồng bộ phiên và vai trò.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="chat-area">
        <div className="chat-container">
          {(!activeSession || activeSession.messages?.length === 0) ? (
            <div className="welcome-title">Hãy hỏi A* Care bất kỳ điều gì...</div>
          ) : (
            activeSession.messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.sender}`}>
                {msg.sender === 'bot' && (
                  <div className="bot-avatar">
                    <div className="bot-logo-icon">A*</div>
                  </div>
                )}
                <div>
                  <div className="message-bubble" style={{ color: msg.is_error ? 'red' : 'inherit' }}>
                    {msg.image_urls && msg.image_urls.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {msg.image_urls.map((url, i) => (
                          <img key={i} src={url} alt="Uploaded" style={{ maxWidth: '200px', borderRadius: '8px' }} />
                        ))}
                      </div>
                    )}
                    {msg._loading ? (
                      <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
                    ) : msg.text}
                  </div>
                  {msg.sender === 'bot' && !msg._loading && (
                    <div className="message-actions">
                      <button className="action-btn"><ThumbsUp size={16} /></button>
                      <button className="action-btn"><ThumbsDown size={16} /></button>
                      <button className="action-btn"><Copy size={16} /></button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      <div className="input-area">
        <div className="input-container">
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            multiple
            accept="image/*"
            onChange={(e) => {
              if(e.target.files.length > 0) {
                const newFiles = Array.from(e.target.files)
                if (selectedImages.length + newFiles.length > 4) {
                  alert("Chỉ được tải lên tối đa 4 ảnh cho mỗi tin nhắn.");
                  return;
                }
                setSelectedImages(prev => [...prev, ...newFiles]);
              }
              setShowPlusMenu(false);
            }} 
          />
          {selectedImages.length > 0 && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', padding: '0 16px' }}>
              {selectedImages.map((file, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img src={URL.createObjectURL(file)} alt="preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px' }} />
                  <button 
                    style={{ position: 'absolute', top: '-6px', right: '-6px', background: 'red', color: 'white', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                    onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== idx))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {showPlusMenu && (
            <div className="plus-menu" ref={menuRef}>
              <div className="menu-item" onClick={() => fileInputRef.current.click()}>
                <ImageIcon size={18} />
                <span>Tải ảnh lên...</span>
              </div>
              <div className="menu-item" onClick={() => {
                setShowPlusMenu(false)
                onOpenSettings()
              }}>
                <Settings size={18} />
                <span>Cài đặt</span>
              </div>
            </div>
          )}

          <div className="input-wrapper">
            <button 
              className="icon-btn" 
              onClick={() => setShowPlusMenu(!showPlusMenu)}
            >
              <Plus size={20} />
            </button>
            <input 
              type="text" 
              placeholder="Ask A* Care anything..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if(e.key === 'Enter' && !isSending && (inputValue.trim() || selectedImages.length > 0)) {
                  handleSend();
                }
              }}
            />
            <button className="icon-btn" onClick={toggleListening} title={isListening ? 'Dừng mic' : 'Bắt đầu nói'}
              style={isListening ? { backgroundColor: '#fee2e2', color: 'red', borderRadius: '50%' } : {}}
            >
              <Mic size={20} className={isListening ? 'mic-pulse' : ''} />
            </button>
            <button 
              className="icon-btn" 
              disabled={isSending || (!inputValue.trim() && selectedImages.length === 0)} 
              onClick={handleSend}
            >
              <Send size={20} />
            </button>
          </div>
          
          <div className="disclaimer">
            A* Care có thể chưa chính xác 100%. Hãy kiểm tra lại với bác sĩ.
          </div>
        </div>
      </div>
    </div>
  )
}

export default MainChat
