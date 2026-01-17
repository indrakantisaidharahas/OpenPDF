import { useState, useCallback } from "react";

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [verified, setVerified] = useState(false);

  const checkVerification = useCallback(async () => {
    try {
      const res = await fetch("https://localhost:3000/imdver", {
        credentials: "include",
      });
      if (!res.ok) {
        setUser(null);
        setVerified(false);
        return false;
      }
      const data = await res.json();
      if (data.uname) {
        setUser(data.uname);
        setVerified(true);
        return true;
      } else {
        setUser(null);
        setVerified(false);
        return false;
      }
    } catch {
      setUser(null);
      setVerified(false);
      return false;
    }
  }, []);

  return { user, verified, checkVerification };
}
