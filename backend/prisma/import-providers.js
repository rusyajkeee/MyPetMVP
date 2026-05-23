/**
 * Import providers from 2GIS CSV file (parse.csv).
 *
 * Usage:
 *   node prisma/import-providers.js <path-to-csv>
 *
 * Example:
 *   node prisma/import-providers.js "../../excel/parse.csv"
 */
import prismaPkg from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import bcrypt from 'bcrypt';

const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();

// ── Services to generate per provider category ──────────────────────────
// ServiceCategory enum: VETERINARY, GROOMING, BOARDING, WALKING, TRANSPORT
// ProviderCategory enum: VETERINARY, GROOMING, BOARDING, TRAINING
// TRAINING has no ServiceCategory equivalent → use WALKING
const SERVICE_TEMPLATES = {
  VETERINARY: [
    { title: 'Первичный осмотр', priceKzt: 5000, durationMin: 30, category: 'VETERINARY' },
    { title: 'Вакцинация', priceKzt: 8000, durationMin: 20, category: 'VETERINARY' },
    { title: 'УЗИ диагностика', priceKzt: 15000, durationMin: 40, category: 'VETERINARY' },
    { title: 'Хирургическое вмешательство', priceKzt: 40000, durationMin: 120, category: 'VETERINARY' },
  ],
  GROOMING: [
    { title: 'Полный груминг', priceKzt: 18000, durationMin: 90, category: 'GROOMING' },
    { title: 'Стрижка', priceKzt: 12000, durationMin: 60, category: 'GROOMING' },
    { title: 'Купание и сушка', priceKzt: 8000, durationMin: 45, category: 'GROOMING' },
  ],
  BOARDING: [
    { title: 'Суточное содержание', priceKzt: 5000, durationMin: 1440, category: 'BOARDING' },
    { title: 'Дневное содержание', priceKzt: 3000, durationMin: 480, category: 'BOARDING' },
    { title: 'Выгул питомца', priceKzt: 2000, durationMin: 60, category: 'WALKING' },
  ],
  TRAINING: [
    { title: 'Индивидуальное занятие', priceKzt: 8000, durationMin: 60, category: 'WALKING' },
    { title: 'Групповое занятие', priceKzt: 5000, durationMin: 60, category: 'WALKING' },
    { title: 'Коррекция поведения', priceKzt: 10000, durationMin: 90, category: 'WALKING' },
  ],
};

// ── Category mapping from Russian rubric names ──────────────────────────
function detectCategory(rubrics) {
  const r = (rubrics || '').toLowerCase();
  if (r.includes('ветеринар')) return 'VETERINARY';
  if (r.includes('уход за животными') || r.includes('груминг')) return 'GROOMING';
  if (r.includes('зоогостиниц') || r.includes('передержк') || r.includes('гостиниц')) return 'BOARDING';
  if (r.includes('приют') || r.includes('кинолог') || r.includes('дрессир')) return 'TRAINING';
  return 'VETERINARY'; // default
}

// ── Simple CSV parser that handles quoted fields ────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCSVLine(lines[i]);
    if (vals.length < headers.length) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h.trim()] = (vals[idx] || '').trim(); });
    rows.push(obj);
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}

// ── Deduplicate by 2GIS URL (take the first occurrence) ─────────────────
function dedup(rows) {
  const seen = new Set();
  return rows.filter(r => {
    const key = r['2GIS URL'] || r['Наименование'] + r['Широта'];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const csvPath = process.argv[2] || resolve(import.meta.dirname, '../../../excel/parse.csv');
  console.log('Reading CSV from:', csvPath);

  const text = readFileSync(csvPath, 'utf-8');
  let rows = parseCSV(text);
  console.log(`Parsed ${rows.length} rows from CSV`);

  // Filter out rows without coordinates
  rows = rows.filter(r => r['Широта'] && r['Долгота']);
  console.log(`${rows.length} rows with coordinates`);

  // Deduplicate
  rows = dedup(rows);
  console.log(`${rows.length} unique providers after dedup`);

  const hash = await bcrypt.hash('provider123', 12);
  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    const name = row['Наименование'] || 'Unknown';
    const lat = parseFloat(row['Широта']);
    const lng = parseFloat(row['Долгота']);
    const category = detectCategory(row['Рубрики']);
    const address = row['Адрес'] || null;
    const description = row['Описание'] || row['Рубрики'] || '';
    const rating = parseFloat(row['Рейтинг']) || null;
    const reviewCount = parseInt(row['Количество отзывов']) || 0;
    const phone = (row['Телефон 1'] || '').replace(/[^+\d]/g, '').slice(0, 20) || null;
    const instagram = row['Instagram'] || null;
    const website = row['Веб-сайт 1'] || null;
    const gisUrl = row['2GIS URL'] || null;
    const workingHours = row['Часы работы'] || null;

    if (isNaN(lat) || isNaN(lng)) { skipped++; continue; }

    // Generate a unique email from the name and a hash fragment
    const slug = name.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '').slice(0, 20);
    const emailSuffix = Math.abs(hashCode(gisUrl || name + lat)).toString(36).slice(0, 6);
    const email = `${slug}_${emailSuffix}@provider.mypet.kz`;

    // Check if user already exists (skip if so)
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { skipped++; continue; }

    try {
      // Create user + provider in a transaction
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            passwordHash: hash,
            firstName: name,
            lastName: '',
            phone,
            role: 'PROVIDER',
            tosAccepted: true,
            tosAcceptedAt: new Date(),
            emailVerified: true,
          },
        });

        const provider = await tx.provider.create({
          data: {
            userId: user.id,
            businessName: name,
            description: description.slice(0, 500),
            address: address ? `${address}, Астана` : 'Астана',
            latitude: lat,
            longitude: lng,
            category,
            isVerified: true,
            verified: true,
            verifiedAt: new Date(),
          },
        });

        const templates = SERVICE_TEMPLATES[category] || SERVICE_TEMPLATES.VETERINARY;
        await tx.service.createMany({
          data: templates.map(t => ({
            providerId: provider.id,
            title: t.title,
            priceKzt: t.priceKzt,
            durationMin: t.durationMin,
            category: t.category,
          })),
        });
      });

      created++;
      if (created % 10 === 0) console.log(`  ... created ${created}`);
    } catch (err) {
      console.warn(`  ⚠ Skip "${name}": ${err.message?.slice(0, 80)}`);
      skipped++;
    }
  }

  console.log(`\n✅ Done! Created ${created} providers, skipped ${skipped}`);
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
