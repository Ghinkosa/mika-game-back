import { config } from '../../config/index.js';

export interface ProviderItem {
  id: string;
  name: string;
  category: 'SLOTS' | 'LIVE' | 'CRASH' | 'SPORTS';
  status: 'ACTIVE' | 'MAINTENANCE';
  gamesCount: number;
}

const DEFAULT_PROVIDERS: ProviderItem[] = [
  { id: 'spribe', name: 'Spribe (Aviator, Mines)', category: 'CRASH', status: 'ACTIVE', gamesCount: 12 },
  { id: 'pragmatic', name: 'Pragmatic Play', category: 'SLOTS', status: 'ACTIVE', gamesCount: 180 },
  { id: 'evolution', name: 'Evolution Gaming', category: 'LIVE', status: 'ACTIVE', gamesCount: 95 },
  { id: 'bgaming', name: 'BGaming', category: 'SLOTS', status: 'ACTIVE', gamesCount: 88 },
  { id: 'smartsoft', name: 'SmartSoft Gaming (JetX)', category: 'CRASH', status: 'ACTIVE', gamesCount: 24 },
  { id: 'netent', name: 'NetEnt', category: 'SLOTS', status: 'ACTIVE', gamesCount: 110 }
];

export class ProvidersService {
  static getProviders(): ProviderItem[] {
    return DEFAULT_PROVIDERS;
  }

  static generateLauncherUrl(gameId: string, userId: string, mode: 'real' | 'demo' = 'real'): string {
    const gateway = config.SOFTSWISS_ENVIRONMENT === 'prod'
      ? config.SOFTSWISS_PROD_GATEWAY_URL
      : config.SOFTSWISS_STAGE_GATEWAY_URL;

    const casinoId = config.SOFTSWISS_CASINO_ID || 'mika_casino_stage';
    return `${gateway}/launch?game=${encodeURIComponent(gameId)}&user_id=${encodeURIComponent(userId)}&casino_id=${encodeURIComponent(casinoId)}&currency=ETB&mode=${mode}`;
  }
}
