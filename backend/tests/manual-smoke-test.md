# Mika Games Backend Manual Smoke Test Guide

This document guides you through running the local PostgreSQL API, running database migrations and seed scripts, and verifying all modules.

---

## 1. Setup & Database Preparation

```bash
# In the backend directory:
cd backend

# 1. Install dependencies
npm install

# 2. Configure .env from .env.example
cp .env.example .env

# 3. Apply schema migrations (ensure local PostgreSQL is running)
psql -d mika -U mika_api -f database/migrations/001_initial.sql

# 4. Run database seed (idempotent; only seeds if tables are empty)
npm run seed
```

---

## 2. Start Dev Server

```bash
npm run dev
# Server will listen on http://localhost:8080
```

---

## 3. Smoke Test Endpoints with `curl`

### Health Check
```bash
curl -i http://localhost:8080/health
```

### Initialize CSRF Token & Session
```bash
curl -i -c cookies.txt http://localhost:8080/api/auth/csrf
```
Save the returned `csrfToken` for non-GET requests.

### Player Registration
```bash
curl -i -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <CSRF_TOKEN>" \
  -d '{
    "username": "new_player",
    "displayName": "New Tester",
    "password": "Password123!",
    "phoneNumber": "+251911000000"
  }' \
  http://localhost:8080/api/auth/register
```

### Player Login
```bash
curl -i -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <CSRF_TOKEN>" \
  -d '{"username": "admin", "password": "password"}' \
  http://localhost:8080/api/auth/login
```

### Check Current Authenticated User (`/api/auth/me`)
```bash
curl -i -b cookies.txt http://localhost:8080/api/auth/me
```

### Check Wallet & Accounts
```bash
curl -i -b cookies.txt http://localhost:8080/api/accounts/me
curl -i -b cookies.txt http://localhost:8080/api/accounts
```

### Test Bet Debit
```bash
curl -i -b cookies.txt -c cookies.txt \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <CSRF_TOKEN>" \
  -H "Idempotency-Key: bet-uuid-101" \
  -d '{"amountMinor": 5000, "gameCode": "aviator", "externalBetId": "ext-101"}' \
  http://localhost:8080/api/bets
```

### Test SoftSwiss Callback (`/api/integrations/softswiss/stage/callback`)
```bash
curl -i -X POST http://localhost:8080/api/integrations/softswiss/stage/callback \
  -H "Content-Type: application/json" \
  -d '{
    "action": "play",
    "user_id": "pl-1",
    "currency": "ETB",
    "game": "aviator",
    "game_id": "spribe_aviator",
    "bet": "50.000000000000",
    "win": "120.000000000000",
    "session_id": "sess-test-1"
  }'
```
