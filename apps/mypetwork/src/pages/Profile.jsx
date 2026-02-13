import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [userForm, setUserForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [providerForm, setProviderForm] = useState({
    businessName: '',
    description: '',
    address: '',
  });
  const [reviews, setReviews] = useState([]);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({ user: false, provider: false });
  const [success, setSuccess] = useState({ user: false, provider: false });
  const [error, setError] = useState({ user: '', provider: '' });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      // Load user data
      if (user) {
        setUserForm({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phone: user.phone || '',
        });
      }

      // Load provider data
      try {
        const { data } = await api.get('/providers/me');
        setProvider(data);
        setProviderForm({
          businessName: data.businessName || '',
          description: data.description || '',
          address: data.address || '',
        });

        // Load reviews
        const providerId = data._id || data.id;
        if (providerId) {
          try {
            const reviewsRes = await api.get(`/reviews/provider/${providerId}`);
            const reviewList = Array.isArray(reviewsRes.data)
              ? reviewsRes.data
              : reviewsRes.data.reviews || [];
            setReviews(reviewList);
          } catch {
            setReviews([]);
          }
        }
      } catch {
        setProvider(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveUser = async (e) => {
    e.preventDefault();
    setSaving((s) => ({ ...s, user: true }));
    setError((s) => ({ ...s, user: '' }));
    setSuccess((s) => ({ ...s, user: false }));
    try {
      await api.patch('/users/profile', userForm);
      await refreshUser();
      setSuccess((s) => ({ ...s, user: true }));
      setTimeout(() => setSuccess((s) => ({ ...s, user: false })), 3000);
    } catch (err) {
      setError((s) => ({
        ...s,
        user: err.response?.data?.message || 'Failed to update profile',
      }));
    } finally {
      setSaving((s) => ({ ...s, user: false }));
    }
  };

  const saveProvider = async (e) => {
    e.preventDefault();
    setSaving((s) => ({ ...s, provider: true }));
    setError((s) => ({ ...s, provider: '' }));
    setSuccess((s) => ({ ...s, provider: false }));
    try {
      const { data } = await api.post('/providers/me', providerForm);
      setProvider(data);
      setSuccess((s) => ({ ...s, provider: true }));
      setTimeout(() => setSuccess((s) => ({ ...s, provider: false })), 3000);
    } catch (err) {
      setError((s) => ({
        ...s,
        provider: err.response?.data?.message || 'Failed to update business info',
      }));
    } finally {
      setSaving((s) => ({ ...s, provider: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-work-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your personal and business information</p>
      </div>

      {/* Verification status */}
      {provider && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${
            provider.verified
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
          }`}
        >
          {provider.verified ? (
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <div>
            <p
              className={`text-sm font-medium ${
                provider.verified ? 'text-emerald-800' : 'text-amber-800'
              }`}
            >
              {provider.verified ? 'Verified Provider' : 'Pending Verification'}
            </p>
            <p
              className={`text-xs ${
                provider.verified ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              {provider.verified
                ? 'Your business has been verified. Clients can see your verified badge.'
                : 'Your account is pending admin verification. Complete your profile to speed up the process.'}
            </p>
          </div>
        </div>
      )}

      {/* Personal info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Personal Information</h2>
          <p className="text-xs text-slate-500 mt-0.5">Update your personal details</p>
        </div>
        <form onSubmit={saveUser} className="p-6 space-y-4">
          {error.user && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error.user}
            </div>
          )}
          {success.user && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
              Profile updated successfully!
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">First Name</label>
              <input
                type="text"
                required
                value={userForm.firstName}
                onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-work-primary focus:ring-2 focus:ring-work-primary/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Last Name</label>
              <input
                type="text"
                required
                value={userForm.lastName}
                onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-work-primary focus:ring-2 focus:ring-work-primary/20 focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
            <input
              type="tel"
              value={userForm.phone}
              onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-work-primary focus:ring-2 focus:ring-work-primary/20 focus:outline-none"
              placeholder="+7 (777) 123-4567"
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving.user}
              className="rounded-lg bg-work-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-work-dark transition-colors disabled:opacity-50"
            >
              {saving.user ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Business info */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Business Information</h2>
          <p className="text-xs text-slate-500 mt-0.5">Tell clients about your business</p>
        </div>
        <form onSubmit={saveProvider} className="p-6 space-y-4">
          {error.provider && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error.provider}
            </div>
          )}
          {success.provider && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
              Business info updated successfully!
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Business Name</label>
            <input
              type="text"
              required
              value={providerForm.businessName}
              onChange={(e) =>
                setProviderForm({ ...providerForm, businessName: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-work-primary focus:ring-2 focus:ring-work-primary/20 focus:outline-none"
              placeholder="Happy Paws Pet Care"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              rows={4}
              value={providerForm.description}
              onChange={(e) =>
                setProviderForm({ ...providerForm, description: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-work-primary focus:ring-2 focus:ring-work-primary/20 focus:outline-none resize-none"
              placeholder="Tell clients about your experience, qualifications, and what makes your services special..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
            <input
              type="text"
              value={providerForm.address}
              onChange={(e) =>
                setProviderForm({ ...providerForm, address: e.target.value })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-work-primary focus:ring-2 focus:ring-work-primary/20 focus:outline-none"
              placeholder="123 Main St, Almaty, Kazakhstan"
            />
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving.provider}
              className="rounded-lg bg-work-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-work-dark transition-colors disabled:opacity-50"
            >
              {saving.provider ? 'Saving...' : 'Save Business Info'}
            </button>
          </div>
        </form>
      </div>

      {/* Reviews */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Reviews</h2>
              <p className="text-xs text-slate-500 mt-0.5">What clients say about your services</p>
            </div>
            {reviews.length > 0 && (
              <div className="flex items-center gap-1.5">
                <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-semibold text-slate-900">
                  {(
                    reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
                  ).toFixed(1)}
                </span>
                <span className="text-sm text-slate-400">({reviews.length})</span>
              </div>
            )}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {reviews.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">No reviews yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Reviews will appear here once clients rate your services
              </p>
            </div>
          ) : (
            reviews.map((review) => (
              <div key={review._id || review.id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                      {review.user?.firstName?.[0] || 'C'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {review.user?.firstName || 'Client'} {review.user?.lastName || ''}
                      </p>
                      <p className="text-xs text-slate-400">
                        {review.createdAt
                          ? new Date(review.createdAt).toLocaleDateString()
                          : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`w-4 h-4 ${
                          star <= (review.rating || 0)
                            ? 'text-amber-400'
                            : 'text-slate-200'
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-slate-600 ml-10">{review.comment}</p>
                )}
                {review.service && (
                  <p className="text-xs text-slate-400 ml-10 mt-1">
                    Service: {review.service?.title || 'Unknown'}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
