import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import TermsModal from '../components/TermsModal';

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
}
function isValidName(v) {
  return /^[a-zA-Zа-яА-ЯёЁ'\-\s]{2,}$/.test(String(v || '').trim());
}
function isValidPhone(v) {
  const d = String(v || '').replace(/\D/g, '');
  return d.length >= 10 && d.length <= 12;
}

function FieldError({ msg }) {
  if (!msg) return null;
  return <p className="text-red-500 text-xs mt-1">{msg}</p>;
}

export default function Register() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showTerms, setShowTerms] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();

  function touch(field) {
    setTouched((t) => ({ ...t, [field]: true }));
  }

  const errors = {
    firstName: touched.firstName && !isValidName(firstName)
      ? (firstName.trim() ? 'Letters only, min 2 characters.' : 'Enter first name.')
      : '',
    lastName: touched.lastName && !isValidName(lastName)
      ? (lastName.trim() ? 'Letters only, min 2 characters.' : 'Enter last name.')
      : '',
    email: touched.email && !isValidEmail(email)
      ? (email.trim() ? 'Enter a valid email address (e.g. user@mail.com).' : 'Enter email.')
      : '',
    phone: touched.phone && phone.trim() && !isValidPhone(phone)
      ? 'Phone must be 10–12 digits (e.g. +7 777 000 0000).'
      : '',
    password: touched.password
      ? (!password ? 'Enter password.'
        : password.length < 8 ? 'Minimum 8 characters.'
        : !/[A-Z]/.test(password) ? 'Must contain at least one uppercase letter.'
        : !/\d/.test(password) ? 'Must contain at least one digit.'
        : '')
      : '',
    confirmPassword: touched.confirmPassword && confirmPassword && password !== confirmPassword
      ? 'Passwords do not match.'
      : '',
  };

  function validate() {
    if (!isValidName(firstName)) return 'Enter a valid first name (letters only, min 2 chars).';
    if (!isValidName(lastName)) return 'Enter a valid last name (letters only, min 2 chars).';
    if (!isValidEmail(email)) return 'Enter a valid email address.';
    if (phone.trim() && !isValidPhone(phone)) return 'Phone must be 10–12 digits.';
    if (!password || password.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
    if (!/\d/.test(password)) return 'Password must contain at least one digit.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    if (!tosAccepted) return 'You must accept the Terms of Service.';
    return '';
  }

  function openTerms() { setShowTerms(true); }
  function handleAcceptTerms() { setTosAccepted(true); setShowTerms(false); }

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ firstName: true, lastName: true, email: true, phone: true, password: true, confirmPassword: true });
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    if (!tosAccepted) { openTerms(); return; }
    setError('');
    setLoading(true);
    try {
      await register({ email, password, firstName, lastName, phone: phone || undefined, role: 'USER', tosAccepted: true });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = (field) =>
    `w-full px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-mypet-green ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
    }`;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center px-6 py-12">
      <div className="max-w-sm mx-auto w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create account</h1>
        <p className="text-gray-600 mb-8">Join MyPet</p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={() => touch('firstName')}
                className={inputClass('firstName')}
              />
              <FieldError msg={errors.firstName} />
            </div>
            <div>
              <input
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={() => touch('lastName')}
                className={inputClass('lastName')}
              />
              <FieldError msg={errors.lastName} />
            </div>
          </div>

          {/* Email */}
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => touch('email')}
              className={inputClass('email')}
            />
            <FieldError msg={errors.email} />
          </div>

          {/* Phone */}
          <div>
            <input
              type="tel"
              placeholder="Phone (optional, e.g. +7 777 000 0000)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => touch('phone')}
              className={inputClass('phone')}
            />
            <FieldError msg={errors.phone} />
          </div>

          {/* Password */}
          <div>
            <input
              type="password"
              placeholder="Password (min 8 chars, 1 uppercase, 1 digit)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => touch('password')}
              className={inputClass('password')}
            />
            <FieldError msg={errors.password} />
          </div>

          {/* Confirm password */}
          <div>
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => touch('confirmPassword')}
              className={inputClass('confirmPassword')}
            />
            <FieldError msg={errors.confirmPassword} />
          </div>

          {/* ToS */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => (e.target.checked ? openTerms() : setTosAccepted(false))}
              className="mt-1 rounded"
            />
            <span className="text-sm">
              I accept the{' '}
              <button type="button" onClick={openTerms} className="text-mypet-green underline">Terms of Service</button>
              {' '}and{' '}
              <button type="button" onClick={openTerms} className="text-mypet-green underline">Privacy Policy</button>
            </span>
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
          Already have an account?{' '}
          <Link to="/login" className="text-mypet-green font-medium">Sign in</Link>
        </p>
      </div>
      <TermsModal open={showTerms} onAccept={handleAcceptTerms} onDecline={() => setShowTerms(false)} />
    </div>
  );
}
