import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from "./auth.jsx";

// Custom hook for user auth fetch & caching


// Navbar component
function Navbar() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    // Redirect to login if not authenticated
    navigate('/login');
    return null;
  }

  return (
    <nav>
      <ul>
        <li><Link to="/">Home</Link></li>
        <li><Link to="/pdftotext">PDF to Text</Link></li>
        <li>Hello, {user}</li>
      </ul>
    </nav>
  );
}

export default Navbar;
