// Port of public/register.html.
//
// Public page — no session required, and it deliberately does not create one:
// the static page never wrote to localStorage here, it only showed the API's
// message and left you to log in yourself. So this page talks to the API client
// directly instead of going through AuthContext (which only knows login/logout).
//
// The success message is whatever POST /api/auth/register returns, and that is
// load-bearing: the API answers "Account created and approved as the first
// administrator." for the very first account ever registered (it is auto-
// approved as an admin so someone can approve everyone after them) and
// "Registration submitted. An administrator needs to approve your account
// before you can log in." for every account after that. The page must not
// second-guess which one it got — it prints data.message verbatim, exactly as
// the original did.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import client from '../api/client';
import './Register.css';

export default function Register() {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');

  // Port of showMessage(text, isError): one <div id="auth-message"> that is
  // hidden until there is something to say, then styled status-ok / status-error.
  const [message, setMessage] = useState(null);

  // The original disabled #register-btn after a successful registration and
  // never re-enabled it — the account exists now, so a second submit could only
  // fail. Same here: this latches on and stays on until the page is left.
  const [registered, setRegistered] = useState(false);

  // register.html restyled <body> to centre the card. <body> lives outside the
  // React tree, so the class is toggled here and the rule that keys on it lives
  // in Register.css. Removing it on unmount is what keeps the dashboard routes
  // (whose layout is body-as-flex-row) unaffected.
  useEffect(() => {
    document.body.classList.add('auth-page');
    return () => document.body.classList.remove('auth-page');
  }, []);

  // register.html carried <title>ASH ERP — Register</title>. index.html can only
  // hold one title for the whole SPA, so each page sets its own on mount. There
  // is deliberately no cleanup: in the static app the title changed when the
  // next document loaded, so the next page setting its own is the correct
  // handover. (Every ported page needs this line for that to hold.)
  useEffect(() => {
    document.title = 'ASH ERP — Register';
  }, []);

  async function handleRegister() {
    const trimmedUsername = username.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    // Password is intentionally NOT trimmed — the original read it raw, and
    // trimming it here would hash something the user did not type.
    if (!trimmedUsername || !trimmedFirstName || !trimmedLastName || !password) {
      setMessage({
        text: 'Fill in your username, first name, last name, and password.',
        isError: true,
      });
      return;
    }

    try {
      const { data } = await client.post('/auth/register', {
        username: trimmedUsername,
        first_name: trimmedFirstName,
        last_name: trimmedLastName,
        password: password,
      });

      setMessage({ text: data.message, isError: false });
      setRegistered(true);
    } catch (err) {
      // Two different failures, kept apart the way the original did:
      //   * the request never reached the server  → its catch block;
      //   * the server answered 4xx               → `data.error`, falling back
      //     to "Registration failed." (409 "An account with that username
      //     already exists." is the one users actually hit).
      // The "node server.js" wording is stale — this backend is Laravel — but it
      // is what the page says today, so it is reproduced verbatim.
      if (err.isNetworkError) {
        setMessage({
          text: "Could not reach the backend. Is 'node server.js' running? (" + err.message + ')',
          isError: true,
        });
        return;
      }

      const apiError = err.data && err.data.error;
      setMessage({ text: apiError || 'Registration failed.', isError: true });
    }
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

      <h1>Create an account</h1>
      <p className="sub">New accounts need administrator approval before you can log in.</p>

      <div className="field-label">Username</div>
      <input
        id="username-input"
        className="auth-input"
        type="text"
        placeholder="jdelacruz"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <div className="field-label">First Name</div>
      <input
        id="first-name-input"
        className="auth-input"
        type="text"
        placeholder="Juan"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
      />

      <div className="field-label">Last Name</div>
      <input
        id="last-name-input"
        className="auth-input"
        type="text"
        placeholder="Dela Cruz"
        value={lastName}
        onChange={(e) => setLastName(e.target.value)}
      />

      <div className="field-label">Password</div>
      <input
        id="password-input"
        className="auth-input"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button
        id="register-btn"
        className="btn btn-primary btn-block"
        style={{ marginTop: '20px' }}
        disabled={registered}
        onClick={handleRegister}
      >
        Register
      </button>

      {/* Always in the DOM, like the original: #auth-message is display:none
          until showMessage() set an inline display:block on it. */}
      <div
        id="auth-message"
        className={message ? (message.isError ? 'status-error' : 'status-ok') : ''}
        style={message ? { display: 'block' } : undefined}
      >
        {message ? message.text : ''}
      </div>

      <div className="auth-footer">Already have an account? <Link to="/stocks/login">Log in</Link></div>
    </div>
  );
}
