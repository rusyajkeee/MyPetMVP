import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

function Timeline({ booking }) {
  const steps = [
    { label: 'Pending', status: 'PENDING', done: true }, // Always starts at pending
    { label: 'Accepted', status: 'ACCEPTED', done: !!booking.acceptedAt || booking.status === 'ACCEPTED' || booking.status === 'IN_PROGRESS' || booking.status === 'COMPLETED' },
    { label: 'In Progress', status: 'IN_PROGRESS', done: !!booking.startedAt || booking.status === 'IN_PROGRESS' || booking.status === 'COMPLETED' },
    { label: 'Completed', status: 'COMPLETED', done: !!booking.completedAt || booking.status === 'COMPLETED' }
  ];

  if (booking.status === 'CANCELLED') {
    return <div className="text-xs text-red-500 font-medium py-2">This booking was cancelled.</div>;
  }
  return (
    <div className="flex items-center justify-between mt-4 text-[10px] sm:text-xs">
      {steps.map((step, idx) => (
        <div key={idx} className="flex flex-col items-center flex-1 relative z-10">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold relative z-10 
            ${step.done ? 'bg-mypet-green text-white shadow' : 'bg-gray-200 text-gray-400'}`}>
            {step.done ? '✓' : ''}
          </div>
          <span className={`mt-1 font-medium text-center ${step.done ? 'text-gray-800' : 'text-gray-400'}`}>
            {step.label}
          </span>
          {idx < steps.length - 1 && (
            <div className={`absolute top-2.5 left-1/2 w-full h-[2px] -z-10 bg-gray-200`}>
              <div className={`h-full bg-mypet-green transition-all ${steps[idx + 1].done ? 'w-full' : 'w-0'}`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function UserDashboard() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitReview, setSubmitReview] = useState(false);

  useEffect(() => {
    api.get('/bookings').then(({ data }) => setBookings(data)).finally(() => setLoading(false));
  }, []);

  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!reviewBooking) return;
    setSubmitReview(true);
    try {
      await api.post('/reviews', { bookingId: reviewBooking.id, rating, comment });
      setReviewBooking(null);
      setComment('');
      setRating(5);
      const { data } = await api.get('/bookings');
      setBookings(data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitReview(false);
    }
  }

  async function cancelBooking(id) {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;
    try {
      await api.patch(`/bookings/${id}/status`, { status: 'CANCELLED' });
      const { data } = await api.get('/bookings');
      setBookings(data);
    } catch (err) {
      alert("Failed to cancel booking.");
    }
  }

  return (
    <div className="max-w-lg mx-auto pb-6">
      <header className="bg-mypet-green text-white px-6 py-6 rounded-b-3xl">
        <h1 className="text-xl font-bold">My Bookings</h1>
      </header>
      <div className="px-6 py-6">
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : bookings.length === 0 ? (
          <p className="text-gray-500">No bookings yet. <Link to="/discover" className="text-mypet-green font-medium">Discover services</Link></p>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <div key={b.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{b.service?.title}</h3>
                    <div className="flex items-center gap-1 mt-0.5 mb-1">
                       <div className="w-5 h-5 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                         {b.provider?.user?.avatarUrl ? (
                           <img src={b.provider.user.avatarUrl} className="w-full h-full object-cover" />
                         ) : (
                           <span className="flex items-center justify-center text-[10px] w-full h-full">📍</span>
                         )}
                       </div>
                       <span className="text-sm text-gray-600 font-medium">
                         {b.provider?.user?.firstName} {b.provider?.user?.lastName}
                       </span>
                    </div>
                    <p className="text-sm text-gray-500 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(b.scheduledAt).toLocaleString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric',
                        hour: 'numeric', minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <span className={`text-[10px] tracking-wide font-bold px-2 py-1 rounded-full ${statusColors[b.status] || 'bg-gray-100 text-gray-600'}`}>
                    {b.status}
                  </span>
                </div>
                
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <Timeline booking={b} />
                </div>
                
                <div className="mt-3 flex gap-2">
                  {(b.status === 'PENDING' || b.status === 'ACCEPTED') && (
                    <button
                      onClick={() => cancelBooking(b.id)}
                      className="text-xs font-semibold px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                    >
                      Cancel Booking
                    </button>
                  )}
                  {b.status === 'COMPLETED' && !b.review && (
                    <button
                      type="button"
                      onClick={() => setReviewBooking(b)}
                      className="text-sm text-mypet-green font-medium"
                    >
                      Leave a review →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={handleSubmitReview} className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-4">Leave a review</h3>
            <p className="text-sm text-gray-600 mb-4">{reviewBooking.service?.title}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRating(r)}
                    className={`w-10 h-10 rounded-full font-medium ${rating >= r ? 'bg-yellow-400 text-gray-900' : 'bg-gray-200 text-gray-500'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <textarea
              placeholder="Comment (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-xl border border-gray-300 mb-4"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setReviewBooking(null)} className="flex-1 py-2 rounded-xl border border-gray-300">
                Cancel
              </button>
              <button type="submit" disabled={submitReview} className="flex-1 py-2 rounded-xl bg-mypet-green text-white font-medium disabled:opacity-50">
                Submit
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
