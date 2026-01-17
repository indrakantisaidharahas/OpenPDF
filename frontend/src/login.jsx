import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './auth.css'
export default function Login() {
  const [mail, setMail] = useState('');
  const [pass, setPass] = useState('');
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();

    const res = await fetch('https://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ mail, pass })
    });

    const data = await res.json();
    if (data.status) navigate('/');
    else alert('Invalid credentials');
  }

  return (
    <div className="auth-container">
      <form className="auth-box" onSubmit={handleLogin}>
        <h2 className="auth-title">Login</h2>

        <input
          type="email"
          placeholder="Email"
          value={mail}
          onChange={e => setMail(e.target.value)}
          required
          className="auth-input"
        />

        <input
          type="password"
          placeholder="Password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          required
          className="auth-input"
        />

        <button type="submit" className="auth-button">Login</button>

        <p className="auth-footer-text">
          No account? <Link to="/signup" className="auth-link">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
