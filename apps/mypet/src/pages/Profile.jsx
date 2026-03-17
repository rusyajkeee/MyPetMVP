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

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="max-w-lg mx-auto">
      {/* Green header with large avatar overlapping */}
      <div className="relative bg-mypet-green px-6 pt-10 pb-16 rounded-b-[2.5rem]">
        <h1 className="text-white text-xl font-bold text-center">My Profile</h1>
      </div>

      {/* Avatar centered over the bottom of the header */}
      <div className="flex flex-col items-center -mt-14 mb-4">
        <div className="w-28 h-28 rounded-full bg-white shadow-xl flex items-center justify-center border-4 border-white overflow-hidden">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl font-bold text-mypet-green">{initials || '🐾'}</span>
          )}
        </div>
        <h2 className="mt-3 text-xl font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>

      <div className="px-5 pb-8 space-y-4">
        {/* Info card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {user.phone && (
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
              <span className="text-xl">📱</span>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Phone</p>
                <p className="font-medium text-gray-900">{user.phone}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <span className="text-xl">✉️</span>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Email</p>
              <p className="font-medium text-gray-900">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-4 text-left text-red-500 hover:bg-red-50 transition"
          >
            <span className="text-xl">🚪</span>
            <span className="font-semibold">Sign Out</span>
          </button>
        </div>

        {/* Action links */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <Link to="/pets" className="flex items-center justify-between px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-xl">🐾</div>
              <span className="font-semibold text-gray-900">My Pets</span>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </Link>
          <Link to="/bookings" className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-xl">📅</div>
              <span className="font-semibold text-gray-900">My Bookings</span>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
