import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

// Custom hook for user auth fetch & caching
function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('https://localhost:3000/imdver', {
          credentials: 'include', // send cookies
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.uname);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    if (!user) {
      fetchUser();
    }
  }, [user]);

  return { user, loading };
}
export default useAuth;