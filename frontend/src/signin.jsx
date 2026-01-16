import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

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
        <h2>Sign Up</h2>

        <input
          type="text"
          placeholder="Username"
          value={uname}
          onChange={e => setUname(e.target.value)}
          required
        />

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

        <button type="submit">Create Account</button>

        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
