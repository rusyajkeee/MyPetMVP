import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

function toISO(date) {
  return date.toISOString().slice(0, 16);
}

export default function BookingForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [pets, setPets] = useState([]);
  const [serviceId, setServiceId] = useState('');
  const [petId, setPetId] = useState('');
  const [datePart, setDatePart] = useState('');
  const [timePart, setTimePart] = useState('11:00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get(`/providers/${id}`).then((r) => r.data),
      api.get('/users/pets').then((r) => r.data),
    ])
      .then(([prov, petList]) => {
        setProvider(prov);
        setServices(prov.services || []);
        if (prov.services?.length) setServiceId(prov.services[0].id);
        setPets(petList);
        if (petList.length) setPetId(petList[0].id);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setDatePart(tomorrow.toISOString().slice(0, 10));
      })
      .catch(() => setProvider(null))
      .finally(() => setLoading(false));
  }, [id, user]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <p className="text-gray-600 mb-4">Please sign in to book an appointment.</p>
        <Link to="/login" className="inline-block px-6 py-3 bg-mypet-green text-white rounded-2xl font-semibold">Sign In</Link>
      </div>
    );
  }

  if (loading || !provider) {
    return <div className="p-6 text-center text-gray-400">Loading...</div>;
  }

  const name = provider.user
    ? `${provider.user.firstName} ${provider.user.lastName}`
    : provider.businessName || 'Provider';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!datePart) { setError('Please select a date.'); return; }
    setSubmitting(true);
    try {
      const scheduledAt = new Date(`${datePart}T${timePart}:00`).toISOString();
      await api.post('/bookings', {
        serviceId,
        petId: petId || undefined,
        scheduledAt,
        notes: notes || undefined,
      });
      navigate('/bookings');
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-mypet-green px-5 pt-10 pb-6 flex items-center gap-3 rounded-b-[2.5rem]">
        <Link to={`/provider/${id}`} className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition">
          ‹
        </Link>
        <div>
          <h1 className="text-white text-lg font-bold truncate">{name}</h1>
          <p className="text-green-200 text-xs">Book an Appointment</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5 pb-32">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Service selector */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">Select Service</label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mypet-green text-sm"
            required
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.title} — {s.priceKzt?.toLocaleString()} ₸</option>
            ))}
          </select>
        </div>

        {/* Date picker */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">📅 Choose a Date</label>
          <input
            type="date"
            value={datePart}
            min={minDate}
            onChange={(e) => setDatePart(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mypet-green text-sm"
            required
          />
        </div>

        {/* Time slots */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="block text-sm font-bold text-gray-700 mb-3">⏰ Pick a Time</label>
          <div className="grid grid-cols-4 gap-2">
            {TIME_SLOTS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTimePart(t)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition ${
                  timePart === t
                    ? 'bg-mypet-green text-white shadow-md shadow-green-200'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-mypet-green'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Pet selector */}
        {pets.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">🐾 Select Pet (optional)</label>
            <select
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mypet-green text-sm"
            >
              <option value="">No pet selected</option>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>{p.name}{p.breed ? ` (${p.breed})` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <label className="block text-sm font-bold text-gray-700 mb-2">📝 Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mypet-green text-sm resize-none"
            placeholder="Any special requests or information..."
          />
        </div>
      </form>

      {/* Sticky submit button */}
      <div className="fixed bottom-20 inset-x-0 px-5 max-w-lg mx-auto left-0 right-0">
        <button
          type="submit"
          form="booking-form"
          disabled={submitting}
          onClick={handleSubmit}
          className="w-full py-4 rounded-2xl bg-mypet-green text-white text-center font-bold text-base shadow-lg shadow-green-200 hover:bg-mypet-green-dark transition disabled:opacity-60"
        >
          {submitting ? 'Booking...' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  );
}
