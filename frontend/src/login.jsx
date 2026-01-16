import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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
        <h2>Login</h2>

        <input
          type="email"
          placeholder="Email"
          value={mail}
          onChange={e => setMail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={pass}
          onChange={e => setPass(e.target.value)}
          required
        />

        <button type="submit">Login</button>

        <p>
          No account? <Link to="/signup">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
