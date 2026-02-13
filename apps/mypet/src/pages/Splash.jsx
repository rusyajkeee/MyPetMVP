import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function CollarIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4">
      <ellipse cx="40" cy="44" rx="28" ry="16" stroke="black" strokeWidth="2.5" />
      <path d="M12 44v-4a8 8 0 0 1 8-8h40a8 8 0 0 1 8 8v4" stroke="black" strokeWidth="2.5" />
      <path d="M40 58v4M36 62h8" stroke="black" strokeWidth="2" />
      <path d="M40 28a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" fill="black" />
    </svg>
  );
}

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate('/', { replace: true }), 2500);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-mypet-green flex flex-col items-center justify-center p-6">
      <CollarIcon />
      <h1 className="text-4xl font-extrabold text-black tracking-tight">MyPet</h1>
    </div>
  );
}
