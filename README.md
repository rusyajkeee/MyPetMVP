# MyPet — Платформа для поиска и бронирования зоосервисов

> **Дипломная работа** — Полнофункциональная мобильная платформа для рынка ветеринарных и pet-услуг Казахстана.  
> Мобильное приложение (React Native / Expo) + REST API (Node.js / Express / PostgreSQL) + Admin-панель.  
> Весь стек развёртывается через Docker Compose.

---

## Содержание

1. [Обзор проекта и цели](#1-обзор-проекта-и-цели)
2. [Ключевые показатели](#2-ключевые-показатели)
3. [Архитектура системы](#3-архитектура-системы)
4. [Стек технологий и обоснование выбора](#4-стек-технологий-и-обоснование-выбора)
5. [Структура репозитория](#5-структура-репозитория)
6. [База данных — схема и модели](#6-база-данных--схема-и-модели)
7. [Backend API — полная спецификация](#7-backend-api--полная-спецификация)
8. [Система аутентификации и безопасность](#8-система-аутентификации-и-безопасность)
9. [Мобильное приложение — архитектура](#9-мобильное-приложение--архитектура)
10. [Навигационная система](#10-навигационная-система)
11. [Экраны и пользовательские сценарии](#11-экраны-и-пользовательские-сценарии)
12. [Режимы работы приложения](#12-режимы-работы-приложения)
13. [Система уведомлений](#13-система-уведомлений)
14. [Геолокация и поиск поблизости](#14-геолокация-и-поиск-поблизости)
15. [Компонентная UI-библиотека](#15-компонентная-ui-библиотека)
16. [Дизайн-система и тёмная тема](#16-дизайн-система-и-тёмная-тема)
17. [Локализация (i18n)](#17-локализация-i18n)
18. [Импорт реальных данных из 2GIS](#18-импорт-реальных-данных-из-2gis)
19. [Docker и производственное развёртывание](#19-docker-и-производственное-развёртывание)
20. [Переменные окружения](#20-переменные-окружения)
21. [Потоки данных — пошаговые сценарии](#21-потоки-данных--пошаговые-сценарии)
22. [Скрипты разработки](#22-скрипты-разработки)
23. [Диаграмма базы данных (ER)](#23-диаграмма-базы-данных-er)

---

## 1. Обзор проекта и цели

**MyPet** — это цифровая платформа, соединяющая владельцев домашних животных в Казахстане с поставщиками зоосервисов: ветеринарными клиниками, груминг-салонами, гостиницами для животных и кинологами.

### Проблема

Рынок pet-услуг в Казахстане сильно фрагментирован: нет единого агрегатора, владельцы животных ищут специалистов в Instagram, Telegram-чатах и 2GIS. Запись проходит через мессенджеры — без подтверждения, напоминаний и истории посещений. Провайдеры теряют клиентов из-за отсутствия инструментов управления заявками.

### Решение

Мобильное приложение + веб-платформа, где:
- **Владелец животного** регистрирует питомца, ищет специалиста на карте, бронирует услугу в 3 тапа, хранит медицинскую карту питомца и получает уведомления о статусе визита.
- **Провайдер** ведёт расписание, принимает/отклоняет заявки, видит выручку и получает push-уведомления о новых бронированиях в реальном времени.
- **Администратор** верифицирует провайдеров, управляет пользователями и видит агрегированную статистику платформы.

### Целевые рынки

| Сегмент | Описание |
|---------|----------|
| B2C (клиент) | Владельцы кошек, собак и других животных в Астане и других городах Казахстана |
| B2B (провайдер) | Ветеринарные клиники, груминг-салоны, кинологи, гостиницы для животных |
| B2A (admin) | Администраторы платформы: верификация, модерация, аналитика |

---

## 2. Ключевые показатели

| Метрика | Значение |
|---------|----------|
| Реальных провайдеров в базе | 73 (импорт из 2GIS, Астана) |
| Услуг в каталоге | 263 (с уникальными ценами и длительностью) |
| Поддерживаемых языков | 3 — Казахский, Русский, Английский |
| Тем оформления | 2 — Светлая (default) + Тёмная (premium) |
| Экранов мобильного приложения | 14 полнофункциональных экранов |
| Эндпоинтов API | 35+ (REST, документированы в Swagger) |
| Время жизни access-токена | 15 минут |
| Время жизни refresh-токена | 7 дней |
| Интервал поллинга уведомлений | 8 секунд |
| Максимальный радиус поиска | 50 км (Haversine) |
| Rate limit API | 100 запросов / 15 мин / IP |
| Rate limit login | 10 попыток / 15 мин |
| Rate limit register | 5 регистраций / час |

---

## 3. Архитектура системы

### Общая схема

```
┌──────────────────────────────────────────────────────────────────┐
│                        Docker Compose Network                     │
│                                                                    │
│   ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│   │   apps/mypet    │  │  apps/mypetwork  │  │ apps/mypetadmin│  │
│   │   :5173 (web)   │  │  :5174 (web)     │  │  :5175 (web)   │  │
│   │ Expo + Vite SPA │  │ Provider Portal  │  │  Admin Panel   │  │
│   │  nginx + React  │  │  nginx + React   │  │ nginx + React  │  │
│   └────────┬────────┘  └────────┬─────────┘  └───────┬────────┘  │
│            │                   │                      │           │
│            └───────────────────┴──────────────────────┘           │
│                                │  /api → proxy                    │
│                       ┌────────▼────────┐                         │
│                       │    backend      │                         │
│                       │    port 4000    │                         │
│                       │  Node.js 20     │                         │
│                       │  Express 4      │                         │
│                       │  Prisma ORM     │                         │
│                       │  JWT Auth       │                         │
│                       │  Swagger UI     │                         │
│                       └────────┬────────┘                         │
│                                │  DATABASE_URL                    │
│                       ┌────────▼────────┐                         │
│                       │   postgres      │                         │
│                       │   port 5433     │                         │
│                       │ PostgreSQL 16   │                         │
│                       │ alpine image    │                         │
│                       └─────────────────┘                         │
└──────────────────────────────────────────────────────────────────┘

Мобильный клиент (Expo Go / APK):
EXPO_PUBLIC_API_URL=http://<LAN IP>:4000/api
──────────────────────────────────►  backend:4000/api
```

### Принцип разделения запросов

- **Мобильный клиент (Expo)** — обращается напрямую на `EXPO_PUBLIC_API_URL`, указанный в `.env`. Требует LAN IP, так как Expo Go работает на реальном устройстве в той же сети.
- **Веб-клиенты** — Vite SPA обращаются на `/api`, nginx в каждом контейнере проксирует на `backend:4000/api` по внутренней Docker-сети.

### Принцип слоёв

```
Presentation Layer    ←→   React Native (мобайл) / React (веб)
                              ↕ HTTP/JSON (Axios)
API Gateway Layer     ←→   Express Router
                              ↕ Prisma Client
Data Access Layer     ←→   PostgreSQL 16
```

---

## 4. Стек технологий и обоснование выбора

### Мобильное приложение

| Технология | Версия | Обоснование |
|-----------|--------|-------------|
| React Native | 0.81 | Кроссплатформенность iOS/Android из одной кодовой базы |
| Expo SDK | 54 | Managed workflow: expo-location, expo-blur, expo-haptics без нативной сборки |
| Expo Go | latest | Быстрый итерационный цикл разработки без компиляции |
| expo-blur (BlurView) | — | Нативный размытый фон для iOS-стиля glassmorphism |
| expo-linear-gradient | — | Градиентные кнопки и фоновые эффекты |
| expo-location | — | Получение GPS-координат пользователя |
| expo-haptics | — | Тактильная обратная связь (light/medium/selection/success) |
| react-native-maps | — | Интерактивная карта с маркерами провайдеров |
| @react-native-community/datetimepicker | — | Нативный DatePicker (iOS modal sheet + Android dialog) |
| @react-native-async-storage | — | Персистентное хранилище: токены, настройки, demo-данные |
| @expo/vector-icons (MCI) | — | 7000+ иконок Material Community Icons |
| Axios | — | HTTP-клиент с интерцепторами |

### Веб-приложение

| Технология | Версия | Обоснование |
|-----------|--------|-------------|
| Vite | 5 | Мгновенный HMR, оптимальная продакшн-сборка |
| React | 19 | Последняя стабильная версия, concurrent features |
| TailwindCSS | 3 | Utility-first CSS, минимальный бандл через PurgeCSS |
| react-leaflet | — | Интерактивная карта с кластеризацией на веб |
| leaflet-markercluster | — | Автоматическая кластеризация маркеров |

### Backend

| Технология | Версия | Обоснование |
|-----------|--------|-------------|
| Node.js | 20 LTS | Стабильность, V8 performance, большая экосистема npm |
| Express | 4 | Зрелый, минималистичный HTTP-фреймворк |
| Prisma | 5 | Type-safe ORM, автоматические миграции, Prisma Studio |
| PostgreSQL | 16 | ACID-транзакции, мощные индексы, надёжность |
| JWT (jsonwebtoken) | — | Stateless аутентификация: access 15m + refresh 7d |
| bcrypt | — | Надёжное хэширование паролей (rounds=10) |
| Zod | — | Schema-first валидация запросов, type inference |
| Helmet | — | Автоматические HTTP security headers (CSP, X-Frame-Options) |
| express-rate-limit | — | Защита от brute-force и DoS атак |
| CORS | — | Гибкая настройка разрешённых origins |
| swagger-jsdoc + swagger-ui-express | — | Авто-документация из JSDoc-комментариев |

### Инфраструктура

| Технология | Обоснование |
|-----------|-------------|
| Docker | Воспроизводимая среда на любом хосте |
| Docker Compose | Оркестрация 5 сервисов одной командой |
| nginx 1.27 | Статическая раздача + reverse proxy `/api` |
| Prisma Migrations | Version-controlled DDL, rollback-ready |

---

## 5. Структура репозитория

```
MyPetMVP/
│
├── apps/
│   ├── mypet/                          # Основное приложение (Expo + Vite)
│   │   ├── App.js                      # Точка входа: Expo/Vite бранч
│   │   ├── index.html                  # Vite SPA shell
│   │   ├── vite.config.js              # Vite конфигурация
│   │   ├── tailwind.config.js          # TailwindCSS
│   │   ├── nginx.conf                  # nginx конфиг для prod-контейнера
│   │   ├── Dockerfile                  # Multi-stage: build → nginx
│   │   ├── package.json
│   │   │
│   │   └── src/
│   │       ├── mobile/                 # Весь React Native код
│   │       │   ├── AppShell.js         # Навигация, toast, polling, бейджи
│   │       │   ├── theme.js            # Дизайн-токены: цвета, отступы, радиусы
│   │       │   ├── ui.js               # Компонентная библиотека (20+ компонентов)
│   │       │   │
│   │       │   ├── context/
│   │       │   │   ├── AuthContext.js  # JWT, сессия, signIn/register/signOut
│   │       │   │   ├── ThemeContext.js # Dark/light mode, AsyncStorage persist
│   │       │   │   └── LocaleContext.js# i18n: EN/RU/KZ + 120+ ключей перевода
│   │       │   │
│   │       │   ├── data/
│   │       │   │   └── demo.js         # Офлайн-данные для demo mode
│   │       │   │
│   │       │   ├── lib/
│   │       │   │   ├── api.js          # Все вызовы к backend + demo fallback
│   │       │   │   ├── format.js       # formatDate, formatMoney, initials
│   │       │   │   ├── haptics.js      # expo-haptics обёртка (try/catch safe)
│   │       │   │   ├── notifications.js# AsyncStorage уведомления (demo mode)
│   │       │   │   ├── storage.js      # readValue/writeJson/clearValue
│   │       │   │   └── validation.js   # Валидация форм: login, register, pet, profile
│   │       │   │
│   │       │   └── screens/
│   │       │       ├── AuthScreens.js        # Welcome, Login, Register
│   │       │       ├── MarketplaceScreens.js # Home, Discover, Nearby, Provider, Booking
│   │       │       ├── CareScreens.js        # Bookings, Pets, MedCard, Notifications, Profile
│   │       │       ├── ProviderScreens.js    # Dashboard, Inbox, Services, Profile
│   │       │       └── OnboardingScreen.js   # Первый запуск (slides + AsyncStorage)
│   │       │
│   │       ├── pages/                  # Vite веб-страницы (SPA)
│   │       │   ├── Home.jsx
│   │       │   ├── Login.jsx
│   │       │   ├── Register.jsx
│   │       │   └── Splash.jsx
│   │       │
│   │       └── data/
│   │           └── providers.js        # CSV-провайдеры (web fallback без API)
│   │
│   ├── mypetwork/                      # Портал провайдера (веб, React + Tailwind)
│   │   └── src/pages/
│   │       ├── Login.jsx
│   │       └── Profile.jsx
│   │
│   └── mypetadmin/                     # Панель администратора (веб, React + Tailwind)
│       └── src/pages/
│           ├── Dashboard.jsx           # Сводная статистика
│           ├── Providers.jsx           # Верификация провайдеров
│           └── Users.jsx               # Управление пользователями
│
├── backend/
│   ├── src/
│   │   ├── index.js                    # Entry point: middleware, routes, error handler
│   │   │
│   │   ├── config/
│   │   │   └── swagger.js              # OpenAPI 3.0 конфигурация
│   │   │
│   │   ├── middleware/
│   │   │   └── auth.js                 # authMiddleware, attachUser, requireRole
│   │   │
│   │   ├── routes/
│   │   │   ├── auth.js                 # /register, /login, /refresh, /me
│   │   │   ├── users.js                # Профиль, питомцы, медкарты, избранное
│   │   │   ├── providers.js            # Список, nearby, профиль, stats, bookings
│   │   │   ├── services.js             # CRUD услуг
│   │   │   ├── bookings.js             # Создание + смена статусов
│   │   │   ├── reviews.js              # Отзывы + рейтинги
│   │   │   ├── notifications.js        # Уведомления пользователя
│   │   │   └── admin.js                # Верификация, блокировки, статистика
│   │   │
│   │   └── lib/
│   │       └── prisma.js               # PrismaClient singleton (1 connection pool)
│   │
│   ├── prisma/
│   │   ├── schema.prisma               # Декларативная схема БД
│   │   ├── migrations/                 # История SQL-миграций (audit trail)
│   │   ├── seed.js                     # Тестовые данные (admin, demo user, demo provider)
│   │   ├── init-db.js                  # Умный seed: пропускает если БД не пустая
│   │   ├── import-providers.js         # Импорт 87 провайдеров из parse.csv (2GIS)
│   │   └── vary-services.js            # Диверсификация услуг с вариацией цен
│   │
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                           # Устаревший standalone фронтенд (legacy)
├── docker-compose.yml                  # Оркестрация 5 сервисов
├── parse.csv                           # Источник: 2GIS Астана, зоосервисы
└── README.md
```

---

## 6. База данных — схема и модели

### Общее описание

База данных спроектирована с учётом требований GDPR: явное согласие (`tosAccepted`, `tosAcceptedAt`), аудит-поля (`createdAt`, `updatedAt`, `blockedAt`), каскадное удаление данных при удалении пользователя. СУБД — PostgreSQL 16 (alpine), ORM — Prisma 5.

Все таблицы используют `cuid()` в качестве первичного ключа (компактнее UUID, нет коллизий, безопасен для URL).

### Enum-типы

```sql
enum Role            { USER, PROVIDER, ADMIN }
enum BookingStatus   { PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED }
enum ProviderCategory{ VETERINARY, GROOMING, BOARDING, TRAINING }
enum ServiceCategory { VETERINARY, GROOMING, BOARDING, WALKING, TRANSPORT }
```

### Модель `User` — пользователь

```
users
├── id            cuid   PK
├── email         TEXT   UNIQUE — логин, нельзя изменить
├── password_hash TEXT   bcrypt(10)
├── first_name    TEXT
├── last_name     TEXT
├── phone         TEXT?
├── role          Role   default=USER
├── tos_accepted  BOOL   default=false — явное согласие с ToS
├── tos_accepted_at TIMESTAMP?
├── email_verified BOOL  default=false
├── email_verified_at TIMESTAMP?
├── blocked       BOOL   default=false — блокировка администратором
├── blocked_at    TIMESTAMP?
├── blocked_reason TEXT?
├── avatar_url    TEXT?
├── created_at    TIMESTAMP  default=now()
└── updated_at    TIMESTAMP  auto-updated
```

**Связи User:** `provider` (1:1), `bookings` (1:N), `reviews` (1:N), `notifications` (1:N), `pets` (1:N), `favoriteProviders` (M:N через junction)

### Модель `Pet` — питомец

```
pets
├── id         cuid  PK
├── name       TEXT
├── breed      TEXT? — порода
├── species    TEXT? — вид (кошка, собака, хомяк...)
├── gender     TEXT? — пол
├── age        TEXT? — строка "1y 9m" (гибкий формат)
├── weight     TEXT? — "7.5 kg"
├── height     TEXT? — "54 cm"
├── color      TEXT?
├── image_url  TEXT?
├── owner_id   cuid  FK→User (CASCADE DELETE)
├── created_at TIMESTAMP
└── updated_at TIMESTAMP
```

**Связи Pet:** `owner` (N:1 User), `bookings` (1:N), `medicalCard` (1:1 nullable)

### Модель `Provider` — провайдер

```
providers
├── id            cuid PK
├── user_id       cuid UNIQUE FK→User (CASCADE) — один провайдер на аккаунт
├── business_name TEXT?
├── description   TEXT? (db.Text — без ограничения длины)
├── address       TEXT?
├── latitude      FLOAT? — координаты для Haversine-поиска
├── longitude     FLOAT?
├── category      ProviderCategory default=VETERINARY
├── is_verified   BOOL default=false — флаг верификации (legacy API)
├── verified      BOOL default=false — флаг верификации (import)
├── verified_at   TIMESTAMP?
├── created_at    TIMESTAMP
└── updated_at    TIMESTAMP
```

> **Два поля верификации** (`is_verified` и `verified`) существуют для совместимости: API использует `isVerified`, скрипт импорта — `verified`. В запросах применяется `OR: [{ verified: true }, { isVerified: true }]`.

**Связи Provider:** `user` (1:1), `services` (1:N), `bookings` (1:N), `reviews` (1:N), `favoritedBy` (M:N)

### Модель `Service` — услуга

```
services
├── id           cuid PK
├── provider_id  cuid FK→Provider (CASCADE)
├── category     ServiceCategory
├── title        TEXT
├── description  TEXT?
├── price_kzt    INT  — цена в тенге
├── duration_min INT? — длительность в минутах
├── image_url    TEXT?
├── created_at   TIMESTAMP
└── updated_at   TIMESTAMP
```

### Модель `Booking` — бронирование

```
bookings
├── id           cuid PK
├── user_id      cuid FK→User (CASCADE)
├── provider_id  cuid FK→Provider (CASCADE)
├── service_id   cuid FK→Service (CASCADE)
├── pet_id       cuid? FK→Pet (SET NULL — питомца можно удалить без потери брони)
├── status       BookingStatus default=PENDING
├── scheduled_at TIMESTAMP     — дата и время визита
├── accepted_at  TIMESTAMP?    — когда провайдер принял
├── started_at   TIMESTAMP?    — когда начался визит
├── completed_at TIMESTAMP?    — когда завершился
├── cancelled_at TIMESTAMP?    — когда отменён
├── notes        TEXT?         — пожелания клиента
├── created_at   TIMESTAMP
└── updated_at   TIMESTAMP
```

**Жизненный цикл статусов:**

```
                         PROVIDER/USER
                              │
               ┌──────────────▼──────────────┐
               │           PENDING            │
               └──────┬──────────────┬────────┘
               PROVIDER│              │PROVIDER/USER
                       ▼              ▼
                   ACCEPTED       CANCELLED
                       │              (final)
               PROVIDER│
                       ▼
                  IN_PROGRESS
                       │
               PROVIDER│
                       ▼
                   COMPLETED
                    (final)
```

При каждом переходе:
- Устанавливается соответствующий timestamp
- Создаётся `Notification` обеим сторонам

### Модель `Review` — отзыв

```
reviews
├── id          cuid PK
├── booking_id  cuid UNIQUE FK→Booking  — один отзыв на бронирование
├── user_id     cuid FK→User
├── provider_id cuid FK→Provider
├── rating      INT  (1–5)
├── comment     TEXT?
├── created_at  TIMESTAMP
└── updated_at  TIMESTAMP
```

### Модель `Notification` — уведомление

```
notifications
├── id         cuid PK
├── user_id    cuid FK→User (CASCADE)
├── title      TEXT
├── body       TEXT
├── read       BOOL default=false
└── created_at TIMESTAMP
```

### Модель `PetMedicalCard` — медицинская карта питомца

```
pet_medical_cards
├── id                cuid PK
├── pet_id            cuid UNIQUE FK→Pet (CASCADE)
├── allergies         TEXT?  — аллергии
├── chronic_diseases  TEXT?  — хронические заболевания
├── medications       TEXT?  — текущие медикаменты
├── vaccinations      TEXT?  — история прививок
├── past_illnesses    TEXT?  — перенесённые болезни
├── notes             TEXT?  — дополнительные заметки
├── last_vet_visit    TIMESTAMP?
├── created_at        TIMESTAMP
└── updated_at        TIMESTAMP
```

### Модель `FavoriteProvider` — избранные

```
favorite_providers
├── id          cuid PK
├── user_id     cuid FK→User (CASCADE)
├── provider_id cuid FK→Provider (CASCADE)
└── created_at  TIMESTAMP

UNIQUE INDEX: [user_id, provider_id]  ← предотвращает дубли
```

---

## 7. Backend API — полная спецификация

Базовый URL: `http://localhost:4000/api`  
Swagger UI: `http://localhost:4000/api-docs`

### Middleware стек (порядок применения)

```
incoming request
      │
      ▼
helmet()                   — X-Frame-Options, CSP, HSTS, X-Content-Type
      │
      ▼
cors(allowedOrigins)        — проверка Origin, поддержка нескольких фронтов через запятую
      │
      ▼
express.json()              — парсинг JSON body
      │
      ▼
requestLogger               — [METHOD] /path → timestamp в stdout
      │
      ▼
rateLimit(100 req/15m/IP)   — глобальный rate limiter (express-rate-limit)
      │
      ▼
Router.use('/auth/login',    rateLimit(10/15m))
Router.use('/auth/register', rateLimit(5/hour))
      │
      ▼
authMiddleware (per route)  — JWT проверка только для защищённых маршрутов
      │
      ▼
route handler
      │
      ▼
errorHandler(err, req, res) — централизованная обработка ошибок (Zod, Prisma, JWT)
```

### Auth — `/api/auth`

#### `POST /api/auth/register`

Создаёт пользователя. При `role=PROVIDER` — атомарно создаёт и запись `Provider`.

**Тело запроса (Zod schema):**

```json
{
  "email":      "user@example.com",   // string, email format
  "password":   "secret123",          // string, min 6 символов
  "firstName":  "Aruzhan",            // string, required
  "lastName":   "Bektas",             // string, required
  "phone":      "+7 777 111 0000",    // string?, optional
  "role":       "USER",               // "USER" | "PROVIDER"
  "tosAccepted": true                 // boolean, must be true
}
```

**Ответ 201:**
```json
{
  "user": {
    "id": "cm...", "email": "...",
    "firstName": "Aruzhan", "role": "USER"
  },
  "accessToken":  "<JWT 15min>",
  "refreshToken": "<JWT 7d>",
  "expiresIn":    900
}
```

**Ошибки:** 400 (валидация) | 409 (email занят) | 500

**Авто-верификация провайдера:** если `AUTO_VERIFY_PROVIDERS=true` — `provider.verified = true` сразу при регистрации.

---

#### `POST /api/auth/login`

```json
{ "email": "...", "password": "..." }
```

**Ошибки:** 401 (неверный email/пароль) | 403 (аккаунт заблокирован) | 400 (валидация)

---

#### `POST /api/auth/refresh`

Принимает refresh-токен из тела `{ refreshToken }` **или** заголовка `x-refresh-token`.

Ответ: `{ accessToken: "...", expiresIn: 900 }`

---

#### `GET /api/auth/me` *(JWT required)*

Возвращает текущего пользователя. Если роль PROVIDER — включает данные `provider` (с `services[]`).

---

### Users — `/api/users` *(все требуют JWT)*

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/profile` | Профиль + provider-data если PROVIDER |
| PATCH | `/profile` | Обновить firstName, lastName, phone, avatarUrl |
| GET | `/bookings` | История бронирований (с сервисом, провайдером, питомцем) |
| GET | `/pets` | Список питомцев с медкартой |
| POST | `/pets` | Создать питомца |
| GET | `/pets/:id/medical-card` | Медкарта питомца |
| PUT | `/pets/:id/medical-card` | Создать или обновить медкарту (upsert) |
| DELETE | `/pets/:id/medical-card` | Удалить медкарту |
| GET | `/favorites` | Избранные провайдеры (с 3 услугами каждый) |
| GET | `/favorites/ids` | Только массив `["id1", "id2", ...]` |
| POST | `/favorites` | Добавить `{ providerId }` в избранное |
| DELETE | `/favorites/:providerId` | Убрать из избранного |

---

### Providers — `/api/providers`

#### Публичные эндпоинты

##### `GET /api/providers`

Возвращает верифицированных провайдеров. Фильтр `?category=VETERINARY` фильтрует по категории услуги (не провайдера) — включает только услуги указанной категории.

```sql
WHERE providers.verified = true
AND services.category = 'VETERINARY'  -- если указан фильтр
INCLUDE services (первые 5)
INCLUDE user.firstName, user.lastName, user.avatarUrl
```

##### `GET /api/providers/nearby`

Поиск по геолокации. Все верифицированные провайдеры загружаются из БД, расстояние считается в памяти по **формуле Haversine**, затем результат фильтруется по радиусу.

| Параметр | Тип | Default | Ограничения |
|----------|-----|---------|-------------|
| `lat` | Float | обязателен | -90..90 |
| `lng` | Float | обязателен | -180..180 |
| `radius` | Float | 5 | 1..50 |
| `category` | ProviderCategory | все | — |
| `topRated` | Boolean | false | avgRating ≥ 4.0 |

**Ответ объекта:**
```json
{
  "id": "cm...",
  "businessName": "Aster Vet Clinic",
  "lat": 51.1801, "lng": 71.4460,
  "latitude": 51.1801, "longitude": 71.4460,
  "distanceKm": 1.3,
  "category": "VETERINARY",
  "rating": 4.8, "avgRating": 4.8,
  "reviewCount": 12,
  "address": "ул. Кенесары 40, Астана",
  "isVerified": true,
  "services": [...],
  "phone": "+7 777 800 2211",
  "whatsapp": "https://wa.me/77778002211"
}
```

> Поля `lat/latitude` и `lng/longitude` дублируются для совместимости с react-native-maps (требует `latitude/longitude`) и внутренней логикой (использует `lat/lng`).

##### `GET /api/providers/:id`

Полный профиль: все услуги, до 20 последних отзывов с данными пользователя, вычисленный `avgRating`.

```js
avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
```

---

#### Защищённые эндпоинты (PROVIDER + ADMIN)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/providers/me` | Профиль + все услуги текущего провайдера |
| POST | `/providers/me` | Создать/обновить профиль (upsert по userId) |
| GET | `/providers/me/bookings` | Все бронирования провайдера. Поле `user` → `customer` |
| GET | `/providers/me/stats` | `{ pendingCount, todayCount, completedCount, revenue }` |

**Детали `/me/bookings`:**

Поле `user` переименовано в `customer` чтобы не конфликтовать с моделью на фронтенде:
```js
res.json(bookings.map(b => ({ ...b, customer: b.user, user: undefined })));
```

**Детали `/me/stats`:**

```js
{
  pendingCount:   bookings.filter(b => b.status === 'PENDING').length,
  todayCount:     bookings.filter(b =>
    ['ACCEPTED','IN_PROGRESS'].includes(b.status) &&
    isSameDay(b.scheduledAt, new Date())
  ).length,
  completedCount: bookings.filter(b => b.status === 'COMPLETED').length,
  revenue:        bookings
    .filter(b => b.status === 'COMPLETED')
    .reduce((sum, b) => sum + (b.service?.priceKzt || 0), 0)
}
```

---

### Services — `/api/services`

#### Публичные

| Метод | Путь | Параметры | Описание |
|-------|------|-----------|----------|
| GET | `/services` | `?category=`, `?providerId=` | Список услуг верифицированных провайдеров |
| GET | `/services/:id` | — | Одна услуга с данными провайдера |

При запросе без `providerId` — автоматически фильтруется `provider.verified=true`.

#### Защищённые (PROVIDER/ADMIN)

| Метод | Путь | Тело | Описание |
|-------|------|------|----------|
| POST | `/services` | `{ category, title, priceKzt, durationMin?, description? }` | Создать услугу |
| PATCH | `/services/:id` | `{ priceKzt?, durationMin?, title?, description? }` | Обновить свою услугу |
| DELETE | `/services/:id` | — | Удалить свою услугу |

Backend проверяет владение: `service.providerId === currentUser.provider.id`.

---

### Bookings — `/api/bookings`

##### `POST /api/bookings` *(только USER)*

```json
{
  "serviceId":   "cm...",
  "scheduledAt": "2026-05-20T11:00:00.000Z",
  "petId":       "cm...",            // optional
  "notes":       "Аллергия на пенициллин"  // optional
}
```

При создании автоматически создаётся `Notification` для провайдера:
```json
{ "title": "New booking request", "body": "You have a new booking request" }
```

##### `PATCH /api/bookings/:id/status`

```json
{ "status": "ACCEPTED" }
```

Middleware проверяет допустимость перехода. Запрещённые переходы → 400 Bad Request.

При каждом переходе:
- `acceptedAt | startedAt | completedAt | cancelledAt = now()`
- Создаются `Notification` обеим сторонам

---

### Reviews — `/api/reviews`

##### `POST /api/reviews` *(только USER)*

```json
{ "bookingId": "cm...", "rating": 5, "comment": "Отличная клиника!" }
```

Ограничения:
- `booking.status` должен быть `COMPLETED`
- Один отзыв на бронирование (`bookingId UNIQUE`)
- `rating` 1–5

##### `GET /api/reviews/provider/:providerId`

До 50 отзывов, сортировка по убыванию даты (`createdAt DESC`). Включает данные пользователя.

---

### Notifications — `/api/notifications` *(JWT required)*

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/` | Последние 50 уведомлений текущего пользователя |
| PATCH | `/:id/read` | Отметить одно прочитанным |
| POST | `/read-all` | Отметить все прочитанными (`updateMany`) |

---

### Admin — `/api/admin` *(только ADMIN)*

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/stats` | `{ users, providers, bookings, pendingVerifications }` |
| GET | `/providers/pending` | Невверифицированные провайдеры |
| GET | `/providers` | Все провайдеры с пользовательскими данными |
| POST | `/providers/:id/verify` | Верифицировать провайдера (`verified=true, verifiedAt=now()`) |
| POST | `/users/:id/block` | Заблокировать пользователя `{ reason }` |
| POST | `/users/:id/unblock` | Разблокировать |

---

## 8. Система аутентификации и безопасность

### Полный flow регистрации

```
Client                         Backend                       Database
  │                               │                              │
  │  POST /auth/register          │                              │
  │──────────────────────────────►│                              │
  │                               │  Zod validate schema         │
  │                               │  Check email unique ─────────►│
  │                               │◄─────────────── User? ────────│
  │                               │  bcrypt.hash(password, 10)   │
  │                               │  prisma.user.create() ───────►│
  │                               │  if PROVIDER:                │
  │                               │    prisma.provider.create()──►│
  │                               │  jwt.sign(sub=userId, 15m)   │
  │                               │  jwt.sign(sub=userId, 7d)    │
  │◄──────────────────────────────│  {user, accessToken, refresh}│
```

### JWT Payload

```json
{
  "sub": "cm_user_id",     // userId
  "iat": 1747200000,       // issued at (unix)
  "exp": 1747200900        // expires at (+15 min)
}
```

### Middleware цепочка для защищённых маршрутов

```js
// 1. Проверить JWT (не нужен полный объект user)
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const { sub } = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// 2. Загрузить полный объект пользователя из БД
async function attachUser(req, res, next) {
  req.currentUser = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { provider: true },
  });
  if (!req.currentUser) return res.status(401).json({ error: 'User not found' });
  next();
}

// 3. Проверить роль
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.currentUser.role))
      return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
```

### Защита от атак

| Угроза | Механизм защиты |
|--------|----------------|
| Brute-force login | Rate limit 10/15min + bcrypt rounds=10 |
| Mass registration | Rate limit 5/hour |
| DDoS | Rate limit 100/15min/IP глобальный |
| XSS | Helmet CSP headers |
| Clickjacking | X-Frame-Options: DENY |
| MIME sniffing | X-Content-Type-Options: nosniff |
| SQL Injection | Prisma ORM (parameterized queries) |
| CORS | Whitelist-based origin проверка |

---

## 9. Мобильное приложение — архитектура

### Контексты (Context API)

Приложение использует три глобальных контекста:

#### `AuthContext`

Хранит состояние сессии. При монтировании вызывает `hydrateSession()`:

```js
// Восстановление сессии при запуске
async function hydrateSession() {
  const mode = await readValue(MODE_KEY);  // 'demo' | 'live' | null

  if (mode === 'demo') {
    return { mode: 'demo', user: demoUser };  // офлайн без токена
  }

  const token = await readValue(TOKEN_KEY);
  if (!token || !API_BASE) return { mode: 'guest', user: null };

  try {
    const user = await liveRequest('get', '/auth/me');
    return { mode: 'live', user };  // токен валиден
  } catch {
    await signOut();  // токен истёк → чистим
    return { mode: 'guest', user: null };
  }
}
```

Экспортируемые значения: `{ mode, user, isProvider, signIn, register, signOut, preview, previewProvider, apiConfigured, apiReachable }`

#### `ThemeContext`

Управляет тёмной/светлой темой:

```js
const [dark, setDark] = useState(false);

// Инициализация: читаем из AsyncStorage
useEffect(() => {
  readValue('@mypet_theme').then(saved => {
    if (saved) setDark(saved === 'dark');
    else setDark(colorScheme === 'dark');  // системная тема как fallback
  });
}, []);

// Переключение с персистентностью
function toggleDark() {
  setDark(d => {
    const next = !d;
    writeJson('@mypet_theme', next ? 'dark' : 'light');
    return next;
  });
}
```

Экспортирует: `{ dark, palette, toggleDark }` — где `palette` = `dark ? darkPalette : lightPalette`

#### `LocaleContext`

i18n система с поддержкой 3 языков:

```js
const LOCALES = [
  { code: 'ru', label: 'РУС', flag: '🇷🇺' },
  { code: 'kz', label: 'ҚАЗ', flag: '🇰🇿' },
  { code: 'en', label: 'ENG', flag: '🇬🇧' },
];

// Функция перевода с fallback цепочкой: locale → en → key
function t(key) {
  return STRINGS[locale]?.[key] ?? STRINGS.en[key] ?? key;
}
```

Сохраняется в `AsyncStorage('@mypet_locale')`. 120+ ключей перевода для всех экранов.

### API слой (`lib/api.js`)

Все вызовы к backend инкапсулированы в `api.js`. Каждая функция поддерживает **два режима** — live и demo:

```js
// Шаблон функции
export async function listProviders(mode) {
  if (mode === 'demo') {
    return demoProviders;  // данные из memory
  }
  return liveRequest('get', '/providers');
}
```

`liveRequest` добавляет заголовок `Authorization: Bearer <token>` и обрабатывает 401 (автоматический `signOut`).

---

## 10. Навигационная система

Приложение использует **кастомную стековую навигацию** без React Navigation — это полностью самописное решение в `AppShell.js`.

### Принцип работы

```js
// Стек — массив объектов маршрутов
const [stack, setStack] = useState([makeRoute('welcome')]);

function navigate(name, params = {}) {
  setStack(s => [...s, { name, params, key: uid() }]);
}
function goBack() {
  setStack(s => s.length > 1 ? s.slice(0, -1) : s);
}
function resetTo(name, params = {}) {
  setStack([{ name, params, key: uid() }]);
}
```

Текущий экран — `stack[stack.length - 1]`, рендерится через `renderScreen(route)`.

### Swipe-back жест (iOS-стиль)

```js
const panResponder = PanResponder.create({
  // Захват жеста только если начало в первых 28px слева
  onMoveShouldSetPanResponder: (_, g) =>
    g.dx > 8 && Math.abs(g.dy) < 40 && g.moveX - g.x0 < 28,

  onPanResponderRelease: (_, g) => {
    const shouldBack = g.dx > 84 || g.vx > 0.9;
    if (shouldBack) {
      Animated.timing(slideAnim, {
        toValue: 320, duration: 180, useNativeDriver: true,
      }).start(() => { goBack(); slideAnim.setValue(0); });
    } else {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
    }
  },
});
```

### Android кнопка Назад

```js
useEffect(() => {
  const sub = BackHandler.addEventListener('hardwareBackPress', () => {
    if (stack.length > 1) { goBack(); return true; }
    return false;  // выйти из приложения
  });
  return () => sub.remove();
}, [stack]);
```

### Структура вкладок

**Клиент (USER):**

```
home        → Главная (провайдеры, категории)
discover    → Поиск с фильтрами
bookings    → История бронирований
pets        → Мои питомцы
notifications → Уведомления (с badge)
profile     → Профиль
```

**Провайдер (PROVIDER):**

```
providerDashboard → Сводка + статистика
providerInbox     → Управление заявками
providerServices  → Мои услуги
notifications     → Уведомления (с badge)
providerProfile   → Бизнес-профиль
```

### Бейдж уведомлений

При каждой смене экрана вызывается `fetchApiUnreadCount` (live) или `listNotifications().filter(!readAt).length` (demo) — бейдж обновляется без поллинга.

---

## 11. Экраны и пользовательские сценарии

### AuthScreens

#### `WelcomeScreen`

Первый экран. Содержит:
- Переключатель языка (3 флага в pill-кнопках)
- Animated stagger: 5 элементов появляются с задержкой 80ms каждый
- Карточка с тремя статистиками (локализованные)
- Кнопки: Sign In → LoginScreen, Create Account → RegisterScreen
- Preview-ссылки: demo как клиент / demo как провайдер

#### `LoginScreen` / `RegisterScreen`

Валидация форм через `lib/validation.js` (клиентская + серверная). Дружелюбные сообщения об ошибках. Поддержка TOS-чекбокса при регистрации.

---

### MarketplaceScreens

#### `HomeScreen`

- Приветствие: `Hi, {user.firstName}` + eyebrow + subtitle
- Баннер ближайшего бронирования (если есть активное)
- Сетка категорий (`getCategories()`) с per-category accent-цветами в тёмной теме
- Список ближайших провайдеров (до 3) из `listProviders()`
- Pull-to-refresh через `RefreshControl`

#### `DiscoverScreen`

- Multi-select фильтры категорий (множественный выбор)
- Фильтр избранных (`heart` toggle)
- Клиентская фильтрация: `Set<string>` для категорий + `favoriteIds: Set<string>`
- Загрузка в параллели: `Promise.all([listProviders(), listFavoriteProviderIds()])`
- Pull-to-refresh

```js
const providers = allProviders.filter(prov => {
  if (showFavorites && !favoriteIds.has(prov.id)) return false;
  if (selectedCats.size > 0 && !selectedCats.has(prov.category)) return false;
  return true;
});
```

#### `NearbyServicesScreen`

- Переключатель Список/Карта (toggle с корректным цветом в dark mode)
- Фильтры категорий (Pill)
- Радиус поиска: 1 / 3 / 5 / 10 км
- Фильтр Top Rated (avgRating ≥ 4.0 на сервере)
- **Карта (react-native-maps):** OpenStreetMap тайлы, маркеры с callout (название, адрес, рейтинг, расстояние, WhatsApp кнопка)
- Автоанимация камеры при смене viewMode: `mapRef.current.animateToRegion(..., 600ms)`
- GPS fallback → Астана (51.18°N, 71.446°E)

#### `ProviderScreen`

- `AvatarBadge` (имя, адрес)
- Кнопка "Добавить в избранное" / "Убрать" с мгновенным optimistic update
- MetricTile: рейтинг + количество отзывов
- Список услуг: название, цена (formatMoney), длительность
- Последние отзывы (до 2 на странице) с RatingStars
- Кнопка "Book" → BookingScreen

#### `BookingScreen` (3 этапа)

**Этап 1 — form:**
- Выбор услуги (radio-list с ценой и длительностью)
- Выбор дня (таблетки: сегодня, завтра, +5 дней)
- Выбор времени (таблетки: 09:00–19:00)
- Выбор питомца (если есть в профиле) — опционально
- Поле заметок (multiline)

**Этап 2 — confirm:**
- Сводка: провайдер, услуга, дата/время, питомец, цена
- Кнопка "Confirm" → POST /bookings
- Кнопка "Edit" → назад на форму

**Этап 3 — done:**
- Success-иконка с анимацией
- Сводка подтверждённого бронирования
- Кнопка "View my bookings"

---

### CareScreens

#### `BookingsScreen`

- Вкладки: Upcoming / Past (клиентская фильтрация)
- Статус-бейджи с цветовой кодировкой
- "Leave review" — только для COMPLETED (inline форма со звёздами)
- "Cancel" — bottomsheet с выбором причины из 5 вариантов + подтверждение
- Pull-to-refresh

#### `PetsScreen` / `PetDetailsScreen`

- Список питомцев с CRUD
- Добавление: имя, вид, порода, пол, возраст (DatePicker), вес, рост, окрас
- Карточка питомца: все поля + кнопка "Medical Card"

#### `MedicalCardScreen`

7 текстовых полей: аллергии, хронические болезни, медикаменты, прививки, перенесённые болезни, заметки + `DateField` для последнего визита.

Сохранение через `PUT /users/pets/:id/medical-card` (upsert).

#### `NotificationsScreen`

- В live mode: `GET /notifications` + кнопка "Mark all read"
- В demo mode: из AsyncStorage через `lib/notifications.js`
- Автоматически обновляет unread badge

#### `ProfileScreen`

- Редактирование имени, телефона
- Переключение темы (ThemeToggle)
- Выбор языка (LanguagePicker)
- Переключение live/demo режима
- Список избранных провайдеров
- Кнопка выхода

---

### ProviderScreens

#### `ProviderDashboardScreen`

```
┌──────────────┐  ┌──────────────┐
│  Pending: 3  │  │  Today: 5    │
└──────────────┘  └──────────────┘
┌──────────────┐  ┌──────────────┐
│ Completed:87 │  │ Revenue: 485K│
└──────────────┘  └──────────────┘
```

- Новые заявки (до 3, статус PENDING) с кнопками Accept/Decline
- Список визитов на сегодня
- Pull-to-refresh
- Skeleton loading (пульсирующий плейсхолдер)

#### `ProviderInboxScreen`

- Фильтры: ALL | NEW | ACCEPTED | ACTIVE | DONE | CANCELLED
- Действия зависят от статуса:

```
PENDING    → [Accept ✓]  [Decline ✗]  (decline требует подтверждения)
ACCEPTED   → [Start visit →]  [Cancel]
IN_PROGRESS → [Mark complete ✓]
COMPLETED  → показывает оценку клиента
CANCELLED  → показывает причину
```

- Карточки показывают: клиент, питомец, услуга, дата/время, цена, статус
- Оптимистичное обновление — после действия `load()` перезагружает список

#### `ProviderServicesScreen`

- Реальные услуги из `GET /providers/me`
- Inline редактирование: тап → поля цены и длительности в режиме редактирования
- Сохранение: `PATCH /services/:id`
- Результат обновляется из ответа API (не локально — избегает десинхронизации)

#### `ProviderProfileScreen`

- Бизнес-имя, описание, адрес
- `POST /providers/me` (upsert профиля)
- Переключение в режим клиента (preview)

---

## 12. Режимы работы приложения

### `guest` — Гостевой

Состояние по умолчанию. Нет токена, нет сессии. Показывается `WelcomeScreen`. Публичные эндпоинты API доступны без авторизации.

### `live` — Живой API

JWT-токен хранится в AsyncStorage. Все запросы через `liveRequest()` с заголовком `Authorization: Bearer`.

При ошибке сети — пользователю показывается URL Swagger-документации для диагностики соединения.

### `demo` — Офлайн демо

Полностью автономный режим. Данные хранятся в AsyncStorage как JSON:

```js
demoStorage = {
  profile:               { id, firstName, lastName, email, role: 'USER' },
  pets:                  [ { id, name, breed, species, ... } ],
  medicalCards:          { [petId]: { allergies, vaccinations, ... } },
  bookings:              [ { id, service, provider, status, scheduledAt } ],
  providerInboxBookings: [ { id, customer, service, status, ... } ],
  extraProviderReviews:  { [providerId]: [...] },
  favoriteProviderIds:   [ 'id1', 'id2' ]
}
```

Все изменения (добавление питомца, создание брони, смена статуса) сохраняются между сессиями — демо полностью реализует все пользовательские сценарии.

**Двойной preview:** `preview()` переключает провайдера в роль клиента (и наоборот) без перезапуска приложения.

---

## 13. Система уведомлений

### Серверные уведомления (live mode)

Backend создаёт `Notification` в БД при каждом ключевом событии:

| Событие | Кому | Заголовок | Текст |
|---------|------|-----------|-------|
| Новое бронирование | Провайдер | "New booking request" | "You have a new booking request" |
| Бронирование принято | Клиент | "Booking confirmed" | "Your appointment is confirmed" |
| Визит начат | Клиент | "Visit started" | "Your visit is in progress" |
| Визит завершён | Клиент | "Visit completed" | "Please leave a review!" |
| Бронирование отменено | Обе стороны | "Booking cancelled" | имя провайдера |
| Провайдер верифицирован | Провайдер | "Account verified" | "You can now accept bookings" |
| Аккаунт заблокирован | Пользователь | "Account blocked" | reason |

### Локальные уведомления (demo mode)

```js
// lib/notifications.js
export async function pushNotification(type, title, body, data = {}) {
  const notification = {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type, title, body, data,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
  const list = await listNotifications();
  // Ограничение: максимум 50 уведомлений (FIFO)
  await writeJson(NOTIF_KEY, [notification, ...list].slice(0, 50));
}
```

### Realtime Toast для провайдеров

`AppShell.js` запускает поллинг при `mode=live` + `isProvider=true`:

```
Запуск приложения (провайдер)
         │
         ▼
  Первый вызов → seenIds = Set(все существующие ID)
         │        (не показываем старые уведомления как "новые")
         │
   Каждые 8 секунд
         │
         ▼
  GET /notifications → unread[]
         │
  filter(n => !seenIds.has(n.id))
         │
  newNotifs.length > 0 ?
         │   YES
         ▼
  showToast(latest.title, latest.body)
  badge += newNotifs.length
  seenIds.add(...newNotifIds)
```

**ToastPopup компонент:**
- Абсолютный оверлей (z-index: 999, top: 52)
- Тёмно-зелёный фон `#0f3d2e`
- Spring анимация: translateY -120 → 0 (появление за 350ms)
- Auto-dismiss: 5 секунд
- Tap-to-dismiss
- Иконка `bell-ring` + заголовок + до 2 строк текста

---

## 14. Геолокация и поиск поблизости

### Формула Haversine (backend)

Для вычисления расстояния по сферической поверхности Земли:

```js
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // радиус Земли в км
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

**Алгоритм поиска поблизости:**

```
GET /providers/nearby?lat=51.18&lng=71.45&radius=5&category=VETERINARY
         │
         ▼
Загрузить всех верифицированных провайдеров из БД
         │
         ▼
Для каждого провайдера с координатами:
  distanceKm = haversine(userLat, userLng, provider.latitude, provider.longitude)
         │
         ▼
filter(p => p.distanceKm <= radius)
filter(p => category ? p.category === category : true)
filter(p => topRated ? p.avgRating >= 4.0 : true)
         │
         ▼
sort((a,b) => a.distanceKm - b.distanceKm)
         │
         ▼
return providers с полем distanceKm
```

> **Масштабируемость:** In-memory фильтрация эффективна до ~1000 провайдеров. Для роста → индекс PostGIS или пространственный B-tree индекс на `(latitude, longitude)`.

### GPS в мобильном приложении

```js
// expo-location
const { status } = await Location.requestForegroundPermissionsAsync();
if (status === 'granted') {
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced  // баланс точность/скорость
  });
  coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
} else {
  // Fallback: центр Астаны
  coords = { lat: 51.18, lng: 71.446 };
}
```

### Fallback при недоступном API

```js
// api.js — listNearbyProviders
try {
  const data = await client.get('/providers/nearby', { params });
  return Array.isArray(data) ? data : [];
} catch {
  // API недоступен → локальный CSV fallback
  return CSV_PROVIDERS
    .map(p => ({ ...adaptCsvProvider(p), distanceKm: haversineKm(lat, lng, p.lat, p.lng) }))
    .filter(p => p.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
```

---

## 15. Компонентная UI-библиотека

Все компоненты находятся в `apps/mypet/src/mobile/ui.js`. Каждый компонент читает палитру через `useTheme()` и автоматически адаптируется к тёмной теме.

### Полный список компонентов

| Компонент | Назначение | Ключевые пропсы |
|-----------|------------|-----------------|
| `Screen` | Базовый контейнер экрана с SafeAreaView + KeyboardAvoidingView + фоновые декоры | `scroll, footer, refreshControl, contentContainerStyle` |
| `GlassCard` | Карточка с эффектом матового стекла | `style` |
| `HeroTitle` | Заголовок экрана: eyebrow + h1 + subtitle + action | `eyebrow, title, subtitle, action` |
| `SectionTitle` | Заголовок секции с trailing-слотом | `title, subtitle, trailing` |
| `PrimaryButton` | Основная кнопка. Тёмная тема: emerald gradient | `label, icon, onPress, disabled, compact` |
| `SecondaryButton` | Вторичная кнопка | `label, icon, onPress` |
| `Pill` | Фильтр-тег (active/inactive) | `label, icon, active, onPress` |
| `Field` | Текстовое поле с label и ошибкой | `label, value, onChangeText, secureTextEntry, multiline` |
| `DateField` | Датапикер: iOS modal / Android native | `label, value, onChange, minimumDate, maximumDate` |
| `AvatarBadge` | Аватар (инициалы/иконка) + имя + подпись | `label, sublabel, initials, icon, accent` |
| `StatusBadge` | Цветной пилюльный бейдж | `label, tone` (success/warning/neutral/danger) |
| `RatingStars` | Ряд из 5 звёзд (filled/outline) | `rating` |
| `Notice` | Информационный блок с иконкой | `tone, title, body, icon` |
| `EmptyState` | Пустое состояние: анимированная иконка + текст | `icon, title, subtitle, action` |
| `LoadingState` | Полноэкранный спиннер | `label` |
| `SkeletonLoader` | Мерцающий placeholder | `style` |
| `SkeletonCard` | Набор skeleton-элементов в виде карточки | — |
| `BottomTabs` | Нижняя навигация (glassmorphism на iOS) | `items, current, onSelect` |
| `BottomSheet` | Анимированный нижний drawer | `visible, onClose, title, children` |
| `ThemeToggle` | Тумблер тёмной темы с анимацией | — |

### Паттерны анимаций

**Spring scale (кнопки):**
```js
// pressIn  → scale: 1 → 0.96 (speed:40, bounciness:0) — мгновенно
// pressOut → scale: 0.96 → 1 (speed:20, bounciness:5) — упругий возврат
```

**Stagger reveal (WelcomeScreen):**
```js
Animated.stagger(80, elements.map(a =>
  Animated.timing(a, { toValue: 1, duration: 480, useNativeDriver: true })
)).start();
```

**BottomSheet slide:**
```js
// open:  spring(translateY → 0, bounciness:4, speed:14)
// close: timing(translateY → 800, duration:220)
```

**EmptyState pulse:**
```js
Animated.loop(Animated.sequence([
  Animated.timing(pulse, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
  Animated.timing(pulse, { toValue: 1,    duration: 1200, useNativeDriver: true }),
]))
```

---

## 16. Дизайн-система и тёмная тема

### Дизайн-токены (theme.js)

#### Светлая тема

```js
lightPalette = {
  bg:          '#EEF4F1',                  // sage-зелёный фон
  surface:     'rgba(255,255,255,0.88)',    // frosted-glass карточки
  surfaceMuted:'#F4F7F5',
  surfaceTint: '#ECF6F0',
  ink:         '#111315',                  // основной текст
  inkSoft:     '#66707A',                  // вторичный текст
  line:        '#DCE5E0',                  // разделители
  accent:      '#34C759',                  // зелёный iOS
  accentMuted: '#DFF7EA',
  accentDark:  '#1E9E56',
  success:     '#1EAF61',
  warning:     '#F2A93B',
  danger:      '#E95F5F',
}
```

#### Тёмная тема (Premium Dark Mode)

```js
darkPalette = {
  bg:          '#121416',                    // глубокий графит (≠ чёрный)
  surface:     '#1B1F24',                    // карточки на 10% светлее фона
  surfaceMuted:'#20242C',
  surfaceTint: '#172019',                    // зелёноватый tint для active-состояний
  ink:         '#F0F2F4',                    // мягкий белый (не #FFF — меньше контраст)
  inkSoft:     '#78828F',
  line:        'rgba(255,255,255,0.06)',      // почти невидимые разделители
  accent:      '#2DBE6C',                    // приглушённый emerald (не neon)
  accentMuted: 'rgba(45,190,108,0.10)',
  accentDark:  '#4ADE80',                    // светлее для активных элементов
  success:     '#4ADE80',
  warning:     '#FBBF24',
  danger:      '#F87171',
}
```

**Принцип дизайна тёмной темы:** Не инверсия цветов, а переосмысление в стиле Apple Wallet / Uber / Linear. Контраст создаётся через свечение и глубину, а не яркость.

#### Отступы и радиусы

```js
spacing = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32 }
radius  = { sm: 12, md: 16, lg: 22, xl: 28, pill: 999 }
```

#### Типографика

```js
typography = {
  display: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: 'System' }),
  body:    Platform.select({ ios: 'Avenir Next', android: 'sans-serif',        default: 'System' }),
}
```

### Специальные эффекты тёмной темы

#### Ambient glow (экран)
```jsx
// Мягкое диагональное свечение в правом верхнем углу
<LinearGradient
  colors={['rgba(20,28,22,0.55)', 'transparent']}
  start={{ x: 1, y: 0 }} end={{ x: 0, y: 0.7 }}
  style={StyleSheet.absoluteFillObject}
/>
// Зелёное glow-пятно 280×280px, почти прозрачное
<View style={{ position:'absolute', top:-80, right:-80,
  width:280, height:280, borderRadius:140,
  backgroundColor:'rgba(45,190,108,0.045)' }} />
```

#### Glass card shine
```jsx
// 1px полупрозрачная линия по верхнему краю → имитирует отражение
<View style={{ position:'absolute', top:0, left:0, right:0,
  height:1, backgroundColor:'rgba(255,255,255,0.07)',
  borderTopLeftRadius:22, borderTopRightRadius:22 }} />
```

#### PrimaryButton emerald gradient
```jsx
<LinearGradient
  colors={['#1A3326', '#1E3D2E']}  // тёмно-изумрудный градиент
  start={{ x:0, y:0 }} end={{ x:1, y:1 }}
  style={[buttonBase, { borderWidth:1, borderColor:'rgba(74,222,128,0.18)' }]}
>
  <Text style={{ color: '#4ADE80' }}>{label}</Text>
</LinearGradient>
```

#### BlurView tab bar (iOS)
```jsx
<BlurView intensity={dark ? 55 : 68} tint={dark ? 'dark' : 'light'}
  style={{ borderRadius:28, overflow:'hidden', borderWidth:1, borderColor:p.line }}>
  <View style={{ flexDirection:'row', gap:6, padding:6 }}>
    {tabItems}
  </View>
</BlurView>
```

#### Active tab (тёмная тема)
- Фон: `rgba(45,190,108,0.12)` — мягкое зелёное свечение
- Иконка и текст: `#4ADE80`
- Нет точки-индикатора (glow сам по себе является индикатором)

#### Per-category accent colors (тёмная тема)

| Категория | Фон | Иконка |
|-----------|-----|--------|
| Veterinary | `rgba(74,222,128,0.10)` | `#4ADE80` (emerald) |
| Grooming | `rgba(201,139,118,0.12)` | `#C98B76` (terracotta) |
| Boarding | `rgba(201,164,86,0.12)` | `#C9A456` (amber) |
| Training | `rgba(88,116,184,0.14)` | `#7B9FE8` (periwinkle) |
| Shelter | `rgba(248,113,113,0.10)` | `#F87171` (rose) |

---

## 17. Локализация (i18n)

### Архитектура

Система локализации реализована в `LocaleContext.js` без сторонних библиотек.

```js
// Структура STRINGS
const STRINGS = {
  ru: {
    auth_welcome_title: 'Добро пожаловать',
    auth_signin: 'Войти',
    cat_veterinary: 'Ветеринария',
    // 120+ ключей...
  },
  kz: {
    auth_welcome_title: 'Қош келдіңіз',
    auth_signin: 'Кіру',
    cat_veterinary: 'Ветеринария',
    // 120+ ключей...
  },
  en: {
    auth_welcome_title: 'Welcome to MyPet',
    auth_signin: 'Sign in',
    cat_veterinary: 'Veterinary',
    // 120+ ключей...
  },
};

// Функция перевода с fallback: locale → en → key
function t(key) {
  return STRINGS[locale]?.[key] ?? STRINGS.en[key] ?? key;
}
```

### Группы ключей перевода

| Группа | Примеры ключей | Кол-во |
|--------|---------------|--------|
| Auth | `auth_welcome_title`, `auth_signin`, `auth_create_account` | 15 |
| Home | `home_eyebrow`, `home_hi`, `home_services`, `home_nearby` | 8 |
| Nearby | `nearby_list`, `nearby_map`, `nearby_searching`, `nearby_top_rated` | 10 |
| Discover | `discover_eyebrow`, `discover_find`, `discover_favorites` | 5 |
| Provider | `provider_rating`, `provider_book`, `provider_save_fav` | 10 |
| Booking | `booking_service`, `booking_day`, `booking_confirm_btn` | 15 |
| Care | `bookings_upcoming`, `pets_title`, `profile_title` | 12 |
| Categories | `cat_veterinary`, `cat_grooming`, `cat_boarding`, `cat_training` | 5 |
| Common | `loading`, `back`, `save`, `cancel` | 10 |
| Welcome stats | `welcome_stat_1_val`, `welcome_stat_2_val` | 6 |
| Days | `day_today`, `day_tomorrow` | 2 |
| Notifications | `notif_empty`, `notif_mark_all` | 4 |

### Переключение языка

- WelcomeScreen: флаги-кнопки (RU / KZ / EN)
- ProfileScreen: полноэкранный LanguagePicker
- Сохраняется в `AsyncStorage('@mypet_locale')`
- Применяется немедленно без перезапуска приложения

---

## 18. Импорт реальных данных из 2GIS

### Источник данных

`parse.csv` — экспорт из 2GIS по запросу "зоосервисы Астана". Содержит ~87 записей с полями: Наименование, Широта, Долгота, Рубрики, URL 2GIS, телефон, адрес.

### Скрипт import-providers.js

```bash
node prisma/import-providers.js
```

**Алгоритм:**

```
Читать parse.csv (csv-parse с автоопределением разделителя)
         │
         ▼
Для каждой строки:
  ├─ Определить категорию по полю "Рубрики":
  │    "ветеринар"                     → VETERINARY
  │    "груминг" | "уход за животными" → GROOMING
  │    "зоогостиниц" | "передержк"     → BOARDING
  │    "кинолог" | "дрессир" | "приют" → TRAINING
  │
  ├─ Дедупликация: проверить 2GIS URL или (name + lat) в БД
  │
  └─ Транзакция (prisma.$transaction):
       User.create({ email: slug@provider.mypet.kz, role: PROVIDER })
       Provider.create({ latitude, longitude, address, verified: true })
       Service.createMany([...шаблоны по категории, 3–4 услуги])
```

**Шаблоны услуг по категории:**

| Категория | Примеры услуг | Ценовой диапазон |
|-----------|--------------|------------------|
| VETERINARY | Первичный приём, Вакцинация, УЗИ | 3 000–15 000 KZT |
| GROOMING | Стрижка (малая/средняя/крупная), Купание | 5 000–20 000 KZT |
| BOARDING | Стандартный номер, VIP, Прогулка | 5 000–25 000 KZT |
| TRAINING | Базовый курс, Коррекция поведения | 10 000–40 000 KZT |

**Результат:** 73 провайдера, 263 услуги.

### Скрипт vary-services.js

После импорта все провайдеры имеют идентичные шаблонные услуги. `vary-services.js` диверсифицирует их:

```bash
node prisma/vary-services.js
```

```js
// Детерминированный PRNG на основе ID провайдера
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}

// hashStr → seededRand → выбрать 2–5 услуг из расширенного пула
// Цена: basePrice * (0.7 + rand() * 0.6), округлить до 500 KZT
// Удалить старые → создать новые в транзакции
```

**Гарантии:**
- Воспроизводимость: один и тот же ID → одни и те же услуги
- Вариация цен: ±30% от базовой цены
- Нет дублей в одном наборе услуг

---

## 19. Docker и производственное развёртывание

### Сервисы docker-compose.yml

| Сервис | Образ | Порт хоста | Описание |
|--------|-------|-----------|----------|
| `postgres` | postgres:16-alpine | 5433→5432 | Персистентная БД (volume: postgres_data) |
| `backend` | ./backend | 4000 | Express API |
| `mypet` | ./apps/mypet | 5173→80 | Основное приложение |
| `mypetwork` | ./apps/mypetwork | 5174→80 | Портал провайдера |
| `mypetadmin` | ./apps/mypetadmin | 5175→80 | Панель администратора |
| `prisma-studio` | ./backend | 5555 | Prisma Studio (profile: tools) |

### Backend Dockerfile

```dockerfile
FROM node:20-slim

# Зависимости для bcrypt (нативный модуль) и Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates

WORKDIR /app
COPY package*.json ./
RUN npm install

# Prisma: генерируем клиент ДО копирования кода
COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npx prisma generate  # re-generate с актуальными типами

EXPOSE 4000

# Миграции → умный seed → запуск сервера
CMD ["sh", "-c", \
  "npx prisma migrate deploy && \
   node prisma/init-db.js && \
   node src/index.js"]
```

**init-db.js** — идемпотентный seed:

```js
const count = await prisma.user.count();
if (count < 2) {
  execSync('node prisma/seed.js', { stdio: 'inherit' });
}
// Если БД уже заполнена — ничего не делаем
```

### Frontend Dockerfile (multi-stage)

```dockerfile
# Stage 1: Build React/Vite приложение
FROM node:20-slim AS build
ARG VITE_API_URL=/api
ARG EXPO_PUBLIC_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build  # → /app/dist

# Stage 2: Раздача через nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

**nginx.conf** — proxy pass для API:

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;

  location / {
    try_files $uri $uri/ /index.html;  # SPA routing
  }

  location /api {
    proxy_pass http://backend:4000;    # Docker internal network
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

### Команды развёртывания

```bash
# Запустить весь стек
docker compose up -d

# Только БД (для локальной разработки)
docker compose up postgres -d

# Пересобрать backend после изменений
docker compose build backend && docker compose up backend -d

# Prisma Studio (GUI для БД)
docker compose --profile tools up prisma-studio -d
# → открыть http://localhost:5555

# Просмотр логов в реальном времени
docker compose logs backend -f

# Полная пересборка с нуля
docker compose down -v && docker compose up --build -d
```

---

## 20. Переменные окружения

### Backend (.env)

| Переменная | Описание | Пример |
|------------|----------|--------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://mypet:pass@postgres:5432/mypet` |
| `JWT_SECRET` | Секрет access-токенов | `your_jwt_secret_64chars` |
| `JWT_REFRESH_SECRET` | Секрет refresh-токенов | `your_refresh_secret_64chars` |
| `PORT` | Порт сервера | `4000` |
| `FRONTEND_URL` | CORS whitelist (через запятую) | `http://localhost:5173,http://localhost:5174` |
| `LOG_LEVEL` | debug / info / warn | `debug` |
| `AUTO_VERIFY_PROVIDERS` | Авто-верификация при регистрации | `false` |

### Mobile (apps/mypet/.env)

| Переменная | Описание | Пример |
|------------|----------|--------|
| `EXPO_PUBLIC_API_URL` | URL API для Expo (LAN IP) | `http://192.168.1.42:4000/api` |
| `VITE_API_URL` | URL API для Vite (web proxy) | `/api` |

> **Важно:** `EXPO_PUBLIC_API_URL` должен содержать IP-адрес вашей машины в локальной сети, **не `localhost`** — Expo Go работает на физическом устройстве и не видит `localhost` хост-машины.

---

## 21. Потоки данных — пошаговые сценарии

### Сценарий 1: Создание бронирования (live mode)

```
Клиент                    Приложение                    Backend                     БД
   │                          │                              │                        │
   │  Тап "Confirm"           │                              │                        │
   │─────────────────────────►│                              │                        │
   │                          │  BookingScreen.handleConfirm()                        │
   │                          │  payload = { serviceId, petId,                        │
   │                          │    scheduledAt, notes }       │                        │
   │                          │  POST /api/bookings ─────────►│                        │
   │                          │                              │  authMiddleware (JWT)   │
   │                          │                              │  requireRole('USER')   │
   │                          │                              │  Zod validate payload  │
   │                          │                              │  Service.findUnique ───►│
   │                          │                              │◄─────── service ────────│
   │                          │                              │  Booking.create ────────►│
   │                          │                              │◄──── booking.id ─────────│
   │                          │                              │  Notification.create ───►│
   │                          │                              │  (для провайдера)        │
   │                          │◄─────── 201 { booking } ─────│                        │
   │                          │  setStep('done')             │                        │
   │◄─────────────────────────│  Экран успеха                │                        │
   │                          │                              │                        │
   │                      8 сек позже... (провайдер онлайн) │                        │
   │                          │                              │                        │
   │                    AppShell.pollProviderNotifications() │                        │
   │                          │  GET /notifications ─────────►│                        │
   │                          │◄─── [{ title: "New booking" }]│                        │
   │                          │  newNotif → showToast()       │                        │
   │                          │  badge++                      │                        │
```

### Сценарий 2: Провайдер принимает заявку

```
Провайдер                 Inbox Screen                  Backend                     БД
   │                          │                              │                        │
   │  Тап [Accept]            │                              │                        │
   │─────────────────────────►│                              │                        │
   │                          │  hapticLight()               │                        │
   │                          │  PATCH /bookings/:id/status ►│                        │
   │                          │  { status: 'ACCEPTED' }      │                        │
   │                          │                              │  Проверить переход     │
   │                          │                              │  PENDING → ACCEPTED ✓  │
   │                          │                              │  Booking.update ────────►│
   │                          │                              │  acceptedAt = now()     │
   │                          │                              │  Notification.create ──►│
   │                          │                              │  (для клиента)          │
   │                          │◄──── 200 { booking } ────────│                        │
   │                          │  load() → обновить список    │                        │
   │◄─────────────────────────│  Карточка: статус → success  │                        │
   │                          │                              │                        │
   │                    Клиент получит уведомление при следующем открытии приложения
```

### Сценарий 3: Офлайн demo mode

```
Пользователь              Demo Mode                    AsyncStorage
   │                          │                              │
   │  Создать бронирование    │                              │
   │─────────────────────────►│                              │
   │                          │  createBooking('demo', payload)│
   │                          │  Найти провайдера в demoProviders
   │                          │  if не найден → использовать _providerSnapshot
   │                          │  Создать booking object       │
   │                          │  writeJson(STORAGE_KEY, newBookings)─►│
   │                          │  Создать providerInboxBooking ►│
   │                          │  pushNotification('BOOKING_REQUESTED')►│
   │◄─────────────────────────│  { id, status: 'PENDING' }   │
   │                          │                              │
   │  Перезапустить приложение│                              │
   │─────────────────────────►│                              │
   │                          │  hydrateSession('demo') ─────►│
   │                          │◄─── demoStorage (с бронью) ──│
   │◄─────────────────────────│  BookingsScreen: бронь жива  │
```

---

## 22. Скрипты разработки

### Backend

```bash
cd backend

# Разработка (hot reload через nodemon)
npm run dev

# Продакшн
npm run start

# Prisma CLI
npm run db:generate          # Регенерировать Prisma Client (после schema.prisma изменений)
npm run db:migrate:dev       # Создать новую миграцию (dev)
npm run db:migrate           # Применить миграции (prod/CI)
npm run db:seed              # Запустить seed.js вручную
npm run db:studio            # Открыть Prisma Studio (http://localhost:5555)

# Скрипты данных
node prisma/import-providers.js   # Импорт 87 провайдеров из parse.csv
node prisma/vary-services.js      # Диверсификация услуг (запускать ПОСЛЕ импорта)
```

### Mobile (Expo + Vite)

```bash
cd apps/mypet

# Expo (мобайл)
npm run start     # Expo DevTools (QR-код для Expo Go)
npm run android   # Запустить на Android эмуляторе/устройстве
npm run ios       # Запустить на iOS симуляторе (только macOS)
npm run web       # Expo в браузере (ограниченные нативные фичи)

# Vite (веб)
npm run dev       # Dev server на :5173
npm run build     # Production build → /dist
npm run preview   # Preview production build локально
```

### Admin-панели

```bash
cd apps/mypetadmin   # или apps/mypetwork
npm run dev          # Vite dev server
npm run build
```

---

## 23. Диаграмма базы данных (ER)

```
┌─────────────────┐          ┌──────────────────────┐
│      users      │          │      providers        │
├─────────────────┤    1:1   ├──────────────────────┤
│ id (PK)         │◄────────►│ id (PK)               │
│ email (UNIQUE)  │          │ user_id (FK, UNIQUE)  │
│ password_hash   │          │ business_name         │
│ first_name      │          │ description           │
│ last_name       │          │ address               │
│ phone           │          │ latitude              │
│ role            │          │ longitude             │
│ tos_accepted    │          │ category              │
│ email_verified  │          │ verified              │
│ blocked         │          │ is_verified           │
│ avatar_url      │          └──────────┬───────────┘
└────────┬────────┘                     │
         │                      1:N     │ 1:N
         │ 1:N              ┌──────────▼───────────┐
    ┌────▼──────────┐       │       services        │
    │     pets      │       ├──────────────────────┤
    ├───────────────┤       │ id (PK)               │
    │ id (PK)       │       │ provider_id (FK)      │
    │ owner_id (FK) │       │ category              │
    │ name          │       │ title                 │
    │ breed         │       │ price_kzt             │
    │ species       │       │ duration_min          │
    │ age           │       └──────────┬───────────┘
    │ weight        │                  │
    └───────┬───────┘                  │ 1:N
            │ 1:1                      │
    ┌───────▼───────────┐   ┌──────────▼───────────┐
    │  pet_medical_cards │  │       bookings        │
    ├───────────────────┤  ├──────────────────────┤
    │ id (PK)           │  │ id (PK)               │
    │ pet_id (FK,UNIQUE)│  │ user_id (FK)          │
    │ allergies         │  │ provider_id (FK)      │
    │ vaccinations      │  │ service_id (FK)       │
    │ medications       │  │ pet_id (FK, nullable) │
    │ past_illnesses    │  │ status (enum)         │
    │ chronic_diseases  │  │ scheduled_at          │
    │ last_vet_visit    │  │ accepted_at           │
    └───────────────────┘  │ started_at            │
                           │ completed_at          │
    ┌──────────────────┐   │ cancelled_at          │
    │ favorite_providers│  │ notes                 │
    ├──────────────────┤  └──────────┬───────────┘
    │ id (PK)          │             │ 1:1
    │ user_id (FK)     │   ┌──────────▼───────────┐
    │ provider_id (FK) │   │       reviews         │
    │ UNIQUE(usr,prov) │   ├──────────────────────┤
    └──────────────────┘   │ id (PK)               │
                           │ booking_id (FK,UNIQUE)│
    ┌──────────────────┐   │ user_id (FK)          │
    │  notifications   │   │ provider_id (FK)      │
    ├──────────────────┤   │ rating (1–5)          │
    │ id (PK)          │   │ comment               │
    │ user_id (FK)     │   └──────────────────────┘
    │ title            │
    │ body             │
    │ read             │
    └──────────────────┘
```

---

## Краткий итог

| Аспект | Реализация |
|--------|-----------|
| **Архитектура** | Монорепозиторий, 3 фронтенда + 1 backend + PostgreSQL |
| **Мобильное приложение** | React Native + Expo, кастомная навигация, 14 экранов |
| **API** | REST, 35+ эндпоинтов, JWT auth, Swagger UI |
| **База данных** | PostgreSQL 16, Prisma ORM, 8 моделей, GDPR-ready |
| **Безопасность** | JWT (15m/7d), bcrypt, Helmet, CORS, Rate limiting |
| **UX** | Тёмная тема, 3 языка, haptic feedback, pull-to-refresh, skeleton loading |
| **Офлайн** | Полный demo mode без backend, AsyncStorage персистентность |
| **Геолокация** | Haversine-поиск, GPS + fallback, react-native-maps |
| **Данные** | 73 реальных провайдера Астаны (2GIS), 263 услуги |
| **Деплой** | Docker Compose, 5 сервисов, nginx, multi-stage build |
