import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACCEPTED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  PAID: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

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
              <div key={b.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">{b.service?.title}</h3>
                    <p className="text-sm text-gray-600">
                      {b.provider?.user?.firstName} {b.provider?.user?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(b.scheduledAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${statusColors[b.status] || 'bg-gray-100'}`}>
                    {b.status}
                  </span>
                </div>
                {b.status === 'COMPLETED' && !b.review && (
                  <button
                    type="button"
                    onClick={() => setReviewBooking(b)}
                    className="text-sm text-mypet-green font-medium mt-2"
                  >
                    Leave a review →
                  </button>
                )}
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
