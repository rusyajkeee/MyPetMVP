import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Splash from './pages/Splash';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Discover from './pages/Discover';
import ProviderProfile from './pages/ProviderProfile';
import BookingForm from './pages/BookingForm';
import UserDashboard from './pages/UserDashboard';
import Profile from './pages/Profile';
import AddPets from './pages/AddPets';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-mypet-green"><div className="text-white text-xl">Loading...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="discover" element={<Discover />} />
        <Route path="discover/:category" element={<Discover />} />
        <Route path="provider/:id" element={<ProviderProfile />} />
        <Route path="provider/:id/book" element={<ProtectedRoute><BookingForm /></ProtectedRoute>} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="pets" element={<ProtectedRoute><AddPets /></ProtectedRoute>} />
        <Route path="bookings" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
      </Route>
      <Route path="/splash" element={<Splash />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
