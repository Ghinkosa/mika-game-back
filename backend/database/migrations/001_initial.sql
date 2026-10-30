-- Mika Games PostgreSQL Initial Schema Migration (001_initial.sql)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'SUPER_AGENT', 'AGENT', 'PLAYER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE account_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cash_request_type AS ENUM ('DEPOSIT', 'WITHDRAWAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cash_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Users Table (All auth credentials and hierarchy)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(40) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'PLAYER',
  status account_status NOT NULL DEFAULT 'ACTIVE',
  parent_id UUID REFERENCES users(id) ON DELETE SET NULL,
  phone_number VARCHAR(32),
  cbe_account VARCHAR(64),
  commission_rate NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (commission_rate BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (username = lower(username) AND username ~ '^[a-z0-9_.-]{3,40}$')
);

CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Wallets Table (Minor units e.g. ETB cents or standard minor units)
CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  currency CHAR(3) NOT NULL DEFAULT 'ETB',
  balance_minor BIGINT NOT NULL DEFAULT 0 CHECK (balance_minor >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Double-entry Ledger Transactions
CREATE TABLE IF NOT EXISTS ledger_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type VARCHAR(32) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'POSTED' CHECK (status IN ('PENDING', 'POSTED', 'REVERSED', 'FAILED')),
  idempotency_key VARCHAR(128) UNIQUE,
  reference VARCHAR(128),
  description VARCHAR(250) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount_minor BIGINT NOT NULL CHECK (amount_minor <> 0),
  currency CHAR(3) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_user_created ON ledger_entries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx ON ledger_entries(transaction_id);

-- 4. Game Bets & Outcomes
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES ledger_transactions(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  game_code VARCHAR(64) NOT NULL,
  provider_code VARCHAR(64) NOT NULL,
  round_id VARCHAR(128),
  external_bet_id VARCHAR(128) UNIQUE,
  bet_amount_minor BIGINT NOT NULL CHECK (bet_amount_minor >= 0),
  win_amount_minor BIGINT NOT NULL DEFAULT 0 CHECK (win_amount_minor >= 0),
  status VARCHAR(24) NOT NULL DEFAULT 'SETTLED' CHECK (status IN ('PENDING', 'SETTLED', 'CANCELLED', 'ROLLED_BACK')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id, created_at DESC);

-- 5. Cash Requests (Player to Agent deposit/withdrawal)
CREATE TABLE IF NOT EXISTS cash_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  target_agent_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  request_type cash_request_type NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  status cash_request_status NOT NULL DEFAULT 'PENDING',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_requests_agent ON cash_requests(target_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_requests_user ON cash_requests(user_id, status);

-- 6. Commissions Settlement Table
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  source_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  turnover_minor BIGINT NOT NULL DEFAULT 0,
  commission_amount_minor BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'PAID' CHECK (status IN ('PENDING', 'PAID', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commissions_agent ON commissions(agent_id, created_at DESC);

-- 7. Audit Events
CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(80),
  target_id VARCHAR(128),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at DESC);

-- 8. Express Session Table for connect-pg-simple
CREATE TABLE IF NOT EXISTS "session" (
  "sid" VARCHAR NOT NULL PRIMARY KEY,
  "sess" JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
