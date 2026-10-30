import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authLimiter } from '../../middleware/rate-limit.middleware.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

export const authRouter = Router();

authRouter.get('/csrf', AuthController.getCsrfToken);
authRouter.post('/register', authLimiter, AuthController.register);
authRouter.post('/login', authLimiter, AuthController.login);
authRouter.get('/me', AuthController.me);
authRouter.post('/logout', requireAuth, AuthController.logout);
authRouter.post('/change-password', requireAuth, AuthController.changePassword);
