import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

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
  const [scheduledAt, setScheduledAt] = useState('');
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
        tomorrow.setHours(11, 30, 0, 0);
        setScheduledAt(toISO(tomorrow));
      })
      .catch(() => setProvider(null))
      .finally(() => setLoading(false));
  }, [id, user]);

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 mb-4">Please sign in to book.</p>
        <Link to="/login" className="text-mypet-green font-medium">Sign in</Link>
      </div>
    );
  }

  if (loading || !provider) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  const name = provider.user ? `${provider.user.firstName} ${provider.user.lastName}` : provider.businessName || 'Provider';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/bookings', {
        serviceId,
        petId: petId || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(),
        notes: notes || undefined,
      });
      navigate('/bookings');
    } catch (err) {
      setError(err.response?.data?.error || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }

  const timeSlots = ['09:30', '10:30', '11:30', '15:30', '16:30', '17:30'];
  const [datePart, timePart] = scheduledAt ? scheduledAt.split('T') : ['', '11:30'];
  const setTime = (t) => setScheduledAt(`${datePart}T${t}`);

  return (
    <div className="max-w-lg mx-auto pb-6">
      <header className="bg-mypet-green text-white px-6 py-6 flex items-center gap-4">
        <Link to={`/provider/${id}`} className="text-white p-1">←</Link>
        <h1 className="text-xl font-bold flex-1 truncate">{name}</h1>
      </header>
      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div>
          <label className="block font-semibold text-gray-900 mb-2">Service</label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300"
            required
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.title} – {s.priceKzt} KZT</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-gray-900 mb-2">Choose a Date</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white"
            required
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-900 mb-2">Pick a Time</label>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                className={`py-2 rounded-lg border font-medium ${
                  timePart === t ? 'bg-mypet-green text-white border-mypet-green' : 'bg-white border-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {pets.length > 0 && (
          <div>
            <label className="block font-semibold text-gray-900 mb-2">Pet (optional)</label>
            <select
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300"
            >
              <option value="">None</option>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>{p.name} {p.breed ? `(${p.breed})` : ''}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block font-semibold text-gray-900 mb-2">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-4 py-3 rounded-xl border border-gray-300"
            placeholder="Special requests..."
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-mypet-green text-white font-semibold disabled:opacity-50"
        >
          Book an Appointment
        </button>
      </form>
    </div>
  );
}
