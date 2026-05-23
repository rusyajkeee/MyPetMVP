const categories = [
  {
    slug: 'VETERINARY',
    label: 'Veterinary',
    icon: 'stethoscope',
    accent: ['#113C2F', '#2C6D55'],
    description: 'Diagnostics, wellness plans, and calm exam rooms.',
  },
  {
    slug: 'GROOMING',
    label: 'Grooming',
    icon: 'content-cut',
    accent: ['#6F493B', '#C98B76'],
    description: 'Luxury coats, trims, and skin-first care.',
  },
  {
    slug: 'BOARDING',
    label: 'Boarding',
    icon: 'home-heart',
    accent: ['#5E4F2E', '#C9A456'],
    description: 'Boutique suites, play sessions, and updates.',
  },
  {
    slug: 'TRAINING',
    label: 'Training',
    icon: 'school-outline',
    accent: ['#2D3C61', '#5874B8'],
    description: 'Behavior coaching and habit shaping.',
  },
];

const demoProviders = [
  {
    id: 'provider-aster',
    businessName: 'Aster Veterinary House',
    address: '12 Samal Avenue',
    description:
      'A private pet clinic with quiet waiting rooms, soft handling, and same day diagnostics for busy owners.',
    distanceKm: 1.3,
    category: 'VETERINARY',
    accent: ['#10382C', '#3E8A67'],
    user: {
      id: 'user-aster',
      firstName: 'Amina',
      lastName: 'Sarsen',
      phone: '+7 777 800 2211',
      avatarUrl: null,
    },
    services: [
      { id: 'svc-aster-1', title: 'Wellness visit', category: 'VETERINARY', priceKzt: 22000, durationMin: 50 },
      { id: 'svc-aster-2', title: 'Vaccination package', category: 'VETERINARY', priceKzt: 18000, durationMin: 35 },
      { id: 'svc-aster-3', title: 'Digestive consultation', category: 'VETERINARY', priceKzt: 26000, durationMin: 60 },
    ],
    reviews: [
      {
        id: 'rev-aster-1',
        rating: 5,
        comment: 'The team explained every step and made our anxious dog relax.',
        createdAt: '2026-03-10T09:00:00.000Z',
        user: { firstName: 'Dana', lastName: 'I.' },
      },
      {
        id: 'rev-aster-2',
        rating: 5,
        comment: 'Beautiful clinic and very clear communication after the visit.',
        createdAt: '2026-03-06T12:30:00.000Z',
        user: { firstName: 'Mira', lastName: 'K.' },
      },
    ],
  },
  {
    id: 'provider-velvet',
    businessName: 'Velvet Coat Atelier',
    address: '44 Dostyk Street',
    description:
      'A grooming studio built like a boutique lounge, with skin-safe products and detailed breed styling.',
    distanceKm: 2.1,
    category: 'GROOMING',
    accent: ['#5E382D', '#D28A72'],
    user: {
      id: 'user-velvet',
      firstName: 'Sofia',
      lastName: 'Kim',
      phone: '+7 700 555 1177',
      avatarUrl: null,
    },
    services: [
      { id: 'svc-velvet-1', title: 'Full grooming ritual', category: 'GROOMING', priceKzt: 19000, durationMin: 90 },
      { id: 'svc-velvet-2', title: 'Puppy tidy session', category: 'GROOMING', priceKzt: 12000, durationMin: 45 },
      { id: 'svc-velvet-3', title: 'De-shed treatment', category: 'GROOMING', priceKzt: 15000, durationMin: 60 },
    ],
    reviews: [
      {
        id: 'rev-velvet-1',
        rating: 5,
        comment: 'Our corgi came back looking polished and calm, not stressed.',
        createdAt: '2026-03-14T11:15:00.000Z',
        user: { firstName: 'Nika', lastName: 'P.' },
      },
      {
        id: 'rev-velvet-2',
        rating: 4,
        comment: 'Very good styling and the coat felt amazing after the spa step.',
        createdAt: '2026-03-02T10:30:00.000Z',
        user: { firstName: 'Arman', lastName: 'T.' },
      },
    ],
  },
  {
    id: 'provider-orbit',
    businessName: 'Orbit Pet Retreat',
    address: '7 River Park',
    description:
      'Design-driven boarding with sunlight, play zones, camera updates, and evening enrichment for active pets.',
    distanceKm: 4.8,
    category: 'BOARDING',
    accent: ['#53462A', '#C1A15C'],
    user: {
      id: 'user-orbit',
      firstName: 'Timur',
      lastName: 'Aben',
      phone: '+7 775 222 8800',
      avatarUrl: null,
    },
    services: [
      { id: 'svc-orbit-1', title: 'Overnight suite', category: 'BOARDING', priceKzt: 24000, durationMin: 1440 },
      { id: 'svc-orbit-2', title: 'Day stay with enrichment', category: 'BOARDING', priceKzt: 14000, durationMin: 480 },
      { id: 'svc-orbit-3', title: 'Puppy social day', category: 'BOARDING', priceKzt: 16000, durationMin: 360 },
    ],
    reviews: [
      {
        id: 'rev-orbit-1',
        rating: 5,
        comment: 'We received updates all day and the boarding area looked premium.',
        createdAt: '2026-03-18T15:40:00.000Z',
        user: { firstName: 'Lina', lastName: 'R.' },
      },
    ],
  },
];

const previewUser = {
  id: 'preview-user',
  firstName: 'Aruzhan',
  lastName: 'Bektas',
  email: 'preview@mypet.app',
  phone: '+7 777 111 9090',
  role: 'USER',
};

const demoPets = [
  {
    id: 'pet-luna',
    name: 'Luna',
    breed: 'Mini Poodle',
    species: 'Dog',
    gender: 'Female',
    age: '3 years',
    weight: '5.8 kg',
    height: '32 cm',
    color: 'Apricot',
    imageUrl: null,
    medicalCard: { id: 'card-luna' },
  },
  {
    id: 'pet-mochi',
    name: 'Mochi',
    breed: 'British Shorthair',
    species: 'Cat',
    gender: 'Male',
    age: '1 year',
    weight: '4.3 kg',
    height: '25 cm',
    color: 'Blue gray',
    imageUrl: null,
    medicalCard: null,
  },
];

const demoMedicalCards = {
  'pet-luna': {
    allergies: 'Chicken protein, dusty rooms',
    chronicDiseases: '',
    medications: 'Skin support supplement after dinner',
    vaccinations: 'Rabies 2025, DHLPP 2025',
    pastIllnesses: 'Recovered from seasonal dermatitis',
    notes: 'Feels safer when staff speaks softly and avoids crowded spaces.',
    lastVetVisit: '2026-02-14T09:00:00.000Z',
  },
};

const demoBookings = [
  {
    id: 'booking-1',
    status: 'ACCEPTED',
    scheduledAt: '2026-03-28T10:00:00.000Z',
    notes: 'Please use low fragrance products.',
    service: { id: 'svc-velvet-1', title: 'Full grooming ritual', priceKzt: 19000 },
    provider: {
      id: 'provider-velvet',
      businessName: 'Velvet Coat Atelier',
      user: { firstName: 'Sofia', lastName: 'Kim' },
    },
    pet: {
      id: 'pet-luna',
      name: 'Luna',
    },
    review: null,
  },
  {
    id: 'booking-2',
    status: 'COMPLETED',
    scheduledAt: '2026-03-16T14:00:00.000Z',
    notes: '',
    service: { id: 'svc-aster-1', title: 'Wellness visit', priceKzt: 22000 },
    provider: {
      id: 'provider-aster',
      businessName: 'Aster Veterinary House',
      user: { firstName: 'Amina', lastName: 'Sarsen' },
    },
    pet: {
      id: 'pet-luna',
      name: 'Luna',
    },
    review: null,
  },
];

export const providerUser = {
  id: 'provider-demo',
  firstName: 'Amina',
  lastName: 'Sarsen',
  email: 'provider@mypet.app',
  phone: '+7 777 800 2211',
  role: 'PROVIDER',
  businessName: 'Aster Veterinary House',
};

const providerInboxBookings = [
  {
    id: 'pb-1',
    status: 'PENDING',
    scheduledAt: '2026-05-15T10:00:00.000Z',
    createdAt: '2026-05-11T09:00:00.000Z',
    acceptedAt: null, startedAt: null, completedAt: null, cancelledAt: null,
    notes: 'Dog is anxious around other animals',
    service: { id: 'svc-aster-1', title: 'Wellness visit', priceKzt: 22000, durationMin: 50 },
    customer: { id: 'cust-1', firstName: 'Dana', lastName: 'Ivanova', phone: '77771110001' },
    pet: { id: 'cpet-1', name: 'Buddy', breed: 'Labrador', species: 'Dog' },
    review: null,
  },
  {
    id: 'pb-2',
    status: 'PENDING',
    scheduledAt: '2026-05-16T14:00:00.000Z',
    createdAt: '2026-05-11T10:30:00.000Z',
    acceptedAt: null, startedAt: null, completedAt: null, cancelledAt: null,
    notes: '',
    service: { id: 'svc-aster-2', title: 'Vaccination package', priceKzt: 18000, durationMin: 35 },
    customer: { id: 'cust-2', firstName: 'Mira', lastName: 'Kim', phone: '77002223344' },
    pet: { id: 'cpet-2', name: 'Mochi', breed: 'British Shorthair', species: 'Cat' },
    review: null,
  },
  {
    id: 'pb-3',
    status: 'ACCEPTED',
    scheduledAt: '2026-05-13T11:00:00.000Z',
    createdAt: '2026-05-10T15:00:00.000Z',
    acceptedAt: '2026-05-11T08:30:00.000Z',
    startedAt: null, completedAt: null, cancelledAt: null,
    notes: 'Please check her teeth too',
    service: { id: 'svc-aster-3', title: 'Digestive consultation', priceKzt: 26000, durationMin: 60 },
    customer: { id: 'cust-3', firstName: 'Arman', lastName: 'Bektas', phone: '77753335566' },
    pet: { id: 'cpet-3', name: 'Luna', breed: 'Mini Poodle', species: 'Dog' },
    review: null,
  },
  {
    id: 'pb-4',
    status: 'COMPLETED',
    scheduledAt: '2026-05-08T14:00:00.000Z',
    createdAt: '2026-05-06T10:00:00.000Z',
    acceptedAt: '2026-05-07T12:00:00.000Z',
    startedAt: '2026-05-08T14:05:00.000Z',
    completedAt: '2026-05-08T15:10:00.000Z',
    cancelledAt: null,
    notes: '',
    service: { id: 'svc-aster-1', title: 'Wellness visit', priceKzt: 22000, durationMin: 50 },
    customer: { id: 'cust-4', firstName: 'Sofia', lastName: 'Park', phone: '77074447788' },
    pet: { id: 'cpet-4', name: 'Rex', breed: 'German Shepherd', species: 'Dog' },
    review: null,
  },
  {
    id: 'pb-5',
    status: 'COMPLETED',
    scheduledAt: '2026-05-05T10:00:00.000Z',
    createdAt: '2026-05-03T08:00:00.000Z',
    acceptedAt: '2026-05-04T09:00:00.000Z',
    startedAt: '2026-05-05T10:05:00.000Z',
    completedAt: '2026-05-05T10:50:00.000Z',
    cancelledAt: null,
    notes: '',
    service: { id: 'svc-aster-2', title: 'Vaccination package', priceKzt: 18000, durationMin: 35 },
    customer: { id: 'cust-5', firstName: 'Lina', lastName: 'Rys', phone: '77715559900' },
    pet: { id: 'cpet-5', name: 'Charlie', breed: 'Beagle', species: 'Dog' },
    review: null,
  },
  {
    id: 'pb-6',
    status: 'CANCELLED',
    scheduledAt: '2026-05-07T15:00:00.000Z',
    createdAt: '2026-05-05T11:00:00.000Z',
    acceptedAt: null, startedAt: null, completedAt: null,
    cancelledAt: '2026-05-06T10:00:00.000Z',
    notes: 'Emergency cancellation',
    service: { id: 'svc-aster-3', title: 'Digestive consultation', priceKzt: 26000, durationMin: 60 },
    customer: { id: 'cust-6', firstName: 'Timur', lastName: 'Aben', phone: '77766661122' },
    pet: null,
    review: null,
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createInitialDemoState() {
  return {
    profile: clone(previewUser),
    pets: clone(demoPets),
    bookings: clone(demoBookings),
    medicalCards: clone(demoMedicalCards),
    favoriteProviderIds: ['provider-aster'],
    extraProviderReviews: {},
    providerInboxBookings: clone(providerInboxBookings),
  };
}

export { categories, demoProviders, previewUser };
