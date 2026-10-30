export type UserRole = 'ADMIN' | 'SUPER_AGENT' | 'AGENT' | 'PLAYER';

export interface Provider {
  id: string;
  name: string;
  logo: string;
  category: 'Slots' | 'Live Casino' | 'Sportsbook' | 'Crash Games' | 'Table Games';
  gameCount: number;
  apiLatency: number; // in ms
  status: 'active' | 'maintenance' | 'disabled';
  apiEndpoint: string;
  revenueShare: number; // percentage the provider takes
}

export interface Game {
  id: string;
  title: string;
  providerId: string;
  providerName: string;
  category: 'Slots' | 'Live Casino' | 'Sportsbook' | 'Crash Games' | 'Table Games';
  rtp: number; // Return to Player percentage
  volatility: 'Low' | 'Medium' | 'High';
  rating: number;
  playCount: number;
  gradient: string;
  iconType: string;
  iframeUrl?: string;
}

export interface Account {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  displayName: string;
  balance: number;
  parentId: string | null; // Admin has null, Super Agent has Admin ID, Agent has Super Agent ID, Player has Agent ID
  agentId?: string;
  superAgentId?: string;
  commissionRate: number; // percentage of revenue kept by this account/tier
  depositCommissionRate?: number; // percentage of deposit kept as commission
  withdrawalCommissionRate?: number; // percentage of withdrawal kept as commission
  createdAt: string;
  status: 'active' | 'suspended';
  phoneNumber?: string;
  cbeAccount?: string;
}

export interface Transaction {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  amount: number;
  timestamp: string;
  type: 'transfer' | 'commission' | 'deposit' | 'withdrawal';
  notes?: string;
  agentShare?: number;
  superAgentShare?: number;
  adminShare?: number;
}

export interface BetLog {
  id: string;
  playerId: string;
  playerName: string;
  agentId: string;
  superAgentId: string;
  gameId: string;
  gameTitle: string;
  providerName: string;
  betAmount: number;
  payoutAmount: number;
  outcome: 'win' | 'lose' | 'pending';
  timestamp: string;
  // Commission split calculation
  adminShare: number;
  superAgentShare: number;
  agentShare: number;
}

export interface CashRequest {
  id: string;
  playerId: string;
  playerName: string;
  agentId?: string; // empty/undefined means public pool, unassigned
  agentName?: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  status: 'pending' | 'claimed' | 'approved' | 'rejected';
  timestamp: string;
  paymentMethod: string; // e.g. 'CBE', 'Telebirr', 'Cash'
  paymentDetails: string; // e.g. Phone number, Bank account, Transaction ID
  notes?: string;
  claimedByAgentPhone?: string; // displayed to player after claim
  claimedByAgentCbe?: string; // displayed to player after claim
}

export interface AgentPointRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'AGENT' | 'SUPER_AGENT';
  receiverId: string;
  receiverName: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  status: 'pending' | 'approved' | 'rejected';
  timestamp: string;
  notes?: string;
  processedTimestamp?: string;
  referenceNumber?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string; // 'global' or 'dm_{id1}_{id2}'
  senderId: string;
  senderName: string;
  senderRole: UserRole | 'SYSTEM' | 'AI_ASSISTANT';
  receiverId?: string;
  receiverName?: string;
  content: string;
  timestamp: string;
  read?: boolean;
}

export interface AggregatorConfig {
  apiKey: string;
  apiEndpoint: string;
  secureWebhook: string;
  seamlessWalletEnabled: boolean;
  platformCommissionFee: number; // Admin overall fee
}

export interface SystemState {
  accounts: Account[];
  providers: Provider[];
  config: AggregatorConfig;
  transactions: Transaction[];
  bets: BetLog[];
  cashRequests?: CashRequest[];
  agentPointRequests?: AgentPointRequest[];
  chatMessages?: ChatMessage[];
}
