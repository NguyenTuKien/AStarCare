import { useState, useRef, useEffect } from 'react'
import { Plus, Mic, Send, Image as ImageIcon, Settings, ThumbsUp, ThumbsDown, Copy, Circle, Hourglass, Lightbulb, Camera } from 'lucide-react'
import { transcribeAudio } from '../services/llmService'
import CameraModal from './CameraModal'

function MainChat({ onOpenSettings, activeSession, onSendMessage, user, token, onLogout }) {
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const toastTimerRef = useRef(null)
  const [selectedImages, setSelectedImages] = useState([])
  const [feedbackState, setFeedbackState] = useState({}) // { [msgIdx]: 'liked' | 'disliked' }

  const menuRef = useRef(null)
  const profileMenuRef = useRef(null)
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const chatEndRef = useRef(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages])

  // Clear feedback when session changes
  useEffect(() => {
    setFeedbackState({})
  }, [activeSession?.id])

  const showToast = (msg) => {
    setToastMsg(msg)
    clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToastMsg(''), 3000)
  }

  // MediaRecorder-based mic (works on Brave — does NOT use Web Speech API)
  const toggleListening = async () => {
    if (isTranscribing) return

    if (isListening) {
      mediaRecorderRef.current?.stop()
      setIsListening(false)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []

      // Pick a format; prefer ogg (natively supported by Gemini inline_data)
      const mimeType = ['audio/ogg;codecs=opus', 'audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) || ''

      // Strip codec suffix: Gemini requires bare mime type (e.g. 'audio/webm', NOT 'audio/webm;codecs=opus')
      const geminiMimeType = mimeType.split(';')[0] || 'audio/webm'

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: geminiMimeType })
        setIsTranscribing(true)
        try {
          const text = await transcribeAudio(blob, token)
          if (text) {
            setInputValue(prev => (prev ? prev + ' ' : '') + text)
            showToast('Đã điền transcript vào ô chat. Bạn có thể sửa lại rồi bấm Gửi.')
          }
        } catch (err) {
          console.error('Transcription failed:', err)
          showToast('❌ Không thể chuyển âm thanh thành văn bản. Vui lòng thử lại.')
        } finally {
          setIsTranscribing(false)
        }
      }

      recorder.start()
      setIsListening(true)
    } catch (err) {
      console.error('Mic access error:', err)
      alert('Không thể truy cập microphone. Vui lòng kiểm tra quyền trình duyệt.')
    }
  }

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
      <div className="header" style={{ position: 'relative' }}>
        <div className="brand">A* Care</div>
        {activeSession?.title && (
          <div style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            fontWeight: 600, fontSize: '1rem',
            color: 'var(--text-primary)',
            maxWidth: '40%', overflow: 'hidden',
            whiteSpace: 'nowrap', textOverflow: 'ellipsis',
            pointerEvents: 'none'
          }}>
            {activeSession.title}
          </div>
        )}
        <div className="user-profile" style={{ position: 'relative' }} ref={profileMenuRef}>
          <div className="user-info">
            <span className="user-name">{user?.username || 'Khách'}</span>
            <span className="user-role">Người dùng</span>
          </div>
          <div className="avatar" onClick={() => setShowProfileMenu(!showProfileMenu)} style={{ cursor: 'pointer' }}>
            {(user?.username || 'K').charAt(0).toUpperCase()}
          </div>
          
          {showProfileMenu && (
            <div className="profile-popover">
              <div className="profile-popover-header">
                <div><strong>Xin chào {user?.username || 'Khách'}</strong></div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Người dùng A* Care</div>
              </div>
              <div className="profile-popover-body">
                Hồ sơ sức khỏe của bạn đã được mã hóa an toàn.
                <button 
                  onClick={onLogout}
                  style={{
                    display: 'block', width: '100%', marginTop: '12px', padding: '8px', 
                    backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', 
                    borderRadius: '6px', cursor: 'pointer', fontWeight: 500
                  }}>
                  Đăng xuất
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(30,30,30,0.92)', color: '#fff',
          padding: '10px 20px', borderRadius: 24,
          fontSize: '0.85rem', zIndex: 9999,
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toastMsg}
        </div>
      )}

      <div className="chat-area">
        <div className="chat-container">
          {(!activeSession || activeSession.messages?.length === 0) ? (
            <div className="welcome-screen">
              <img src="/logo.png" alt="A* Care" className="welcome-logo" />
              <h1 className="welcome-heading">Clinic AI sẵn sàng hỗ trợ bạn.</h1>
              <p className="welcome-sub">Hỏi về tài liệu, xét nghiệm, thuốc, triệu chứng hoặc đính kèm ảnh<br/>dể phân tích nhanh trong cùng một khung chat.</p>
              <div className="suggestions-grid">
                {[
                  'Tóm tắt giúp tôi các điểm quan trọng của kết quả xét nghiệm máu gần đây.',
                  'Nếu đau họng kèm sốt nhẹ trong 2 ngày thì nên theo dõi những dấu hiệu nào?',
                  'So sánh giúp tôi công dụng và lưu ý của hai loại thuốc tôi đang dùng.',
                  'Hãy gợi ý các câu hỏi nên hỏi bác sĩ trong buổi tái khám sắp tới.',
                ].map((prompt, i) => (
                  <button key={i} className="suggestion-card" onClick={() => onSendMessage(prompt)}>
                    <Lightbulb size={18} className="suggestion-icon" />
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeSession.messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.sender}`}>
                {msg.sender === 'bot' && (
                  <div className="bot-avatar">
                    <img src="/logo.png" alt="A* Care" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
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
                      <button 
                        className="action-btn"
                        onClick={() => {
                          setFeedbackState(prev => ({
                            ...prev,
                            [idx]: prev[idx] === 'liked' ? null : 'liked'
                          }))
                        }}
                        style={feedbackState[idx] === 'liked' ? { color: 'var(--primary-color)' } : {}}
                        title="Hữu ích"
                      >
                        <ThumbsUp size={16} />
                      </button>
                      <button 
                        className="action-btn"
                        onClick={() => {
                          setFeedbackState(prev => ({
                            ...prev,
                            [idx]: prev[idx] === 'disliked' ? null : 'disliked'
                          }))
                        }}
                        style={feedbackState[idx] === 'disliked' ? { color: '#ef4444' } : {}}
                        title="Không hữu ích"
                      >
                        <ThumbsDown size={16} />
                      </button>
                      <button 
                        className="action-btn"
                        onClick={() => {
                          navigator.clipboard.writeText(msg.text)
                          showToast('Đã copy tin nhắn!')
                        }}
                        title="Copy"
                      >
                        <Copy size={16} />
                      </button>
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
          {showCamera && (
            <CameraModal 
              onClose={() => setShowCamera(false)} 
              onCapture={(file) => {
                if (selectedImages.length >= 4) {
                  alert("Chỉ được tải lên tối đa 4 ảnh cho mỗi tin nhắn.");
                } else {
                  setSelectedImages(prev => [...prev, file]);
                }
                setShowCamera(false);
              }} 
            />
          )}
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
                setShowCamera(true);
                setShowPlusMenu(false);
              }}>
                <Camera size={18} />
                <span>Chụp ảnh...</span>
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
            <button className={`icon-btn ${isListening ? 'recording' : ''}`} onClick={toggleListening}
              disabled={isTranscribing}
              title={isListening ? 'Dừng ghi âm' : isTranscribing ? 'Đang xử lý...' : 'Ghi âm giọng nói'}
            >
              {isTranscribing
                ? <Hourglass size={20} className="spin-hourglass" />
                : isListening
                ? <Circle size={20} fill="currentColor" className="record-icon" />
                : <Mic size={20} />}
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
