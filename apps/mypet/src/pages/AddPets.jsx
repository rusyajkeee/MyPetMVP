import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';

const SPECIES_EMOJI = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', fish: '🐟' };
function petEmoji(species) {
  if (!species) return '🐾';
  const s = species.toLowerCase();
  for (const [key, val] of Object.entries(SPECIES_EMOJI)) {
    if (s.includes(key)) return val;
  }
  return '🐾';
}

export default function AddPets() {
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '', breed: '', species: '', gender: '', age: '', weight: '', height: '', color: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get('/users/pets').then(({ data }) => setPets(data)).finally(() => setLoading(false));
  }, []);

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSubmitting(true);
    try {
      await api.post('/users/pets', form);
      const { data } = await api.get('/users/pets');
      setPets(data);
      setForm({ name: '', breed: '', species: '', gender: '', age: '', weight: '', height: '', color: '' });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add pet');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-mypet-green px-5 pt-10 pb-6 flex items-center gap-3 rounded-b-[2.5rem]">
        <Link to="/profile" className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition text-xl leading-none">
          ‹
        </Link>
        <div>
          <h1 className="text-white text-xl font-bold">My Pets</h1>
          <p className="text-green-200 text-xs">Manage your pets</p>
        </div>
      </div>

      <div className="px-5 py-5 space-y-6">
        {/* Existing pets */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">
            Your Pets {pets.length > 0 && <span className="text-mypet-green">({pets.length})</span>}
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse flex gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : pets.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <p className="text-3xl mb-2">🐾</p>
              <p className="text-gray-500 text-sm">No pets yet. Add your first pet below!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pets.map((p) => (
                <Link
                  key={p.id}
                  to={`/pets/${p.id}`}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition flex items-center gap-4 text-left"
                >
                  <div className="w-14 h-14 rounded-2xl bg-green-50 flex-shrink-0 flex items-center justify-center text-2xl overflow-hidden">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      petEmoji(p.species || p.breed)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">{p.name}</p>
                    <p className="text-sm text-gray-500 truncate">{p.breed || p.species || 'Pet'}</p>
                    {p.medicalCard && (
                      <span className="inline-flex items-center gap-1 text-xs text-mypet-green font-medium mt-0.5">
                        <span>🏥</span> Medical Card
                      </span>
                    )}
                  </div>
                  <span className="text-gray-300 text-lg">›</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Add pet form */}
        <section>
          <h2 className="text-base font-bold text-gray-800 mb-3">Add New Pet</h2>
          <div className="bg-white rounded-2xl shadow-sm p-5">
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-4">
                ✅ Pet added successfully!
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                placeholder="Pet Name *"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mypet-green text-sm"
                required
              />
              <input
                placeholder="Breed"
                value={form.breed}
                onChange={(e) => setField('breed', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mypet-green text-sm"
              />
              <input
                placeholder="Species (dog, cat, bird…)"
                value={form.species}
                onChange={(e) => setField('species', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mypet-green text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Gender"
                  value={form.gender}
                  onChange={(e) => setField('gender', e.target.value)}
                  className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mypet-green text-sm"
                />
                <input
                  placeholder="Age (e.g. 2y)"
                  value={form.age}
                  onChange={(e) => setField('age', e.target.value)}
                  className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mypet-green text-sm"
                />
                <input
                  placeholder="Weight (e.g. 5kg)"
                  value={form.weight}
                  onChange={(e) => setField('weight', e.target.value)}
                  className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mypet-green text-sm"
                />
                <input
                  placeholder="Height (e.g. 30cm)"
                  value={form.height}
                  onChange={(e) => setField('height', e.target.value)}
                  className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mypet-green text-sm"
                />
              </div>
              <input
                placeholder="Color"
                value={form.color}
                onChange={(e) => setField('color', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mypet-green text-sm"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-4 rounded-2xl bg-mypet-green text-white font-bold text-base shadow-md shadow-green-200 hover:bg-mypet-green-dark transition disabled:opacity-60"
              >
                {submitting ? 'Adding...' : '+ Add Pet'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
