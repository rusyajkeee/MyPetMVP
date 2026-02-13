import { useState } from 'react';
import api from '../api/client';

export default function Users() {
  const [userId, setUserId] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleBlock = async (e) => {
    e.preventDefault();
    if (!userId.trim()) return;
    setActionLoading('block');
    setMessage({ type: '', text: '' });
    try {
      await api.post(`/admin/users/${userId.trim()}/block`);
      setMessage({ type: 'success', text: `User ${userId.trim()} has been blocked.` });
      setUserId('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to block user' });
    } finally {
      setActionLoading('');
    }
  };

  const handleUnblock = async (e) => {
    e.preventDefault();
    if (!userId.trim()) return;
    setActionLoading('unblock');
    setMessage({ type: '', text: '' });
    try {
      await api.post(`/admin/users/${userId.trim()}/unblock`);
      setMessage({ type: 'success', text: `User ${userId.trim()} has been unblocked.` });
      setUserId('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to unblock user' });
    } finally {
      setActionLoading('');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500 mt-1">Manage platform user accounts</p>
      </div>

      {/* User list placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-8 mb-6 text-center">
        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-1">User management coming soon</h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">
          Full user listing requires the admin users endpoint. Use the form below to manage individual users by ID.
        </p>
      </div>

      {/* Block/Unblock Form */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">User Actions</h2>
          <p className="text-sm text-gray-500 mt-0.5">Block or unblock a user by their ID</p>
        </div>
        <div className="p-6">
          {message.text && (
            <div
              className={`mb-4 p-3 rounded-lg border ${
                message.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-600'
              }`}
            >
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">User ID</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter user ID"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-admin-primary focus:border-transparent outline-none transition-all text-sm"
              />
            </div>
            <button
              onClick={handleBlock}
              disabled={!userId.trim() || !!actionLoading}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'block' ? 'Blocking...' : 'Block User'}
            </button>
            <button
              onClick={handleUnblock}
              disabled={!userId.trim() || !!actionLoading}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading === 'unblock' ? 'Unblocking...' : 'Unblock User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
