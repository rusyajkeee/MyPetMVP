import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';

const SPECIES_EMOJI = { dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰', fish: '🐟' };
function petEmoji(species, breed) {
  const s = ((species || '') + ' ' + (breed || '')).toLowerCase();
  for (const [key, val] of Object.entries(SPECIES_EMOJI)) {
    if (s.includes(key)) return val;
  }
  return '🐾';
}

function AttributeChip({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className="bg-white rounded-2xl p-4 flex flex-col items-center gap-1 shadow-sm">
      <span className="text-2xl">{icon}</span>
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <span className="text-sm font-bold text-gray-800">{value}</span>
    </div>
  );
}

export default function PetProfile() {
  const { petId } = useParams();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/pets')
      .then(({ data }) => {
        const found = data.find((p) => p.id === petId);
        setPet(found || null);
      })
      .catch(() => setPet(null))
      .finally(() => setLoading(false));
  }, [petId]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-mypet-green h-24 rounded-b-[2.5rem] animate-pulse" />
        <div className="px-5 -mt-4 space-y-4">
          <div className="bg-white rounded-3xl h-64 shadow-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="max-w-lg mx-auto p-8 text-center">
        <p className="text-4xl mb-3">🐾</p>
        <p className="text-gray-500">Pet not found.</p>
        <Link to="/pets" className="mt-4 inline-block text-mypet-green font-medium">← Back to Pets</Link>
      </div>
    );
  }

  const emoji = petEmoji(pet.species, pet.breed);
  const hasMedCard = !!pet.medicalCard;

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-mypet-green px-5 pt-10 pb-6 flex items-center gap-3 rounded-b-[2.5rem]">
        <Link to="/pets" className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition text-xl leading-none">
          ‹
        </Link>
        <h1 className="text-white text-xl font-bold">{pet.name}</h1>
      </div>

      <div className="px-5 -mt-4 pb-8 space-y-4">
        {/* Hero card */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="h-48 bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
            {pet.imageUrl ? (
              <img src={pet.imageUrl} alt={pet.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-8xl">{emoji}</span>
            )}
          </div>
          <div className="p-5">
            <h2 className="text-xl font-bold text-gray-900">{pet.name}</h2>
            {(pet.breed || pet.species) && (
              <p className="text-mypet-green font-medium text-sm mt-0.5">{pet.breed || pet.species}</p>
            )}
            {pet.gender && (
              <span className="inline-block mt-2 text-xs font-semibold bg-green-50 text-green-700 px-3 py-1 rounded-full">
                {pet.gender}
              </span>
            )}
          </div>
        </div>

        {/* Attribute chips */}
        {(pet.age || pet.weight || pet.height || pet.color) && (
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">About {pet.name}</h3>
            <div className="grid grid-cols-2 gap-3">
              <AttributeChip icon="🎂" label="Age" value={pet.age} />
              <AttributeChip icon="⚖️" label="Weight" value={pet.weight} />
              <AttributeChip icon="📏" label="Height" value={pet.height} />
              <AttributeChip icon="🎨" label="Color" value={pet.color} />
            </div>
          </div>
        )}

        {/* Medical Card action */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">Health</h3>
          <Link
            to={`/pets/${petId}/medical-card`}
            className={`flex items-center justify-between px-5 py-4 rounded-2xl shadow-sm hover:shadow-md transition ${
              hasMedCard ? 'bg-white' : 'bg-mypet-green'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${hasMedCard ? 'bg-green-50' : 'bg-white/20'}`}>
                🏥
              </div>
              <div>
                <p className={`font-bold ${hasMedCard ? 'text-gray-900' : 'text-white'}`}>Medical Card</p>
                <p className={`text-xs ${hasMedCard ? 'text-gray-400' : 'text-green-100'}`}>
                  {hasMedCard ? 'View or edit card' : 'Create medical card'}
                </p>
              </div>
            </div>
            <span className={`text-lg ${hasMedCard ? 'text-gray-300' : 'text-white'}`}>›</span>
          </Link>
        </div>

        {/* Book appointment shortcut */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">Services</h3>
          <Link
            to="/discover"
            className="flex items-center justify-between bg-white px-5 py-4 rounded-2xl shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-xl">🩺</div>
              <div>
                <p className="font-bold text-gray-900">Book Appointment</p>
                <p className="text-xs text-gray-400">Find vets and groomers</p>
              </div>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
