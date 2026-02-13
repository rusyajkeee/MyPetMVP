import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const categories = [
  { slug: 'VETERINARY', label: 'Veterinary', icon: '🩺', path: '/discover/VETERINARY' },
  { slug: 'GROOMING', label: 'Grooming', icon: '🐾', path: '/discover/GROOMING' },
  { slug: 'BOARDING', label: 'Boarding', icon: '🏠', path: '/discover/BOARDING' },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="max-w-lg mx-auto">
      <header className="bg-mypet-green text-white px-6 py-8 rounded-b-3xl">
        <h1 className="text-2xl font-bold">MyPet</h1>
        <p className="text-white/90 mt-1">
          {user ? `Hello, ${user.firstName}!` : 'Find care for your pet'}
        </p>
      </header>
      <div className="px-6 py-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Hello, How may I help you?</h2>
        <div className="flex gap-6 justify-center mb-10">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              to={cat.path}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white shadow hover:shadow-md transition"
            >
              <span className="text-3xl">{cat.icon}</span>
              <span className="text-sm font-medium text-gray-700">{cat.label}</span>
            </Link>
          ))}
        </div>
        <Link
          to="/discover"
          className="block w-full py-3 rounded-xl bg-mypet-green text-white text-center font-semibold"
        >
          Discover all services
        </Link>
        {!user && (
          <p className="mt-6 text-center text-gray-600 text-sm">
            <Link to="/login" className="text-mypet-green font-medium">Sign in</Link> to book and manage appointments
          </p>
        )}
      </div>
    </div>
  );
}
