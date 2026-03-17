# HTTPS Setup для MyPet Backend

## Проблема

При тестировании мобильного приложения на Android через Capacitor возникает ошибка:
```
Mixed Content: The page at 'https://localhost/discover' was loaded over HTTPS, 
but requested an insecure XMLHttpRequest endpoint 'http://192.168.1.6:4000/api'
```

Это происходит потому, что мобильное приложение работает через HTTPS, но бэкэнд использует HTTP.

## Решение: Использовать HTTPS на бэкэнде

### Опция 1: HTTPS с самоподписанным сертификатом (рекомендуется)

#### На Windows:

1. **Установите OpenSSL** (если не установлен):
   - Скачайте с [slproweb.com/products/Win32OpenSSL.html](https://slproweb.com/products/Win32OpenSSL.html) или используйте WSL
   - Или установите через `choco install openssl`

2. **Генерируйте SSL сертификат**:
   ```bash
   cd backend
   npm run cert:generate
   ```
   
   Это создаст файлы:
   - `backend/certs/key.pem` (приватный ключ)
   - `backend/certs/cert.pem` (сертификат)

3. **Убедитесь, что `USE_HTTPS=true` в `.env`**:
   ```env
   USE_HTTPS=true
   ```

4. **Запустите бэкэнд**:
   ```bash
   npm run dev
   ```

### Опция 2: HTTP для quick development (без HTTPS)

Если у вас проблемы с установкой OpenSSL, временно используйте HTTP:

1. **Установите в `.env`**:
   ```env
   USE_HTTPS=false
   ```

2. **Запустите бэкэнд**:
   ```bash
   npm run dev
   ```

3. **На мобильном приложении обновите API URL**:
   ```bash
   cd apps/mypet
   set VITE_API_URL=http://192.168.1.6:4000/api
   npm run dev
   ```

**Важно**: Capacitor может блокировать HTTP запросы. Если это не работает, используйте HTTPS.

## Что изменилось

### backend/src/index.js
- Добавлена поддержка HTTPS с самоподписанным сертификатом
- CSP политика обновлена для поддержки мобильных приложений
- Допустимые origins теперь: `https://localhost`, `http://192.168.1.6:*`

### backend/scripts/generate-cert.js
- Скрипт для автоматического создания самоподписанного сертификата

### .env.example
- Новая переменная `USE_HTTPS` (по умолчанию `true`)

## Логирование

При запуске бэкэнда вы увидите логи:
```
✓ MyPet API server is running (HTTPS)
  url: https://localhost:4000
  network: https://192.168.1.6:4000
```

## Мобильное приложение

Обновите API URL в `apps/mypet/.env` или при запуске:

**Для HTTPS**:
```bash
set VITE_API_URL=https://192.168.1.6:4000/api
npm run dev
```

**Для HTTP** (если USE_HTTPS=false):
```bash
set VITE_API_URL=http://192.168.1.6:4000/api
npm run dev
```

## Тестирование

1. **Проверьте health endpoint**:
   ```bash
   # Windows PowerShell
   $insecure = [System.Net.ServicePointManager]::SecurityProtocol
   [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor [System.Net.SecurityProtocolType]::Tls12
   Invoke-WebRequest -Uri "https://192.168.1.6:4000/api/health" -SkipCertificateCheck
   
   # Или просто через браузер (игнорируйте предупреждение о сертификате)
   ```

2. **Проверьте в консоли мобильного:**
   ```
   ✓ Attempting login request to: https://192.168.1.6:4000/api
   ✓ Response received (не должно быть Mixed Content ошибок)
   ```

## Troubleshooting

### "SSL certificates not found"
```bash
npm run cert:generate
```

### OpenSSL не установлен (Windows)
- Используйте WSL2: `wsl bash`
- Или установите через `choco install openssl`
- Или используйте `USE_HTTPS=false` (временное решение)

### Все еще Mixed Content ошибка
1. Убедитесь, что бэкэнд использует HTTPS: `npm run dev` должен показать `(HTTPS)`
2. Проверьте мобильное приложение - обновите `VITE_API_URL=https://...`
3. Перезагрузите приложение в Android Studio

## Production

В production обязательно:
- Используйте настоящий SSL сертификат от Certificate Authority (Let's Encrypt, etc.)
- Установите `USE_HTTPS=true`
- Установите правильные `FRONTEND_URL` с вашим доменом
