import fs from 'fs/promises';
import path from 'path';
import prismaPkg from '@prisma/client';
import bcrypt from 'bcrypt';

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();

const SOURCE_FILE = process.env.PROVIDERS_SOURCE || path.join(process.cwd(), 'prisma', 'data', 'providers-2gis.json');
const DEFAULT_PASSWORD = process.env.PROVIDER_IMPORT_DEFAULT_PASSWORD || 'provider123';

const ALLOWED_CATEGORIES = new Set(['VETERINARY', 'GROOMING', 'BOARDING', 'TRAINING']);

function normalizeCategory(value) {
  if (!value) return 'VETERINARY';
  const normalized = String(value).trim().toUpperCase();
  if (normalized === 'WALKING') return 'TRAINING';
  if (normalized === 'TRANSPORT') return 'BOARDING';
  return ALLOWED_CATEGORIES.has(normalized) ? normalized : 'VETERINARY';
}

function toFloat(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
}

async function main() {
  const raw = await fs.readFile(SOURCE_FILE, 'utf-8');
  const rows = JSON.parse(raw);

  if (!Array.isArray(rows)) {
    throw new Error('Providers source must be a JSON array.');
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const row of rows) {
    const businessName = String(row.businessName || row.name || '').trim();
    const latitude = toFloat(row.latitude ?? row.lat);
    const longitude = toFloat(row.longitude ?? row.lng ?? row.lon);
    const address = String(row.address || '').trim() || null;
    const category = normalizeCategory(row.category);

    if (!businessName || latitude == null || longitude == null) {
      skipped += 1;
      continue;
    }

    const existing = await prisma.provider.findFirst({
      where: {
        businessName,
        latitude: { gte: latitude - 0.0002, lte: latitude + 0.0002 },
        longitude: { gte: longitude - 0.0002, lte: longitude + 0.0002 },
      },
    });

    if (existing) {
      await prisma.provider.update({
        where: { id: existing.id },
        data: {
          address,
          category,
          latitude,
          longitude,
          isVerified: existing.isVerified || existing.verified,
        },
      });
      updated += 1;
      continue;
    }

    const email = `${slugify(businessName)}-${Math.abs(Math.round(latitude * 1000))}@providers.mypet.local`;
    const [firstName, ...rest] = businessName.split(' ');

    const user = await prisma.user.upsert({
      where: { email },
      update: { role: 'PROVIDER' },
      create: {
        email,
        passwordHash,
        role: 'PROVIDER',
        firstName: firstName || 'Provider',
        lastName: rest.join(' ') || 'MyPet',
        tosAccepted: true,
        tosAcceptedAt: new Date(),
        emailVerified: true,
      },
    });

    await prisma.provider.upsert({
      where: { userId: user.id },
      update: {
        businessName,
        address,
        category,
        latitude,
        longitude,
        isVerified: true,
        verified: true,
        verifiedAt: new Date(),
      },
      create: {
        userId: user.id,
        businessName,
        address,
        category,
        latitude,
        longitude,
        isVerified: true,
        verified: true,
        verifiedAt: new Date(),
      },
    });
    created += 1;
  }

  console.log(`Import completed. created=${created}, updated=${updated}, skipped=${skipped}`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
