import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function AddPets() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    breed: '',
    species: '',
    gender: '',
    age: '',
    weight: '',
    height: '',
    color: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users/pets').then(({ data }) => setPets(data)).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/users/pets', form);
      setPets((prev) => [...prev, { ...form, id: Date.now().toString() }]);
      setForm({ name: '', breed: '', species: '', gender: '', age: '', weight: '', height: '', color: '' });
      const { data } = await api.get('/users/pets');
      setPets(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add pet');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto pb-6">
      <header className="bg-mypet-green text-white px-6 py-6 flex items-center gap-4">
        <Link to="/profile" className="text-white p-1">←</Link>
        <h1 className="text-xl font-bold">Add Pets</h1>
      </header>
      <div className="px-6 py-6">
        <h2 className="font-semibold text-gray-900 mb-3">Added Pets</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : pets.length === 0 ? (
          <p className="text-gray-500 text-sm mb-6">No pets yet. Add one below.</p>
        ) : (
          <div className="space-y-3 mb-8">
            {pets.map((p) => (
              <div key={p.id} className="bg-white rounded-xl p-4 shadow flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-xl">
                  🐕
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-sm text-gray-500">{p.breed || p.species || 'Pet'}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="font-semibold text-gray-900 mb-3">Manually Add Pet</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <input
            placeholder="Pet Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-300"
            required
          />
          <input
            placeholder="Breed Name"
            value={form.breed}
            onChange={(e) => setForm((f) => ({ ...f, breed: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-300"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Gender"
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              className="px-4 py-3 rounded-xl border border-gray-300"
            />
            <input
              placeholder="Age"
              value={form.age}
              onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              className="px-4 py-3 rounded-xl border border-gray-300"
            />
            <input
              placeholder="Colour"
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              className="px-4 py-3 rounded-xl border border-gray-300"
            />
            <input
              placeholder="Height"
              value={form.height}
              onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
              className="px-4 py-3 rounded-xl border border-gray-300"
            />
            <input
              placeholder="Weight"
              value={form.weight}
              onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
              className="px-4 py-3 rounded-xl border border-gray-300 col-span-2"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-mypet-green text-white font-semibold disabled:opacity-50"
          >
            Add Pet
          </button>
        </form>
      </div>
    </div>
  );
}
