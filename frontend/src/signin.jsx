import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './auth.css'
export default function Signup() {
  const [mail, setMail] = useState('');
  const [pass, setPass] = useState('');
  const [uname, setUname] = useState('');
  const navigate = useNavigate();

  async function handleSignup(e) {
    e.preventDefault();

    const res = await fetch('https://localhost:3000/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ mail, pass, uname })
    });

    const data = await res.json();
    if (data.status) navigate('/');
    else alert('User already exists');
  }

  return (
    <div className="auth-container">
      <form className="auth-box" onSubmit={handleSignup}>
        <h2 className="auth-title">Sign Up</h2>

        <input
          type="text"
          placeholder="Username"
          value={uname}
          onChange={e => setUname(e.target.value)}
          required
          className="auth-input"
        />

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

        <button type="submit" className="auth-button">Create Account</button>

        <p className="auth-footer-text">
          Already have an account? <Link to="/login" className="auth-link">Login</Link>
        </p>
      </form>
    </div>
  );
}
