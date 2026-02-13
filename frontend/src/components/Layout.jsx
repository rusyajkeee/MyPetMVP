import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/discover', label: 'Discover', icon: CompassIcon },
  { to: '/profile', label: 'Profile', icon: UserIcon },
];

function HomeIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function CompassIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}
function UserIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const hideNav = ['/login', '/register', '/splash'].some((p) => location.pathname === p);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <main className="flex-1 pb-20">
        <Outlet />
      </main>
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-mypet-green text-white safe-area-pb flex justify-around py-2 shadow-lg">
          <NavLink to="/" className={({ isActive }) => `flex flex-col items-center px-4 py-1 rounded ${isActive ? 'bg-white/20' : ''}`}>
            <HomeIcon className="w-6 h-6" />
            <span className="text-xs mt-0.5">Home</span>
          </NavLink>
          <NavLink to="/discover" className={({ isActive }) => `flex flex-col items-center px-4 py-1 rounded ${isActive ? 'bg-white/20' : ''}`}>
            <CompassIcon className="w-6 h-6" />
            <span className="text-xs mt-0.5">Discover</span>
          </NavLink>
          {user ? (
            user.role === 'PROVIDER' ? (
              <NavLink to="/manage" className={({ isActive }) => `flex flex-col items-center px-4 py-1 rounded ${isActive ? 'bg-white/20' : ''}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                <span className="text-xs mt-0.5">Dashboard</span>
              </NavLink>
            ) : (
              <NavLink to="/profile" className={({ isActive }) => `flex flex-col items-center px-4 py-1 rounded ${isActive ? 'bg-white/20' : ''}`}>
                <UserIcon className="w-6 h-6" />
                <span className="text-xs mt-0.5">Profile</span>
              </NavLink>
            )
          ) : (
            <NavLink to="/login" className="flex flex-col items-center px-4 py-1 rounded">
              <UserIcon className="w-6 h-6" />
              <span className="text-xs mt-0.5">Profile</span>
            </NavLink>
          )}
        </nav>
      )}
    </div>
  );
}
