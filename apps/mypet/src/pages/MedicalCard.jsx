import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';

const FIELDS = [
  { key: 'allergies',       label: 'Allergies',         icon: '⚠️', placeholder: 'e.g. pollen, flea bites, certain foods…' },
  { key: 'chronicDiseases', label: 'Chronic Diseases',  icon: '🩺', placeholder: 'e.g. diabetes, arthritis…' },
  { key: 'medications',     label: 'Current Medications',icon: '💊', placeholder: 'e.g. Apoquel 5mg daily…' },
  { key: 'vaccinations',    label: 'Vaccinations',       icon: '💉', placeholder: 'e.g. Rabies 2023, Distemper 2024…' },
  { key: 'pastIllnesses',   label: 'Past Illnesses',     icon: '📋', placeholder: 'e.g. parvo (2022, recovered)…' },
  { key: 'notes',           label: 'General Notes',      icon: '📝', placeholder: 'Any other important information…' },
];

const EMPTY_FORM = {
  allergies: '', chronicDiseases: '', medications: '',
  vaccinations: '', pastIllnesses: '', notes: '', lastVetVisit: '',
};

export default function MedicalCard() {
  const { petId } = useParams();
  const [card, setCard] = useState(null);
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [petsRes, cardRes] = await Promise.all([
        api.get('/users/pets'),
        api.get(`/users/pets/${petId}/medical-card`),
      ]);
      const foundPet = petsRes.data.find((p) => p.id === petId);
      setPet(foundPet || null);
      setCard(cardRes.data);
      if (cardRes.data) {
        setForm({
          allergies:       cardRes.data.allergies || '',
          chronicDiseases: cardRes.data.chronicDiseases || '',
          medications:     cardRes.data.medications || '',
          vaccinations:    cardRes.data.vaccinations || '',
          pastIllnesses:   cardRes.data.pastIllnesses || '',
          notes:           cardRes.data.notes || '',
          lastVetVisit:    cardRes.data.lastVetVisit
            ? new Date(cardRes.data.lastVetVisit).toISOString().slice(0, 10)
            : '',
        });
      }
    } catch {
      setCard(null);
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        lastVetVisit: form.lastVetVisit ? new Date(form.lastVetVisit).toISOString() : null,
      };
      const { data } = await api.put(`/users/pets/${petId}/medical-card`, payload);
      setCard(data);
      setEditing(false);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-mypet-green h-24 rounded-b-[2.5rem] animate-pulse" />
        <div className="px-5 mt-4 space-y-4">
          {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-24 shadow-sm animate-pulse" />)}
        </div>
      </div>
    );
  }

  const petName = pet?.name || 'Pet';
  const isEmptyCard = !card;

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-mypet-green px-5 pt-10 pb-6 flex items-center gap-3 rounded-b-[2.5rem]">
        <Link
          to={`/pets/${petId}`}
          className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition text-xl leading-none"
        >
          ‹
        </Link>
        <div>
          <h1 className="text-white text-xl font-bold">Medical Card</h1>
          <p className="text-green-200 text-xs">{petName}</p>
        </div>
        {card && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="ml-auto bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-white/30 transition"
          >
            Edit
          </button>
        )}
      </div>

      <div className="px-5 py-5 pb-10">
        {/* Success banner */}
        {savedMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-2xl px-4 py-3 text-sm mb-4 flex items-center gap-2">
            <span>✅</span> Medical card saved successfully!
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Empty state — no card yet */}
        {isEmptyCard && !editing && (
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-5xl mb-4">
              🏥
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Medical Card Yet</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-xs">
              Create a medical card for {petName} to keep track of health information, vaccinations, and medications.
            </p>
            <button
              onClick={() => setEditing(true)}
              className="px-8 py-4 bg-mypet-green text-white font-bold rounded-2xl shadow-lg shadow-green-200 hover:bg-mypet-green-dark transition"
            >
              Create Medical Card
            </button>
          </div>
        )}

        {/* Read view — card exists and not editing */}
        {card && !editing && (
          <div className="space-y-4">
            {/* Last vet visit */}
            {card.lastVetVisit && (
              <div className="bg-mypet-green rounded-2xl px-5 py-4 flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <p className="text-green-100 text-xs font-medium">Last Vet Visit</p>
                  <p className="text-white font-bold">
                    {new Date(card.lastVetVisit).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}

            {/* Fields */}
            {FIELDS.map(({ key, label, icon }) => {
              const val = card[key];
              if (!val) return null;
              return (
                <div key={key} className="bg-white rounded-2xl px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span>{icon}</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</span>
                  </div>
                  <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">{val}</p>
                </div>
              );
            })}

            {/* Empty fields hint */}
            {FIELDS.every(({ key }) => !card[key]) && !card.lastVetVisit && (
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                <p className="text-gray-400 text-sm">Card is empty. Tap Edit to add information.</p>
              </div>
            )}
          </div>
        )}

        {/* Edit / Create form */}
        {editing && (
          <form onSubmit={handleSave} className="space-y-4">
            {/* Last vet visit */}
            <div className="bg-white rounded-2xl px-5 py-4 shadow-sm">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                <span>📅</span> Last Vet Visit
              </label>
              <input
                type="date"
                value={form.lastVetVisit}
                onChange={(e) => setField('lastVetVisit', e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mypet-green text-sm"
              />
            </div>

            {/* Text fields */}
            {FIELDS.map(({ key, label, icon, placeholder }) => (
              <div key={key} className="bg-white rounded-2xl px-5 py-4 shadow-sm">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  <span>{icon}</span> {label}
                </label>
                <textarea
                  value={form[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  rows={2}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-mypet-green text-sm resize-none"
                />
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              {card && (
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 py-4 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-4 rounded-2xl bg-mypet-green text-white font-bold shadow-lg shadow-green-200 hover:bg-mypet-green-dark transition disabled:opacity-60"
              >
                {saving ? 'Saving…' : card ? 'Save Changes' : 'Create Card'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
