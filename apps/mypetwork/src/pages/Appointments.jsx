import { useState, useEffect } from 'react';
import api from '../api/client';

const TABS = ['ALL', 'PENDING', 'ACCEPTED', 'PAID', 'COMPLETED', 'REJECTED'];

export default function Appointments() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const { data } = await api.get('/bookings');
      const list = Array.isArray(data) ? data : [];
      setBookings(list.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)));
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    setActionLoading(id);
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      await loadBookings();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered =
    activeTab === 'ALL'
      ? bookings
      : bookings.filter((b) => b.status === activeTab);

  const statusColor = {
    PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
    ACCEPTED: 'bg-blue-100 text-blue-700 border-blue-200',
    COMPLETED: 'bg-green-100 text-green-700 border-green-200',
    PAID: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-red-100 text-red-700 border-red-200',
    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const tabCount = (tab) =>
    tab === 'ALL'
      ? bookings.length
      : bookings.filter((b) => b.status === tab).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-work-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
        <p className="text-slate-500 text-sm mt-1">Manage all your client bookings</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'ALL' ? 'All' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            <span
              className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab
                  ? 'bg-work-primary/10 text-work-primary'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {tabCount(tab)}
            </span>
          </button>
        ))}
      </div>

      {/* Bookings list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">No appointments</h3>
          <p className="text-sm text-slate-500">
            {activeTab === 'ALL'
              ? 'You have no bookings yet.'
              : `No ${activeTab.toLowerCase()} appointments.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((booking) => {
            const isLoading = actionLoading === booking.id;
            return (
              <div
                key={booking.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {booking.user?.firstName || 'Client'} {booking.user?.lastName || ''}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {booking.user?.email || booking.user?.phone || ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 ml-2 px-2.5 py-1 rounded-full text-xs font-medium border ${
                      statusColor[booking.status] || 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>

                {/* Service info */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-work-primary/10 text-work-primary">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {booking.service?.title || 'Service'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(booking.service?.priceKzt || 0).toLocaleString()} KZT
                      {booking.service?.durationMin ? ` · ${booking.service.durationMin} min` : ''}
                    </p>
                  </div>
                </div>

                {/* Pet info */}
                {booking.pet && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>{booking.pet.name}{booking.pet.breed ? ` (${booking.pet.breed})` : ''}</span>
                  </div>
                )}

                {/* Date/time */}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>
                    {booking.scheduledAt
                      ? new Date(booking.scheduledAt).toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </span>
                </div>

                {/* Notes */}
                {booking.notes && (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 italic">
                    "{booking.notes}"
                  </p>
                )}

                {/* Actions */}
                {booking.status === 'PENDING' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => updateStatus(booking.id, 'ACCEPTED')}
                      disabled={isLoading}
                      className="flex-1 rounded-lg bg-work-primary px-3 py-2 text-sm font-medium text-white hover:bg-work-dark transition-colors disabled:opacity-50"
                    >
                      {isLoading ? '...' : 'Accept'}
                    </button>
                    <button
                      onClick={() => updateStatus(booking.id, 'REJECTED')}
                      disabled={isLoading}
                      className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? '...' : 'Reject'}
                    </button>
                  </div>
                )}

                {booking.status === 'ACCEPTED' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => updateStatus(booking.id, 'PAID')}
                      disabled={isLoading}
                      className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? '...' : 'Mark Paid'}
                    </button>
                    <button
                      onClick={() => updateStatus(booking.id, 'COMPLETED')}
                      disabled={isLoading}
                      className="flex-1 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? '...' : 'Complete'}
                    </button>
                  </div>
                )}

                {booking.status === 'PAID' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => updateStatus(booking.id, 'COMPLETED')}
                      disabled={isLoading}
                      className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? '...' : 'Mark Completed'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
