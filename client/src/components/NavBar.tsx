import { Link } from "wouter";
import { useAuth } from "../hooks/useAuth";

export default function NavBar() {
  const { username, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <Link href="/" className="text-xl font-bold text-blue-600">
        Flute
      </Link>
      <div className="flex items-center gap-4">
        <Link
          href="/vocabulary"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Vocabulary
        </Link>
        <Link
          href="/settings"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Settings
        </Link>
        <span className="text-sm text-gray-600">{username}</span>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Switch user
        </button>
      </div>
    </nav>
  );
}
