import Fuse from 'fuse.js';

// Synonyms/keywords mapped to DB category enum values
const CATEGORY_KEYWORDS = [
  {
    category: 'GROOMING',
    keywords: [
      // Russian
      'груминг', 'стрижка', 'стрижка шерсти', 'подстричь', 'тримминг',
      'прическа питомца', 'стрижка собаки', 'стрижка кошки',
      'купание', 'мытье', 'помыть', 'ванна', 'мойка питомца', 'водные процедуры',
      'когти', 'стрижка когтей', 'подстричь когти', 'коготки', 'педикюр', 'обрезка когтей',
      'зубы', 'чистка зубов', 'зубной налет', 'зубной камень', 'ультразвук зубов',
      // English
      'grooming', 'haircut', 'trim', 'bath', 'bathe', 'nails', 'teeth cleaning',
    ],
  },
  {
    category: 'VETERINARY',
    keywords: [
      // Russian
      'ветеринар', 'ветклиника', 'ветеринарная клиника', 'осмотр', 'ветеринарный осмотр',
      'консультация', 'лечение', 'врач', 'диагностика',
      'прививка', 'прививки', 'вакцинация', 'вакцина', 'иммунизация', 'прививочный кабинет',
      'укол', 'терапия', 'операция', 'хирургия',
      // English
      'vet', 'veterinary', 'clinic', 'checkup', 'vaccination', 'vaccine',
      'diagnosis', 'treatment', 'surgery',
    ],
  },
  {
    category: 'BOARDING',
    keywords: [
      // Russian
      'передержка', 'постой', 'временный уход', 'отель для животных',
      'зоогостиница', 'присмотр за питомцем', 'гостиница для животных',
      'дневная передержка', 'суточная передержка',
      // English
      'boarding', 'hotel', 'stay', 'overnight', 'daycare', 'pet sitting', 'sitting',
    ],
  },
  {
    category: 'WALKING',
    keywords: [
      // Russian
      'выгул', 'прогулка', 'гулять', 'выгуливать',
      'собачий выгул', 'прогулки с собакой', 'выгул собак',
      // English
      'walking', 'walk', 'dog walk', 'runner',
    ],
  },
  {
    category: 'TRANSPORT',
    keywords: [
      // Russian
      'транспорт', 'перевозка', 'доставка питомца', 'перевезти',
      'трансфер', 'такси для животных', 'такси для питомцев',
      // English
      'transport', 'transfer', 'delivery', 'taxi', 'ride',
    ],
  },
];

// Flatten to per-keyword documents for Fuse
const docs = CATEGORY_KEYWORDS.flatMap(({ category, keywords }) =>
  keywords.map((kw) => ({ category, keyword: kw }))
);

const fuse = new Fuse(docs, {
  keys: ['keyword'],
  threshold: 0.38,
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
});

/**
 * Returns DB category enum values that match the query via synonym/keyword lookup.
 * @param {string} query
 * @returns {string[]}  e.g. ['GROOMING'] for query "стрижка"
 */
export function matchCategories(query) {
  if (!query || query.trim().length < 2) return [];
  const hits = fuse.search(query.trim());

  // Best score per category (lower score = better match)
  const best = new Map();
  for (const { item, score } of hits) {
    const prev = best.get(item.category);
    if (prev === undefined || score < prev) best.set(item.category, score);
  }

  return [...best.keys()];
}
