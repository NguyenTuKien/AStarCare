import { useState } from 'react';
import { Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';

function AuthScreen({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      
      let res;
      if (isLogin) {
        // OAuth2 Password Request uses form-data or JSON? FastAPI OAuth2PasswordRequestForm expects form-data.
        // Wait, in my backend app.py I used `user: schemas.UserLogin`, which expects JSON! Let's check `auth.py`. 
        // Ah, `OAuth2PasswordBearer` requires the login endpoint to accept `application/x-www-form-urlencoded`!
        // Wait, if I used `schemas.UserLogin` as a JSON body, `OAuth2PasswordBearer` might not be fully compliant but it doesn't strictly validate the login endpoint itself, it just validates the token format in the header.
        // But let me send JSON since I defined the backend to accept JSON.
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
      } else {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Có lỗi xảy ra, vui lòng thử lại');
      }

      if (isLogin) {
        const data = await res.json();
        onAuthSuccess(data); // pass token and user info
      } else {
        // Switch to login after successful register
        setIsLogin(true);
        setError('');
        setPassword('');
        setConfirmPassword('');
        alert("Đăng ký thành công! Vui lòng đăng nhập.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-container">
        <div className="auth-header">
          <h2>{isLogin ? 'Đăng nhập A* Care' : 'Đăng ký tài khoản'}</h2>
          <p>{isLogin ? 'Nhập thông tin để tiếp tục' : 'Tạo tài khoản để cá nhân hóa dữ liệu của bạn'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          
          <div className="auth-input-group">
            <User size={20} className="auth-icon" />
            <input 
              type="text" 
              placeholder="Tên đăng nhập" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div className="auth-input-group">
            <Lock size={20} className="auth-icon" />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Mật khẩu" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="auth-icon-right" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {!isLogin && (
            <div className="auth-input-group">
              <Lock size={20} className="auth-icon" />
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="Xác nhận mật khẩu" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button type="button" className="auth-icon-right" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          )}

          <button type="submit" className="auth-submit-btn" disabled={loading}>
            {loading ? <Loader2 className="spinner" size={20} /> : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
          </button>
        </form>

        <div className="auth-footer">
          {isLogin ? (
            <p>Chưa có tài khoản? <span onClick={() => setIsLogin(false)}>Đăng ký ngay</span></p>
          ) : (
            <p>Đã có tài khoản? <span onClick={() => setIsLogin(true)}>Đăng nhập</span></p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
