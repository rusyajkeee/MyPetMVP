/**
 * Adds price variation and service diversity to imported providers.
 * Run once: node prisma/vary-services.js
 */
import prismaPkg from '@prisma/client';
const { PrismaClient } = prismaPkg;
const prisma = new PrismaClient();

// Seeded deterministic "random" so re-running produces same result
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}

function hashStr(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) & 0x7fffffff;
  return h;
}

// Vary price by ±30% in steps of 500
function varyPrice(base, rand) {
  const factor = 0.70 + rand() * 0.60; // 0.70 to 1.30
  return Math.round((base * factor) / 500) * 500;
}

const SERVICES = {
  VETERINARY: [
    { title: 'Первичный осмотр',               basePrice: 5000,  durationMin: 30,  category: 'VETERINARY' },
    { title: 'Повторный осмотр',               basePrice: 3500,  durationMin: 20,  category: 'VETERINARY' },
    { title: 'Вакцинация',                     basePrice: 8000,  durationMin: 20,  category: 'VETERINARY' },
    { title: 'УЗИ диагностика',                basePrice: 15000, durationMin: 40,  category: 'VETERINARY' },
    { title: 'Анализы крови',                  basePrice: 6000,  durationMin: 15,  category: 'VETERINARY' },
    { title: 'Хирургическое вмешательство',    basePrice: 40000, durationMin: 120, category: 'VETERINARY' },
    { title: 'Стерилизация/кастрация',         basePrice: 25000, durationMin: 90,  category: 'VETERINARY' },
    { title: 'Чистка зубов',                   basePrice: 12000, durationMin: 45,  category: 'VETERINARY' },
    { title: 'Вызов врача на дом',             basePrice: 10000, durationMin: 60,  category: 'VETERINARY' },
    { title: 'Рентген',                        basePrice: 8000,  durationMin: 30,  category: 'VETERINARY' },
  ],
  GROOMING: [
    { title: 'Полный груминг',                 basePrice: 18000, durationMin: 90,  category: 'GROOMING' },
    { title: 'Стрижка по стандарту породы',    basePrice: 14000, durationMin: 70,  category: 'GROOMING' },
    { title: 'Купание и сушка',                basePrice: 8000,  durationMin: 45,  category: 'GROOMING' },
    { title: 'Стрижка когтей',                 basePrice: 3000,  durationMin: 15,  category: 'GROOMING' },
    { title: 'Чистка ушей',                    basePrice: 2500,  durationMin: 10,  category: 'GROOMING' },
    { title: 'Тримминг',                       basePrice: 12000, durationMin: 60,  category: 'GROOMING' },
    { title: 'Вычёсывание/десхеддинг',         basePrice: 7000,  durationMin: 40,  category: 'GROOMING' },
  ],
  BOARDING: [
    { title: 'Суточное содержание',            basePrice: 5000,  durationMin: 1440, category: 'BOARDING' },
    { title: 'Дневное содержание',             basePrice: 3000,  durationMin: 480,  category: 'BOARDING' },
    { title: 'Выгул питомца',                  basePrice: 2000,  durationMin: 60,   category: 'WALKING'  },
    { title: 'Длительное содержание (неделя)', basePrice: 28000, durationMin: 10080,category: 'BOARDING' },
  ],
  TRAINING: [
    { title: 'Индивидуальное занятие',         basePrice: 8000,  durationMin: 60,  category: 'WALKING' },
    { title: 'Групповое занятие',              basePrice: 5000,  durationMin: 60,  category: 'WALKING' },
    { title: 'Коррекция поведения',            basePrice: 10000, durationMin: 90,  category: 'WALKING' },
    { title: 'Базовый курс послушания',        basePrice: 35000, durationMin: null, category: 'WALKING' },
    { title: 'Выездная дрессировка',           basePrice: 12000, durationMin: 90,  category: 'WALKING' },
  ],
};

// How many services each provider gets (min/max from pool)
const COUNTS = { VETERINARY: [3, 5], GROOMING: [3, 4], BOARDING: [2, 4], TRAINING: [2, 4] };

async function main() {
  // Only update providers imported from CSV (created on 2026-05-12 with mypet.kz emails)
  const providers = await prisma.provider.findMany({
    where: { user: { email: { endsWith: '@provider.mypet.kz' } } },
    include: { services: true },
  });

  console.log(`Updating services for ${providers.length} imported providers...`);
  let updated = 0;

  for (const provider of providers) {
    const rand = seededRand(hashStr(provider.id));
    const pool = SERVICES[provider.category] || SERVICES.VETERINARY;
    const [minCount, maxCount] = COUNTS[provider.category] || [3, 4];
    const count = minCount + Math.floor(rand() * (maxCount - minCount + 1));

    // Shuffle pool and pick `count` services
    const shuffled = [...pool].sort(() => rand() - 0.5);
    const picked = shuffled.slice(0, count);

    // Delete existing services and recreate with variation
    await prisma.$transaction([
      prisma.service.deleteMany({ where: { providerId: provider.id } }),
      prisma.service.createMany({
        data: picked.map(s => ({
          providerId: provider.id,
          title: s.title,
          priceKzt: varyPrice(s.basePrice, rand),
          durationMin: s.durationMin,
          category: s.category,
        })),
      }),
    ]);

    updated++;
    if (updated % 10 === 0) console.log(`  ... ${updated}/${providers.length}`);
  }

  console.log(`\n✅ Done! Updated services for ${updated} providers.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
