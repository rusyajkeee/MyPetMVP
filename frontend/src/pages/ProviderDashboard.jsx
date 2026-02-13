import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const CATEGORIES = ['VETERINARY', 'GROOMING', 'BOARDING', 'WALKING', 'TRANSPORT'];
const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  PAID: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

const defaultServiceForm = {
  category: 'VETERINARY',
  title: '',
  description: '',
  priceKzt: '',
  durationMin: '',
};

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [tab, setTab] = useState('services'); // 'services' | 'appointments' | 'profile'
  const [provider, setProvider] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileForm, setProfileForm] = useState({ businessName: '', description: '', address: '' });
  const [profileError, setProfileError] = useState('');
  const [serviceForm, setServiceForm] = useState(defaultServiceForm);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [showAddService, setShowAddService] = useState(false);
  const [expandedServiceId, setExpandedServiceId] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [profileTabSaving, setProfileTabSaving] = useState(false);

  function loadAll() {
    setLoading(true);
    Promise.allSettled([
      api.get('/providers/me').then((r) => r.data),
      api.get('/bookings').then((r) => r.data),
    ]).then(([providerRes, bookingsRes]) => {
      const prov = providerRes.status === 'fulfilled' ? providerRes.value : null;
      setProvider(prov);
      setBookings(bookingsRes.status === 'fulfilled' ? bookingsRes.value : []);
      if (prov) {
        setProfileForm({
          businessName: prov.businessName || '',
          description: prov.description || '',
          address: prov.address || '',
        });
      }
    }).finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (tab === 'profile' && provider) {
      api.get('/reviews/provider/' + provider.id).then((r) => setReviews(r.data)).catch(() => setReviews([]));
      api.get('/users/profile').then((r) => setUserProfile(r.data)).catch(() => setUserProfile(null));
    }
  }, [tab, provider?.id]);

  async function handleCreateProfile(e) {
    e.preventDefault();
    setProfileError('');
    try {
      await api.post('/providers/me', profileForm);
      const { data } = await api.get('/providers/me');
      setProvider(data);
      setShowProfileForm(false);
    } catch (err) {
      setProfileError(err.response?.data?.error || 'Failed');
    }
  }

  async function updateBookingStatus(bookingId, status) {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));
    } catch (e) {
      setError(e.response?.data?.error || 'Failed');
    }
  }

  async function handleAddService(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/services', {
        category: serviceForm.category,
        title: serviceForm.title,
        description: serviceForm.description || undefined,
        priceKzt: Number(serviceForm.priceKzt) || 0,
        durationMin: serviceForm.durationMin ? Number(serviceForm.durationMin) : undefined,
      });
      setServiceForm(defaultServiceForm);
      setShowAddService(false);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create service');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateService(e) {
    e.preventDefault();
    if (!editingServiceId) return;
    setError('');
    setSubmitting(true);
    try {
      await api.patch(`/services/${editingServiceId}`, {
        category: serviceForm.category,
        title: serviceForm.title,
        description: serviceForm.description || undefined,
        priceKzt: serviceForm.priceKzt === '' ? undefined : Number(serviceForm.priceKzt),
        durationMin: serviceForm.durationMin === '' ? undefined : Number(serviceForm.durationMin),
      });
      setEditingServiceId(null);
      setServiceForm(defaultServiceForm);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteService(id) {
    if (!confirm('Delete this service? Existing bookings will keep the service name but the service will be removed.')) return;
    setError('');
    try {
      await api.delete(`/services/${id}`);
      setEditingServiceId(null);
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
    }
  }

  function startEditService(s) {
    setEditingServiceId(s.id);
    setServiceForm({
      category: s.category,
      title: s.title,
      description: s.description || '',
      priceKzt: String(s.priceKzt ?? ''),
      durationMin: s.durationMin ? String(s.durationMin) : '',
    });
  }

  async function saveProviderProfile(e) {
    e.preventDefault();
    setProfileTabSaving(true);
    setError('');
    try {
      await api.post('/providers/me', profileForm);
      const { data } = await api.get('/providers/me');
      setProvider(data);
      setProfileForm({ businessName: data.businessName || '', description: data.description || '', address: data.address || '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setProfileTabSaving(false);
    }
  }

  async function saveUserProfile(e) {
    e.preventDefault();
    if (!userProfile) return;
    setProfileTabSaving(true);
    setError('');
    try {
      await api.patch('/users/profile', { firstName: userProfile.firstName, lastName: userProfile.lastName, phone: userProfile.phone });
      const { data } = await api.get('/users/profile');
      setUserProfile(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setProfileTabSaving(false);
    }
  }

  if (loading && !provider) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!provider && !showProfileForm) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-mypet-green text-white px-6 py-12 rounded-b-3xl">
          <h1 className="text-2xl font-bold">Provider dashboard</h1>
          <p className="text-white/90 mt-1">Create your profile to get started</p>
        </div>
        <div className="px-6 py-8 max-w-lg mx-auto">
          <p className="text-gray-600 mb-6">Create your provider profile to add services and receive bookings.</p>
          <button
            type="button"
            onClick={() => setShowProfileForm(true)}
            className="w-full py-3 rounded-xl bg-mypet-green text-white font-semibold"
          >
            Create provider profile
          </button>
        </div>
      </div>
    );
  }

  if (!provider && showProfileForm) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-mypet-green text-white px-6 py-12 rounded-b-3xl">
          <h1 className="text-2xl font-bold">Create provider profile</h1>
        </div>
        <form onSubmit={handleCreateProfile} className="px-6 py-8 max-w-lg mx-auto space-y-4">
          {profileError && <p className="text-red-600 text-sm">{profileError}</p>}
          <input
            placeholder="Business name (optional)"
            value={profileForm.businessName}
            onChange={(e) => setProfileForm((f) => ({ ...f, businessName: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white"
          />
          <textarea
            placeholder="Description (optional)"
            value={profileForm.description}
            onChange={(e) => setProfileForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white"
          />
          <input
            placeholder="Address (optional)"
            value={profileForm.address}
            onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowProfileForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-300 bg-white">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-mypet-green text-white font-semibold">Create</button>
          </div>
        </form>
      </div>
    );
  }

  const services = provider?.services || [];

  const tabs = [
    { id: 'services', label: 'My Services' },
    { id: 'appointments', label: 'Appointments' },
    { id: 'profile', label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <header className="bg-mypet-green text-white px-6 pt-6 pb-4 rounded-b-3xl sticky top-0 z-10 shadow">
        <h1 className="text-xl font-bold">Provider dashboard</h1>
        <nav className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                tab === t.id ? 'bg-white text-mypet-green' : 'bg-white/20 text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-lg mx-auto px-6 py-6">
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {tab === 'services' && (
          <>
            {!showAddService && !editingServiceId && (
              <button
                type="button"
                onClick={() => setShowAddService(true)}
                className="w-full py-3 rounded-xl bg-mypet-green text-white font-semibold mb-6"
              >
                + Add service
              </button>
            )}

            {showAddService && (
              <form onSubmit={handleAddService} className="bg-white rounded-2xl p-5 shadow mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">New service</h3>
                <div className="space-y-3">
                  <select
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                    required
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Service name (e.g. Full Veterinary Check)"
                    value={serviceForm.title}
                    onChange={(e) => setServiceForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                    required
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                  />
                  <input
                    type="number"
                    placeholder="Price (KZT)"
                    value={serviceForm.priceKzt}
                    onChange={(e) => setServiceForm((f) => ({ ...f, priceKzt: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                    min={0}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Duration (minutes, optional)"
                    value={serviceForm.durationMin}
                    onChange={(e) => setServiceForm((f) => ({ ...f, durationMin: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                    min={0}
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick={() => { setShowAddService(false); setServiceForm(defaultServiceForm); }} className="flex-1 py-2 rounded-xl border border-gray-300">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-xl bg-mypet-green text-white font-medium disabled:opacity-50">Create</button>
                </div>
              </form>
            )}

            {editingServiceId && (
              <form onSubmit={handleUpdateService} className="bg-white rounded-2xl p-5 shadow mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Edit service</h3>
                <div className="space-y-3">
                  <select
                    value={serviceForm.category}
                    onChange={(e) => setServiceForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Service name"
                    value={serviceForm.title}
                    onChange={(e) => setServiceForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                    required
                  />
                  <textarea
                    placeholder="Description"
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                  />
                  <input
                    type="number"
                    placeholder="Price (KZT)"
                    value={serviceForm.priceKzt}
                    onChange={(e) => setServiceForm((f) => ({ ...f, priceKzt: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                    min={0}
                  />
                  <input
                    type="number"
                    placeholder="Duration (minutes)"
                    value={serviceForm.durationMin}
                    onChange={(e) => setServiceForm((f) => ({ ...f, durationMin: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                    min={0}
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick={() => { setEditingServiceId(null); setServiceForm(defaultServiceForm); }} className="flex-1 py-2 rounded-xl border border-gray-300">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-2 rounded-xl bg-mypet-green text-white font-medium disabled:opacity-50">Save</button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {services.length === 0 ? (
                <p className="text-gray-500">No services yet. Add one to appear in Discover after admin verification.</p>
              ) : (
                services.map((s) => (
                  <div key={s.id} className="bg-white rounded-2xl shadow overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedServiceId(expandedServiceId === s.id ? null : s.id)}
                      className="w-full px-5 py-4 text-left flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{s.title}</p>
                        <p className="text-sm text-gray-500">{s.category} · {s.priceKzt?.toLocaleString()} KZT</p>
                      </div>
                      <span className="text-gray-400">{expandedServiceId === s.id ? '▼' : '▶'}</span>
                    </button>
                    {expandedServiceId === s.id && (
                      <div className="px-5 pb-5 border-t border-gray-100">
                        {s.description && <p className="text-sm text-gray-600 mt-3">{s.description}</p>}
                        <div className="flex gap-2 mt-3">
                          <button type="button" onClick={() => startEditService(s)} className="text-sm font-medium text-mypet-green">Edit name, price, description</button>
                          <button type="button" onClick={() => handleDeleteService(s.id)} className="text-sm font-medium text-red-600">Delete</button>
                        </div>
                        <h4 className="font-medium text-gray-900 mt-4 mb-2">Bookings for this service</h4>
                        {bookings.filter((b) => b.serviceId === s.id).length === 0 ? (
                          <p className="text-sm text-gray-500">No bookings yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {bookings.filter((b) => b.serviceId === s.id).map((b) => (
                              <div key={b.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                <div>
                                  <p className="text-sm font-medium">{b.user?.firstName} {b.user?.lastName}</p>
                                  <p className="text-xs text-gray-500">{new Date(b.scheduledAt).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${statusColors[b.status] || 'bg-gray-100'}`}>{b.status}</span>
                                  {b.status === 'PENDING' && (
                                    <>
                                      <button type="button" onClick={() => updateBookingStatus(b.id, 'ACCEPTED')} className="text-xs text-mypet-green font-medium">Accept</button>
                                      <button type="button" onClick={() => updateBookingStatus(b.id, 'REJECTED')} className="text-xs text-red-600 font-medium">Reject</button>
                                    </>
                                  )}
                                  {b.status === 'ACCEPTED' && (
                                    <>
                                      <button type="button" onClick={() => updateBookingStatus(b.id, 'PAID')} className="text-xs text-mypet-green font-medium">Paid</button>
                                      <button type="button" onClick={() => updateBookingStatus(b.id, 'COMPLETED')} className="text-xs text-gray-600 font-medium">Complete</button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === 'appointments' && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">All appointments across your services.</p>
            {bookings.length === 0 ? (
              <p className="text-gray-500">No appointments yet.</p>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="bg-white rounded-2xl p-5 shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{b.service?.title}</h3>
                      <p className="text-sm text-gray-600">{b.user?.firstName} {b.user?.lastName}</p>
                      <p className="text-sm text-gray-500">{new Date(b.scheduledAt).toLocaleString()}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${statusColors[b.status] || 'bg-gray-100'}`}>{b.status}</span>
                  </div>
                  {b.status === 'PENDING' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => updateBookingStatus(b.id, 'ACCEPTED')} className="flex-1 py-2 rounded-xl bg-mypet-green text-white text-sm font-medium">Accept</button>
                      <button onClick={() => updateBookingStatus(b.id, 'REJECTED')} className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium">Reject</button>
                    </div>
                  )}
                  {b.status === 'ACCEPTED' && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => updateBookingStatus(b.id, 'PAID')} className="flex-1 py-2 rounded-xl bg-mypet-green text-white text-sm font-medium">Mark Paid</button>
                      <button onClick={() => updateBookingStatus(b.id, 'COMPLETED')} className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium">Complete</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'profile' && (
          <div className="space-y-6">
            {userProfile && (
              <form onSubmit={saveUserProfile} className="bg-white rounded-2xl p-5 shadow">
                <h3 className="font-semibold text-gray-900 mb-4">Your name</h3>
                <div className="space-y-3">
                  <input
                    placeholder="First name"
                    value={userProfile.firstName || ''}
                    onChange={(e) => setUserProfile((p) => ({ ...p, firstName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                  />
                  <input
                    placeholder="Last name"
                    value={userProfile.lastName || ''}
                    onChange={(e) => setUserProfile((p) => ({ ...p, lastName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                  />
                  <input
                    placeholder="Phone"
                    value={userProfile.phone || ''}
                    onChange={(e) => setUserProfile((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                  />
                </div>
                <button type="submit" disabled={profileTabSaving} className="mt-4 w-full py-2.5 rounded-xl bg-mypet-green text-white font-medium disabled:opacity-50">Save name & phone</button>
              </form>
            )}

            <form onSubmit={saveProviderProfile} className="bg-white rounded-2xl p-5 shadow">
              <h3 className="font-semibold text-gray-900 mb-4">Business info</h3>
              <div className="space-y-3">
                <input
                  placeholder="Business name"
                  value={profileForm.businessName}
                  onChange={(e) => setProfileForm((f) => ({ ...f, businessName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                />
                <textarea
                  placeholder="Description"
                  value={profileForm.description}
                  onChange={(e) => setProfileForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                />
                <input
                  placeholder="Address"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300"
                />
              </div>
              <button type="submit" disabled={profileTabSaving} className="mt-4 w-full py-2.5 rounded-xl bg-mypet-green text-white font-medium disabled:opacity-50">Save business info</button>
            </form>

            <div className="bg-white rounded-2xl p-5 shadow">
              <h3 className="font-semibold text-gray-900 mb-4">Reviews</h3>
              {reviews.length === 0 ? (
                <p className="text-gray-500 text-sm">No reviews yet.</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-500">★</span>
                        <span className="font-medium">{r.rating}/5</span>
                        <span className="text-sm text-gray-500">{r.user?.firstName} {r.user?.lastName}</span>
                      </div>
                      {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => { logout(); navigate('/'); }}
              className="w-full py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-medium"
            >
              Sign out
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
