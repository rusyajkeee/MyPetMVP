import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mypet.kz' },
    update: {},
    create: {
      email: 'admin@mypet.kz',
      passwordHash: hash,
      firstName: 'Admin',
      lastName: 'MyPet',
      role: 'ADMIN',
      tosAccepted: true,
      tosAcceptedAt: new Date(),
      emailVerified: true,
    },
  });

  const user1 = await prisma.user.upsert({
    where: { email: 'oleg@example.com' },
    update: {},
    create: {
      email: 'oleg@example.com',
      passwordHash: hash,
      firstName: 'Oleg',
      lastName: 'Tinkoff',
      phone: '+7(700)-916-8869',
      role: 'USER',
      tosAccepted: true,
      tosAcceptedAt: new Date(),
      emailVerified: true,
    },
  });

  const vetUser = await prisma.user.upsert({
    where: { email: 'dr.kusainov@mypet.kz' },
    update: {},
    create: {
      email: 'dr.kusainov@mypet.kz',
      passwordHash: hash,
      firstName: 'Dr.',
      lastName: 'Kusainov',
      role: 'PROVIDER',
      tosAccepted: true,
      tosAcceptedAt: new Date(),
      emailVerified: true,
    },
  });

  const provider1 = await prisma.provider.upsert({
    where: { userId: vetUser.id },
    update: {},
    create: {
      userId: vetUser.id,
      businessName: 'Petz & Vets',
      description: 'Experienced veterinarian. Bachelor of Veterinary Science. Book the appointment now!',
      address: 'Almaty, 2.5 km',
      latitude: 43.238,
      longitude: 76.945,
      verified: true,
      verifiedAt: new Date(),
    },
  });

  const vetService = await prisma.service.upsert({
    where: { id: 'seed-vet-1' },
    update: { priceKzt: 2500, durationMin: 60 },
    create: {
      id: 'seed-vet-1',
      providerId: provider1.id,
      category: 'VETERINARY',
      title: 'Veterinary Consultation',
      description: 'Full check-up and consultation',
      priceKzt: 2500,
      durationMin: 60,
    },
  });

  const groomUser = await prisma.user.upsert({
    where: { email: 'comb@mypet.kz' },
    update: {},
    create: {
      email: 'comb@mypet.kz',
      passwordHash: hash,
      firstName: 'Comb',
      lastName: 'Collar',
      role: 'PROVIDER',
      tosAccepted: true,
      tosAcceptedAt: new Date(),
      emailVerified: true,
    },
  });

  const groomProvider = await prisma.provider.upsert({
    where: { userId: groomUser.id },
    update: {},
    create: {
      userId: groomUser.id,
      businessName: 'Comb and Collar',
      description: 'Professional grooming',
      address: 'Almaty, 2 km',
      verified: true,
      verifiedAt: new Date(),
    },
  });

  await prisma.service.upsert({
    where: { id: 'seed-groom-1' },
    update: { priceKzt: 5000, durationMin: 90 },
    create: {
      id: 'seed-groom-1',
      providerId: groomProvider.id,
      category: 'GROOMING',
      title: 'Full Grooming',
      description: 'Bath, trim, nail clipping',
      priceKzt: 5000,
      durationMin: 90,
    },
  });

  const bella = await prisma.pet.upsert({
    where: { id: 'seed-pet-bella' },
    update: {},
    create: {
      id: 'seed-pet-bella',
      ownerId: user1.id,
      name: 'Bella',
      breed: 'Border Collie',
      age: '1y 9m 11d',
      weight: '7.5 kg',
      height: '54 cm',
      color: 'Black',
    },
  });

  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + 1);
  scheduledAt.setHours(11, 30, 0, 0);

  await prisma.booking.upsert({
    where: { id: 'seed-booking-1' },
    update: {},
    create: {
      id: 'seed-booking-1',
      userId: user1.id,
      providerId: provider1.id,
      serviceId: vetService.id,
      petId: bella.id,
      status: 'PENDING',
      scheduledAt,
    },
  });

  console.log('Seed done:', { admin: admin.email, user: user1.email, provider: vetUser.email });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
