import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./auth.css";

export default function Login() {
  const [mail, setMail] = useState("");
  const [pass, setPass] = useState("");
  const [log, setLog] = useState(null);     // 👈 NEW
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setLog(null);
    setLoading(true);

    try {
      const res = await fetch("https://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ mail, pass }),
      });

      const data = await res.json();

      if (data.status ==1) {
        navigate("/");
      } else {
        setLog(data.log || "Invalid email or password");
      }
    } catch (err) {
      setLog("Server unreachable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <form className="auth-box" onSubmit={handleLogin}>
        <h2 className="auth-title">Login</h2>

        {/* 🔴 LOG / ERROR */}
        {log && <div className="auth-log error">{log}</div>}

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
          {loading ? "Logging in…" : "Login"}
        </button>

        <p className="auth-footer-text">
          No account?{" "}
          <Link to="/signup" className="auth-link">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
