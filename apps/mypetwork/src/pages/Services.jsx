import { useState, useEffect } from 'react';
import api from '../api/client';

const CATEGORIES = ['VETERINARY', 'GROOMING', 'BOARDING', 'WALKING', 'TRANSPORT'];

// Support both camelCase (Prisma) and snake_case (DB raw) from API; normalize to number for display
const price = (s) => Number(s?.priceKzt ?? s?.price_kzt ?? 0) || 0;
const duration = (s) => {
  const v = s?.durationMin ?? s?.duration_min;
  return v != null && v !== '' ? Number(v) : null;
};

const emptyForm = {
  title: '',
  description: '',
  category: 'VETERINARY',
  priceKzt: '',
  durationMin: '',
};

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [provRes, bookRes] = await Promise.all([
        api.get('/providers/me'),
        api.get('/bookings'),
      ]);
      setServices(provRes.data?.services || []);
      setBookings(Array.isArray(bookRes.data) ? bookRes.data : []);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };

  const openEditForm = (service) => {
    setEditing(service.id);
    setForm({
      title: service.title || '',
      description: service.description || '',
      category: service.category || 'VETERINARY',
      priceKzt: (service.priceKzt ?? service.price_kzt)?.toString() ?? '',
      durationMin: (service.durationMin ?? service.duration_min)?.toString() ?? '',
    });
    setError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setForm(emptyForm);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      category: form.category,
      priceKzt: Math.max(0, Number(form.priceKzt) || 0),
      durationMin: form.durationMin !== '' && form.durationMin != null ? Math.max(0, Number(form.durationMin)) : null,
    };

    try {
      if (editing) {
        await api.patch(`/services/${editing}`, payload);
      } else {
        await api.post('/services', payload);
      }
      closeForm();
      await loadData();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message;
      setError(msg || (err.response?.status === 400 ? 'Invalid data. Check price (KZT) and duration.' : 'Failed to save service'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/services/${id}`);
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete');
    }
  };

  const statusColor = {
    PENDING: 'bg-amber-100 text-amber-700',
    ACCEPTED: 'bg-blue-100 text-blue-700',
    COMPLETED: 'bg-green-100 text-green-700',
    PAID: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-slate-100 text-slate-600',
  };

  const handleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const updateBookingStatus = async (bookingId, status) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? { ...b, status } : b)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Services</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your service offerings</p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 rounded-lg bg-work-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-work-dark transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Service
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {/* Service Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">
                {editing ? 'Edit Service' : 'Add New Service'}
              </h3>
              <button onClick={closeForm} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-work-primary focus:ring-2 focus:ring-work-primary/20 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm placeholder-slate-400 focus:border-work-primary focus:ring-2 focus:ring-work-primary/20 focus:outline-none"
                  placeholder="e.g. Full Veterinary Check"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm placeholder-slate-400 focus:border-work-primary focus:ring-2 focus:ring-work-primary/20 focus:outline-none resize-none"
                  placeholder="Describe what this service includes..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Price (KZT)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={form.priceKzt}
                    onChange={(e) => setForm({ ...form, priceKzt: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm placeholder-slate-400 focus:border-work-primary focus:ring-2 focus:ring-work-primary/20 focus:outline-none"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Duration (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={form.durationMin}
                    onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm placeholder-slate-400 focus:border-work-primary focus:ring-2 focus:ring-work-primary/20 focus:outline-none"
                    placeholder="60"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-lg bg-work-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-work-dark disabled:opacity-50">
                  {saving ? 'Saving...' : editing ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Service?</h3>
            <p className="text-sm text-slate-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirm(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Services list */}
      {services.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No services yet</h3>
          <p className="text-sm text-slate-500 mb-6">Create your first service to start receiving bookings</p>
          <button onClick={openAddForm} className="inline-flex items-center gap-2 rounded-lg bg-work-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-work-dark">
            + Add Your First Service
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <div className="col-span-4">Service</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2">Price</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y divide-slate-100">
            {services.map((service) => {
              const isExpanded = expandedId === service.id;
              const serviceBookings = bookings.filter((b) => (b.serviceId ?? b.service_id) === service.id);
              return (
                <div key={service.id}>
                  <div className="md:grid md:grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50/50">
                    <div className="col-span-4 mb-2 md:mb-0">
                      <p className="text-sm font-semibold text-slate-900">{service.title}</p>
                      {service.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{service.description}</p>}
                    </div>
                    <div className="col-span-2 mb-2 md:mb-0">
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">{service.category}</span>
                    </div>
                    <div className="col-span-2 mb-2 md:mb-0">
                      <span className="text-sm font-medium text-slate-900">{price(service).toLocaleString()} KZT</span>
                    </div>
                    <div className="col-span-2 mb-2 md:mb-0">
                      <span className="text-sm text-slate-600">{duration(service) != null ? `${duration(service)} min` : '—'}</span>
                    </div>
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button onClick={() => handleExpand(service.id)} className="p-2 rounded-lg text-slate-400 hover:text-work-primary hover:bg-work-primary/5" title="View bookings">
                        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <button onClick={() => openEditForm(service)} className="p-2 rounded-lg text-slate-400 hover:text-work-primary hover:bg-work-primary/5" title="Edit">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteConfirm(service.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50" title="Delete">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-6 pb-4 bg-slate-50/50">
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200">
                          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Bookings for this service</h4>
                        </div>
                        {serviceBookings.length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-slate-400">No bookings yet</div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {serviceBookings.map((b) => (
                              <div key={b.id} className="flex items-center justify-between px-4 py-3">
                                <div>
                                  <p className="text-sm font-medium text-slate-900">{b.user?.firstName} {b.user?.lastName}</p>
                                  <p className="text-xs text-slate-500">{new Date(b.scheduledAt).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[b.status] || 'bg-slate-100 text-slate-600'}`}>{b.status}</span>
                                  {b.status === 'PENDING' && (
                                    <>
                                      <button onClick={() => updateBookingStatus(b.id, 'ACCEPTED')} className="text-xs text-work-primary font-medium hover:underline">Accept</button>
                                      <button onClick={() => updateBookingStatus(b.id, 'REJECTED')} className="text-xs text-red-600 font-medium hover:underline">Reject</button>
                                    </>
                                  )}
                                  {b.status === 'ACCEPTED' && (
                                    <>
                                      <button onClick={() => updateBookingStatus(b.id, 'PAID')} className="text-xs text-work-primary font-medium hover:underline">Paid</button>
                                      <button onClick={() => updateBookingStatus(b.id, 'COMPLETED')} className="text-xs text-slate-600 font-medium hover:underline">Complete</button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
