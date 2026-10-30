import { Router } from 'express';
import { SoftSwissController } from './softswiss.controller.js';

export const softswissRouter = Router();

// Distinct Stage Callback URL
softswissRouter.post('/stage/callback', SoftSwissController.handleWebhook);

// Distinct Production Callback URL
softswissRouter.post('/prod/callback', SoftSwissController.handleWebhook);
