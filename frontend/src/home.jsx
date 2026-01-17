import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";


import useAuth from "./auth.jsx";
import './auth.css'
function Home() {
 const { user, verified, checkVerification } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check verification on mount (calls /imdver)
    checkVerification().then((isVerified) => {
      if (!isVerified) {
        navigate("/login");
      }
    });
  }, [navigate, checkVerification]);

  if (!user || !verified) {
    // Optional: show loading or redirecting message here
    return <p>Checking authentication...</p>;
  }

  return (
    <div className="home-container">
      <div className="home-card">
        <h1>Welcome, {user} 👋</h1>

        <p className="subtitle">
          Convert your PDFs to clean, searchable text using our async job pipeline.
        </p>

        {/* ACTION BUTTONS */}
        <div className="home-actions">
          <button
            className="primary-btn"
            onClick={() => navigate("/pdftotext")}
          >
            Upload PDF
          </button>

          <button
            className="secondary-btn"
            onClick={() => navigate("/jobs")}
          >
            View Jobs
          </button>
        </div>

        <div className="plans">
          <div className="plan free">
            <h3>Free Plan</h3>
            <ul>
              <li>✔ Limited conversions</li>
              <li>✔ Job queue support</li>
              <li>✔ Status tracking</li>
            </ul>
          </div>

          <div className="plan premium">
            <h3>Premium (Coming Soon)</h3>
            <ul>
              <li>🚀 Unlimited conversions</li>
              <li>⚡ Faster processing</li>
              <li>📁 Long-term job history</li>
            </ul>
          </div>
        </div>

        <img
          src="/pdf-illustration.png"
          alt="PDF Illustration"
          className="hero-image"
        />
      </div>
    </div>
  );
}

export default Home;
