import { useAuth } from "../hooks/useAuth";
import { logout } from "../api/auth.api";

export default function LogoutButton() {
  const { setUser } = useAuth();

  const handleLogout = async () => {
    try {
      await logout(); 
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setUser(null);
      localStorage.removeItem("token"); 
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
    >
      Logout
    </button>
  );
}
