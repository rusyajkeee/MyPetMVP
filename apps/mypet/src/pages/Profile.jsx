import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  if (!user) return null;

  return (
    <div className="max-w-lg mx-auto pb-6">
      <header className="bg-mypet-green text-white px-6 py-8 rounded-b-3xl">
        <h1 className="text-xl font-bold">Profile</h1>
      </header>
      <div className="px-6 -mt-8">
        {/* Avatar area */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center text-4xl text-gray-400 border-4 border-white">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              '👤'
            )}
          </div>
          <h2 className="mt-3 text-lg font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
        </div>

        {/* Info card */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4 mb-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
            <p className="text-gray-900 font-medium">{user.email}</p>
          </div>
          {user.phone && (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
              <p className="text-gray-900 font-medium">{user.phone}</p>
            </div>
          )}
        </div>

        {/* Links */}
        <div className="space-y-3 mb-8">
          <Link
            to="/pets"
            className="flex items-center justify-between bg-white rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🐾</span>
              <span className="font-medium text-gray-900">My Pets</span>
            </div>
            <span className="text-gray-400">→</span>
          </Link>
          <Link
            to="/bookings"
            className="flex items-center justify-between bg-white rounded-xl px-5 py-4 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📅</span>
              <span className="font-medium text-gray-900">My Bookings</span>
            </div>
            <span className="text-gray-400">→</span>
          </Link>
        </div>

        {/* Sign out */}
        <button
          onClick={handleLogout}
          className="w-full py-3 rounded-xl border-2 border-red-500 text-red-500 font-semibold hover:bg-red-50 transition"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
