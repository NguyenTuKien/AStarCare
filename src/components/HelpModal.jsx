import { X, Info } from 'lucide-react'

function HelpModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>
        
        <div className="help-content">
          <div className="help-logo">
            <Info className="bot-logo-icon" />
            Help Center
          </div>
          
          <div style={{ margin: '20px 0', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
             <div className="bot-logo-icon" style={{ backgroundColor: 'var(--primary-color)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>A*</div>
             <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>A* Care</span>
          </div>

          <div className="help-title">Trợ lý chatbot của A* Care</div>
          <div className="help-author">
            Develop by <strong>Nguyễn Tuấn Anh</strong> — A* Squad Member
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpModal
