import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TermsModal from '../components/TermsModal';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('USER');
  const [showTerms, setShowTerms] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  function openTerms() {
    setShowTerms(true);
  }

  function handleAcceptTerms() {
    setTosAccepted(true);
    setShowTerms(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!tosAccepted) {
      openTerms();
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register({
        email,
        password,
        firstName,
        lastName,
        phone: phone || undefined,
        role,
        tosAccepted: true,
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center px-6 py-12">
      <div className="max-w-sm mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create account</h1>
        <p className="text-gray-600 mb-8">Join MyPet</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-mypet-green"
              required
            />
            <input
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-mypet-green"
              required
            />
          </div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-mypet-green"
            required
          />
          <input
            type="tel"
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-mypet-green"
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-mypet-green"
            required
          />
          <div>
            <label className="block text-sm text-gray-600 mb-1">Register as</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-mypet-green"
            >
              <option value="USER">Pet owner</option>
              <option value="PROVIDER">Service provider</option>
            </select>
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => (e.target.checked ? openTerms() : setTosAccepted(false))}
              className="mt-1 rounded"
            />
            <span className="text-sm">I accept the <button type="button" onClick={openTerms} className="text-mypet-green underline">Terms of Service</button> and <button type="button" onClick={openTerms} className="text-mypet-green underline">Privacy Policy</button></span>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-mypet-green text-white font-semibold hover:bg-mypet-green-dark disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>
        <p className="mt-6 text-center text-gray-600">
          Already have an account? <Link to="/login" className="text-mypet-green font-medium">Sign in</Link>
        </p>
      </div>
      <TermsModal open={showTerms} onAccept={handleAcceptTerms} onDecline={() => setShowTerms(false)} />
    </div>
  );
}
