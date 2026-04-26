import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import MainChat from './components/MainChat'
import HelpModal from './components/HelpModal'
import VoiceSettingsModal from './components/VoiceSettingsModal'
import AuthScreen from './components/AuthScreen'
import { generateBotResponse } from './services/llmService'

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [apiError, setApiError] = useState(null)
  const [isConnecting, setIsConnecting] = useState(true)

  // State management for sessions
  const [sessions, setSessions] = useState([])
  const [activeSessionId, setActiveSessionId] = useState(null)
  const [activeSession, setActiveSession] = useState(null)

  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || null)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  })

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setSessions([])
    setActiveSessionId(null)
    setActiveSession(null)
  }

  const apiFetch = async (url, options = {}) => {
    const headers = { ...options.headers }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(url, { ...options, headers })
    if (res.status === 401) {
      handleLogout()
      throw new Error("Phiên đăng nhập hết hạn")
    }
    return res
  }

  useEffect(() => {
    if (!token) return;
    setIsConnecting(true)
    setApiError(null)
    apiFetch('/api/sessions')
      .then(res => {
        if (!res.ok) throw new Error(`Server lỗi ${res.status} - vui lòng thử lại sau`)
        return res.json()
      })
      .then(data => {
        setIsConnecting(false)
        setSessions(data)
        if (data.length > 0) {
          setActiveSessionId(data[0].id)
        } else {
          handleNewConsultation()
        }
      })
      .catch(err => {
        setIsConnecting(false)
        setApiError(err.message || 'Không thể kết nối đến máy chủ')
        console.error("Error fetching sessions:", err)
      })
  }, [])

  useEffect(() => {
    if (activeSessionId && token) {
      apiFetch(`/api/sessions/${activeSessionId}`)
        .then(res => res.json())
        .then(data => setActiveSession(data))
        .catch(err => console.error("Error fetching session:", err))
    }
  }, [activeSessionId])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleNewConsultation = async () => {
    try {
      const res = await apiFetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Cuộc trò chuyện mới' })
      })
      const newSession = await res.json()
      setSessions([newSession, ...sessions])
      setActiveSessionId(newSession.id)
      setActiveSession(newSession)
    } catch (err) {
      console.error("Error creating session:", err)
    }
  }

  const handleDeleteSession = async (sessionId) => {
    try {
      await apiFetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
      const remaining = sessions.filter(s => s.id !== sessionId)
      if (activeSessionId === sessionId) {
        if (remaining.length > 0) {
          setSessions(remaining)
          setActiveSessionId(remaining[0].id)
        } else {
          // Tạo session mới trực tiếp để tránh stale closure của handleNewConsultation
          const res = await apiFetch('/api/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: 'Cuộc trò chuyện mới' })
          })
          const newSession = await res.json()
          setSessions([newSession])
          setActiveSessionId(newSession.id)
          setActiveSession(newSession)
        }
      } else {
        setSessions(remaining)
      }
    } catch (err) {
      console.error("Error deleting session:", err)
    }
  }

  const handleSendMessage = async (text, images = []) => {
    if (!activeSessionId) return;

    // 1. Optimistically show user message + loading indicator immediately
    const tempUserMsg = { sender: 'user', text, is_error: false, image_urls: images.map(f => URL.createObjectURL(f)) }
    const tempBotMsg = { sender: 'bot', text: '...', is_error: false, image_urls: [], _loading: true }
    setActiveSession(prev => ({
      ...prev,
      messages: [...(prev?.messages || []), tempUserMsg, tempBotMsg]
    }))

    try {
      // 2. Upload images via backend (avoids CORS with R2)
      let finalImageUrls = [];
      if (images.length > 0) {
        const formData = new FormData();
        images.forEach(img => formData.append('files', img));
        const uploadRes = await apiFetch(`/api/sessions/${activeSessionId}/upload_images`, {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload images");
        const uploadData = await uploadRes.json();
        finalImageUrls = uploadData.urls;
      }

      // 3. Save user message to backend
      await apiFetch(`/api/sessions/${activeSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sender: 'user', image_urls: finalImageUrls })
      })

      // 4. Generate AI response (client-side)
      let botText = '';
      try {
        botText = await generateBotResponse(text, finalImageUrls);
      } catch (aiErr) {
        botText = "Xin lỗi, hệ thống gặp lỗi khi gọi AI. Vui lòng thử lại.";
      }

      // 5. Save bot message to backend
      await apiFetch(`/api/sessions/${activeSessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: botText, sender: 'bot', image_urls: [] })
      })

      // 6. Fetch session to get canonical state (with proper IDs + title)
      const sessionRes = await apiFetch(`/api/sessions/${activeSessionId}`)
      const updatedSession = await sessionRes.json()
      setActiveSession(updatedSession)
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title: updatedSession.title } : s))

    } catch (err) {
      console.error("Error sending message:", err)
      // On failure, remove the loading bot message and keep the user message visible
      setActiveSession(prev => ({
        ...prev,
        messages: (prev?.messages || []).filter(m => !m._loading).map(m =>
          m === tempUserMsg ? m : m
        ).concat([{ sender: 'bot', text: 'Gửi tin nhắn thất bại. Vui lòng thử lại.', is_error: true, image_urls: [] }])
      }))
    }
  }

  if (!token) {
    return <AuthScreen onAuthSuccess={(data) => {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify({ id: data.user_id, username: data.username }));
      setToken(data.access_token);
      setUser({ id: data.user_id, username: data.username });
    }} />
  }

  return (
    <div className="app-container">
      {/* Connection status banners */}
      {isConnecting && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(90deg, #1e3a5f, #2563eb)',
          color: '#fff', padding: '10px 20px',
          display: 'flex', alignItems: 'center', gap: '10px',
          fontSize: '0.88rem', fontWeight: 500, boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #fff',
            borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Đang kết nối đến máy chủ… (lần đầu có thể mất 30–60 giây do cold start)
        </div>
      )}
      {apiError && !isConnecting && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#dc2626', color: '#fff', padding: '10px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '0.88rem', fontWeight: 500, boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <span>⚠️ {apiError}</span>
          <button
            onClick={() => {
              setApiError(null)
              setIsConnecting(true)
              apiFetch('/api/sessions')
                .then(res => { if (!res.ok) throw new Error(`Server lỗi ${res.status}`); return res.json() })
                .then(data => {
                  setIsConnecting(false)
                  setSessions(data)
                  if (data.length > 0) setActiveSessionId(data[0].id)
                  else handleNewConsultation()
                })
                .catch(err => { setIsConnecting(false); setApiError(err.message) })
            }}
            style={{
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.5)',
              color: '#fff', padding: '4px 14px', borderRadius: 6, cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: 600
            }}
          >Thử lại</button>
        </div>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div className="mobile-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}
      
      <Sidebar 
        isDarkMode={isDarkMode} 
        setIsDarkMode={setIsDarkMode} 
        onOpenHelp={() => setShowHelp(true)} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onToggleSidebar={toggleSidebar}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewConsultation={handleNewConsultation}
        onDeleteSession={handleDeleteSession}
        user={user}
        onLogout={handleLogout}
      />
      <MainChat 
        onOpenSettings={() => setShowSettings(true)} 
        onToggleSidebar={toggleSidebar}
        activeSession={activeSession}
        onSendMessage={handleSendMessage}
        user={user}
        token={token}
        onLogout={handleLogout}
      />
      
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showSettings && <VoiceSettingsModal onClose={() => setShowSettings(false)} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default App
