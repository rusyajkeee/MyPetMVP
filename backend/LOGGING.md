# Логирование в MyPet Backend

## Конфигурация

Logирование контролируется переменной окружения `LOG_LEVEL`:

```env
LOG_LEVEL=debug        # Все логи (debug, info, warn, error)
LOG_LEVEL=info         # Основные логи (по умолчанию)
LOG_LEVEL=warn         # Только предупреждения и ошибки
LOG_LEVEL=error        # Только ошибки
```

## Что логируется

### Запросы (Request Logger Middleware)
- URL и метод запроса
- Origin (для диагностики CORS)
- User-Agent (тип приложения)
- Статус код ответа
- Время обработки запроса (в ms)

Пример лога:
```
[2026-03-17T10:45:23.123Z] [INFO] Incoming request { method: 'POST', path: '/api/auth/login', origin: 'http://192.168.1.100:5173' }
[2026-03-17T10:45:23.456Z] [INFO] Response sent { method: 'POST', path: '/api/auth/login', status: 200, duration: '250ms' }
```

### Аутентификация (Auth Middleware)
- Попытки входа (успешные и неудачные)
- Регистрация новых пользователей
- Проверка токенов
- Обновление токенов (refresh)
- Блокировка аккаунтов

Примеры логов:
```
[2026-03-17T10:45:23.123Z] [INFO] Login attempt { email: 'user@example.com' }
[2026-03-17T10:45:23.456Z] [INFO] User logged in successfully { userId: '123', email: 'user@example.com', role: 'USER' }
[2026-03-17T10:45:30.789Z] [WARN] Login failed: invalid credentials { email: 'user@example.com' }
```

### CORS
- Разрешенные запросы от мобильных приложений
- Блокированные запросы с неизвестного origins

Пример:
```
[2026-03-17T10:45:23.123Z] [DEBUG] CORS request allowed { origin: 'http://192.168.1.100:5173' }
[2026-03-17T10:45:30.789Z] [WARN] CORS request blocked { origin: 'http://malicious.site.com' }
```

### Ошибки (Error Handler)
- Все необработанные ошибки
- Stack trace для отладки
- HTTP статус код

Пример:
```
[2026-03-17T10:45:23.123Z] [ERROR] Request error { method: 'GET', path: '/api/users/123', message: 'User not found', stack: '...' }
```

## Использование логирования в коде

Импорт:
```javascript
import logger from '../lib/logger.js';
```

Использование:
```javascript
logger.debug('Debug message', { variable: 'value' });
logger.info('Info message', { userId: '123' });
logger.warn('Warning message', { issue: 'Something unexpected' });
logger.error('Error message', { error: 'Critical issue' });
```

## Диагностика проблем с мобильным приложением

Чтобы отследить проблемы подключения телефона:

1. **Установите LOG_LEVEL=debug** в .env файле
2. **Запустите бэкэнд**: `npm run dev`
3. **Попробуйте подключиться с телефона**
4. **Посмотрите логи**:
   - CORS ошибки: значит мобильное приложение имеет другой origin
   - Auth ошибки: неправильный token или неверные данные для входа
   - Connection refused: телефон не может достичь IP адреса компьютера

## Примеры логов для разных сценариев

### Успешный вход с телефона
```
[2026-03-17T10:45:23.123Z] [INFO] Incoming request { method: 'POST', path: '/api/auth/login', origin: 'http://192.168.1.100:5173', userAgent: 'Mozilla/5.0 (Android...' }
[2026-03-17T10:45:23.456Z] [INFO] Login attempt { email: 'user@example.com' }
[2026-03-17T10:45:23.789Z] [INFO] User logged in successfully { userId: '123', email: 'user@example.com', role: 'USER' }
[2026-03-17T10:45:23.900Z] [INFO] Response sent { method: 'POST', path: '/api/auth/login', status: 200, duration: '777ms' }
```

### Проблема с CORS
```
[2026-03-17T10:45:23.123Z] [WARN] CORS request blocked { origin: 'http://192.168.1.105:5173' }
[2026-03-17T10:45:23.456Z] [ERROR] Request error { method: 'POST', path: '/api/auth/login', message: 'CORS policy blocked' }
```

### Проблема с network connectivity
```
// Логов не будет - телефон вообще не может подключиться
// Проверьте:
// 1. IP адрес компьютера в VITE_API_URL на телефоне
// 2. Firewall на компьютере
// 3. Телефон в той же Wi-Fi сети
```
