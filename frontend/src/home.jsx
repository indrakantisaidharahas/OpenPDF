import React, { useEffect,useState, useCallback  } from "react";
import { useNavigate } from "react-router-dom";

import useAuth from "./auth.jsx";
import './auth.css'

function Home() {
  const { user, verified, checkVerification, setUser, setVerified } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkVerification().then((isVerified) => {
      if (!isVerified) {
        console.log("not verified");
        navigate("/login");
      }
    });
  }, [navigate, checkVerification]);

  if (!user || !verified) {
    return <p>Checking authentication...</p>;
  }

  const handleLogout = async () => {
  try {
    const response = await fetch(import.meta.env.VITE_LOGOUT, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Logout failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Logout response:', data);

    setUser(null);
    setVerified(false);

    localStorage.clear();
    sessionStorage.clear();

    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    navigate("/login");
  } catch (err) {
    
    console.error(err);
    alert(err.message || "Logout failed. Please try again.");

  }
};


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

          {/* Logout button styled same as other buttons */}
          <button
            className="secondary-btn"  // same class as 'View Jobs' to keep size/style consistent
            onClick={handleLogout}
            style={{ marginLeft: "1rem" }}
          >
            Logout
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
