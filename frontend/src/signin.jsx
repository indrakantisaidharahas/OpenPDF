import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./auth.css";

export default function Signup() {
  const [mail, setMail] = useState("");
  const [pass, setPass] = useState("");
  const [uname, setUname] = useState("");
  const [log, setLog] = useState(null);     // 👈 NEW
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSignup(e) {
    e.preventDefault();
    setLog(null);
    setLoading(true);

    try {
      const res = await fetch(import.meta.env.VITE_SIGNIN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mail, pass, uname }),
      });

      const data = await res.json();

      if (data.status ==1) {
        navigate("/");
      } else {
        setLog(data.log);
      }
    } catch {
      setLog("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-box" onSubmit={handleSignup}>
        <h2 className="auth-title">Sign Up</h2>

        {/* 🔴 LOG / ERROR */}
        {log && <div className="auth-log error">{log}</div>}

        <input
          type="text"
          placeholder="Username"
          value={uname}
          onChange={(e) => setUname(e.target.value)}
          required
          className="auth-input"
        />

        <input
          type="email"
          placeholder="Email"
          value={mail}
          onChange={(e) => setMail(e.target.value)}
          required
          className="auth-input"
        />

        <input
          type="password"
          placeholder="Password"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          required
          className="auth-input"
        />

        <button
          type="submit"
          className="auth-button"
          disabled={loading}
        >
          {loading ? "Creating account…" : "Create Account"}
        </button>

        <p className="auth-footer-text">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
