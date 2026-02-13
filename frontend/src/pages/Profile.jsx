import { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/profile').then(({ data }) => setProfile(data)).catch(() => setProfile(null)).finally(() => setLoading(false));
  }, []);

  function handleSignOut() {
    logout();
    navigate('/');
  }

  if (!user) return null;

  // Providers use the dashboard at /manage (with Profile tab inside). Don't show pet-owner profile.
  if (user.role === 'PROVIDER') {
    return <Navigate to="/manage" replace />;
  }

  if (loading) return <div className="p-6">Loading...</div>;

  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : `${user.firstName} ${user.lastName}`;
  const email = profile?.email ?? user.email;

  return (
    <div className="max-w-lg mx-auto pb-6">
      <header className="bg-mypet-green text-white px-6 py-6 flex items-center gap-4">
        <h1 className="text-xl font-bold flex-1 truncate">{displayName}</h1>
      </header>
      <div className="px-6 -mt-4">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="h-40 bg-gray-200 flex items-center justify-center">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl text-gray-400">👤</span>
            )}
          </div>
          <div className="p-4 space-y-3">
            <p className="font-semibold text-gray-900">{displayName}</p>
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <span>✉</span> {email}
            </p>
            {profile?.phone && (
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <span>📞</span> {profile.phone}
              </p>
            )}
            <button
              onClick={handleSignOut}
              className="w-full py-2 flex items-center justify-center gap-2 text-gray-600 border border-gray-300 rounded-xl"
            >
              Sign out
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {user.role === 'USER' && (
            <>
              <Link to="/pets" className="block bg-white rounded-xl p-4 shadow flex items-center justify-between">
                <span className="flex items-center gap-2">🐾 Add Pet</span>
                <span>→</span>
              </Link>
              <Link to="/dashboard" className="block bg-white rounded-xl p-4 shadow flex items-center justify-between">
                <span>My Bookings</span>
                <span>→</span>
              </Link>
            </>
          )}
          {user.role === 'ADMIN' && (
            <Link to="/admin" className="block bg-white rounded-xl p-4 shadow flex items-center justify-between">
              <span>Admin Panel</span>
              <span>→</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
