import { useEffect, useState } from "react";
import TheatrePlayer from "./components/TheatrePlayer";

function App() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", {
      credentials: "include",
    })
      .then((res) => {
        if (res.status === 401) {
          window.location.href = "/auth/google";
          return null;
        }

        return res.json();
      })
      .then((data) => {
        if (data?.authenticated) {
          setAuthenticated(true);
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <h2>Checking login...</h2>;
  }

  if (!authenticated) {
    return <h2>Redirecting to Google...</h2>;
  }

  return <TheatrePlayer />;
}

export default App;
