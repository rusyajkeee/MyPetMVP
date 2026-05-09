import { useState, useEffect } from 'react';
import api from '../api/client';

const TABS = ['ALL', 'PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export default function Appointments() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);

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
    IN_PROGRESS: 'bg-purple-100 text-purple-700 border-purple-200',
    COMPLETED: 'bg-green-100 text-green-700 border-green-200',
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
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'ALL' ? 'All' : tab.replace('_', ' ').charAt(0) + tab.replace('_', ' ').slice(1).toLowerCase()}
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
                      onClick={() => updateStatus(booking.id, 'CANCELLED')}
                      disabled={isLoading}
                      className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? '...' : 'Cancel'}
                    </button>
                  </div>
                )}

                {booking.status === 'ACCEPTED' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => updateStatus(booking.id, 'IN_PROGRESS')}
                      disabled={isLoading}
                      className="flex-1 rounded-lg bg-work-primary px-3 py-2 text-sm font-medium text-white hover:bg-work-dark transition-colors disabled:opacity-50"
                    >
                      {isLoading ? '...' : 'Start Service'}
                    </button>
                    <button
                      onClick={() => updateStatus(booking.id, 'CANCELLED')}
                      disabled={isLoading}
                      className="flex-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? '...' : 'Cancel'}
                    </button>
                  </div>
                )}

                {booking.status === 'IN_PROGRESS' && (
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

                <button 
                  onClick={() => setSelectedBooking(booking)}
                  className="w-full text-center text-sm text-slate-500 hover:text-work-primary font-medium pt-2 border-t mt-3"
                >
                  View Details & Timeline
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Booking Details</h2>
                <p className="text-sm text-slate-500">ID: {selectedBooking.id}</p>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl">
                 <h4 className="text-xs font-semibold uppercase text-slate-500 mb-1">Timeline</h4>
                 <div className="space-y-3 mt-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {/* Timeline items based on timestamps */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-slate-400 text-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                      <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-bold text-slate-900 text-sm">Created</div>
                          <time className="text-xs text-slate-500">{new Date(selectedBooking.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                        </div>
                        <div className="text-xs text-slate-500">{new Date(selectedBooking.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {selectedBooking.acceptedAt && (
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-blue-500 text-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-bold text-slate-900 text-sm">Accepted</div>
                            <time className="text-xs text-slate-500">{new Date(selectedBooking.acceptedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                          </div>
                          <div className="text-xs text-slate-500">{new Date(selectedBooking.acceptedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    )}
                    
                    {selectedBooking.startedAt && (
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-purple-500 text-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-bold text-slate-900 text-sm">In Progress</div>
                            <time className="text-xs text-slate-500">{new Date(selectedBooking.startedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                          </div>
                          <div className="text-xs text-slate-500">{new Date(selectedBooking.startedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    )}
                    
                    {selectedBooking.completedAt && (
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-green-500 text-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-bold text-slate-900 text-sm">Completed</div>
                            <time className="text-xs text-slate-500">{new Date(selectedBooking.completedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                          </div>
                          <div className="text-xs text-slate-500">{new Date(selectedBooking.completedAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    )}
                    
                    {selectedBooking.cancelledAt && (
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white bg-red-500 text-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2" />
                        <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-bold text-slate-900 text-sm">Cancelled</div>
                            <time className="text-xs text-slate-500">{new Date(selectedBooking.cancelledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</time>
                          </div>
                          <div className="text-xs text-slate-500">{new Date(selectedBooking.cancelledAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    )}
                 </div>
              </div>
            </div>

            <button onClick={() => setSelectedBooking(null)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold py-3 rounded-lg transition-colors">
               Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
