// Port of public/login.html.
//
// Same markup, same class names, same endpoint (POST /api/auth/login via
// AuthContext), same validation and the same message strings. The two inputs are
// controlled state instead of document.getElementById reads, and the redirect is
// react-router's navigate() instead of window.location = "dashboard.html".

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // The original's showMessage(text, isError): one div, hidden until there is
  // something to say, then painted status-ok / status-error. Only the error
  // branch is ever reached on this page — success navigates away — but the flag
  // is kept so the element behaves exactly as the helper made it behave.
  const [message, setMessage] = useState(null); // { text, isError } | null

  // login.html restyled <body> to centre its single card. Its stylesheet was
  // scoped to that one document; here it has to be scoped to this one mount.
  // See the comment on `body.auth-page` in Login.css.
  useEffect(() => {
    document.body.classList.add('auth-page');
    return () => document.body.classList.remove('auth-page');
  }, []);

  async function handleLogin() {
    const trimmedUsername = username.trim();

    if (!trimmedUsername || !password) {
      setMessage({ text: 'Enter both username and password.', isError: true });
      return;
    }

    try {
      // Stores the whole response under "ash_session" — the same payload the
      // static page wrote with localStorage.setItem.
      await login(trimmedUsername, password);
      // window.location.href = "dashboard.html". `replace` keeps the login
      // screen out of the history stack behind the dashboard.
      navigate('/stocks/dashboard', { replace: true });
    } catch (err) {
      // The static page's catch block only ever fired when fetch itself failed.
      if (!err || err.isNetworkError) {
        const detail = err ? err.message : 'Network error';
        setMessage({
          // Kept word for word, stale "node server.js" included: it is the
          // string the original showed and this is a port, not a rewrite.
          text: "Could not reach the backend. Is 'node server.js' running? (" + detail + ')',
          isError: true,
        });
        return;
      }

      // `data.error || "Login failed."`, exactly as the original read it. The
      // API answers 401 "Incorrect username or password." and 403 for pending /
      // rejected / deactivated accounts (AuthController::login), all in `error`.
      const apiError = err.data && typeof err.data === 'object' ? err.data.error : null;
      setMessage({ text: apiError || 'Login failed.', isError: true });
    }
  }

  // The original bound Enter on the password field only, not on username.
  function handlePasswordKeyDown(event) {
    if (event.key === 'Enter') handleLogin();
  }

  return (
    <div className="auth-card">
      <div className="auth-logo-row">
        <div className="logo-box">⚙️</div>
        <div>
          <div className="brand" style={{ color: 'var(--text)' }}>ASH AI</div>
          <div className="brand-sub" style={{ color: 'var(--muted-dark)' }}>Smart Apparel ERP</div>
        </div>
      </div>

      <h1>Log in</h1>
      <p className="sub">Enter your credentials to access the ERP dashboard.</p>

      <div className="field-label">Username</div>
      <input
        id="username-input"
        className="auth-input"
        type="text"
        placeholder="jdelacruz"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
      />

      <div className="field-label">Password</div>
      <input
        id="password-input"
        className="auth-input"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        onKeyDown={handlePasswordKeyDown}
      />

      <button
        id="login-btn"
        type="button"
        className="btn btn-primary btn-block"
        style={{ marginTop: '20px' }}
        onClick={handleLogin}
      >
        Log In
      </button>

      {/* #auth-message is `display: none` in the stylesheet and was revealed by
          `el.style.display = "block"`, so the inline style stays with it. */}
      {message && (
        <div
          id="auth-message"
          className={message.isError ? 'status-error' : 'status-ok'}
          style={{ display: 'block' }}
        >
          {message.text}
        </div>
      )}

      <div className="auth-footer">
        Don&apos;t have an account? <Link to="/stocks/register">Register</Link>
      </div>
    </div>
  );
}
