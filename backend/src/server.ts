import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { config, isProduction } from './config/index.js';
import { pool } from './database/connection.js';
import { csrfProtection } from './middleware/csrf.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

// Module Routers
import { authRouter } from './modules/auth/auth.routes.js';
import { accountsRouter } from './modules/accounts/accounts.routes.js';
import { walletRouter } from './modules/wallet/wallet.routes.js';
import { commissionsRouter } from './modules/commissions/commissions.routes.js';
import { transactionsRouter } from './modules/transactions/transactions.routes.js';
import { betsRouter } from './modules/bets/bets.routes.js';
import { providersRouter } from './modules/providers/providers.routes.js';
import { cashRequestsRouter } from './modules/cash-requests/cash-requests.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';

// Integrations
import { softswissRouter } from './integrations/softswiss/softswiss.routes.js';

const app = express();
const PgSession = connectPgSimple(session);

if (isProduction) app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet());

app.use(
  cors({
    origin: config.FRONTEND_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'Idempotency-Key', 'X-Request-Sign']
  })
);

app.use(express.json({ limit: '64kb' }));

// Session with PostgreSQL persistence
app.use(
  session({
    name: isProduction ? '__Host-mika.sid' : 'mika.sid',
    store: new PgSession({
      pool,
      tableName: 'session',
      createTableIfMissing: false
    }),
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: config.SESSION_MAX_AGE_MS
    }
  })
);

// CSRF Protection on state-changing authenticated calls
app.use(csrfProtection);

// Health Endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Module APIs
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/commissions', commissionsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/bets', betsRouter);
app.use('/api/providers', providersRouter);
app.use('/api/cash-requests', cashRequestsRouter);
app.use('/api/reports', reportsRouter);

// Mount Integrations
app.use('/api/integrations/softswiss', softswissRouter);

// Centralized Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(config.PORT, () => {
    console.log(`🚀 Mika Modular Backend listening on port ${config.PORT}`);
    console.log(`📡 SoftSwiss Stage Callback: /api/integrations/softswiss/stage/callback`);
    console.log(`📡 SoftSwiss Prod Callback:  /api/integrations/softswiss/prod/callback`);
  });
}

export default app;
