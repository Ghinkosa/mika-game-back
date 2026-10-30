import { Router } from 'express';
import { ProvidersController } from './providers.controller.js';

export const providersRouter = Router();

providersRouter.get('/', ProvidersController.listProviders);
providersRouter.post('/launch', ProvidersController.launchGame);
