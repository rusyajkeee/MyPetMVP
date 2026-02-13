import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState({
    todayBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    totalServices: 0,
  });
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [bookingsRes, providerRes] = await Promise.all([
        api.get('/bookings').catch(() => ({ data: [] })),
        api.get('/providers/me').catch(() => ({ data: { services: [] } })),
      ]);

      const bookings = Array.isArray(bookingsRes.data) ? bookingsRes.data : [];
      const services = providerRes.data?.services || [];

      const today = new Date().toISOString().slice(0, 10);
      const todayBookings = bookings.filter(
        (b) => b.scheduledAt?.slice(0, 10) === today
      ).length;
      const pendingBookings = bookings.filter(
        (b) => b.status === 'PENDING'
      ).length;
      const totalRevenue = bookings
        .filter((b) => b.status === 'COMPLETED' || b.status === 'PAID')
        .reduce((sum, b) => sum + (b.service?.priceKzt || 0), 0);

      setStats({
        todayBookings,
        pendingBookings,
        totalRevenue,
        totalServices: services.length,
      });

      setRecentBookings(
        bookings
          .sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt))
          .slice(0, 5)
      );
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-work-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of your business performance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Bookings"
          value={stats.todayBookings}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          color="bg-blue-500"
        />
        <StatCard
          label="Pending"
          value={stats.pendingBookings}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="bg-amber-500"
        />
        <StatCard
          label="Total Revenue"
          value={`${stats.totalRevenue.toLocaleString()} KZT`}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="bg-emerald-500"
        />
        <StatCard
          label="Total Services"
          value={stats.totalServices}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          color="bg-violet-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent bookings */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Bookings</h2>
            <Link to="/appointments" className="text-sm text-work-primary hover:text-work-dark font-medium">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {recentBookings.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400 text-sm">
                No bookings yet. They will appear here once clients start booking.
              </div>
            ) : (
              recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between px-6 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {b.user?.firstName || 'Client'} {b.user?.lastName || ''}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {b.service?.title || 'Service'} &middot;{' '}
                      {b.scheduledAt ? new Date(b.scheduledAt).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 ml-3 px-2.5 py-1 rounded-full text-xs font-medium ${
                      statusColor[b.status] || 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 h-fit">
          <h2 className="font-semibold text-slate-900">Quick Actions</h2>
          <Link
            to="/services"
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-work-primary/10 text-work-primary group-hover:bg-work-primary group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Add Service</p>
              <p className="text-xs text-slate-500">Create a new service offering</p>
            </div>
          </Link>
          <Link
            to="/appointments"
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">View Appointments</p>
              <p className="text-xs text-slate-500">Manage all your bookings</p>
            </div>
          </Link>
          <Link
            to="/profile"
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors group"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Edit Profile</p>
              <p className="text-xs text-slate-500">Update your business info</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
