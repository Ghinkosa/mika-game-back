import { SystemState, Account, Transaction, BetLog, Provider, Game, UserRole, AgentPointRequest, ChatMessage } from '../types';
import { INITIAL_PROVIDERS } from '../data/mockGames';

const LOCAL_STORAGE_KEY = 'betting_aggregator_system_db';

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'admin-1',
    username: 'admin',
    password: 'password',
    role: 'ADMIN',
    displayName: 'Mika Global Admin',
    balance: 5000000,
    parentId: null,
    commissionRate: 100, // Keeps 100% of the remaining master royalty
    depositCommissionRate: 10,
    withdrawalCommissionRate: 10,
    createdAt: '2026-01-01T00:00:00Z',
    status: 'active',
    phoneNumber: '+251911223344',
    cbeAccount: '1000123456789'
  },
  {
    id: 'sa-1',
    username: 'super_vortex',
    password: 'password',
    role: 'SUPER_AGENT',
    displayName: 'Vortex Elite Distribution',
    balance: 350000,
    parentId: 'admin-1',
    commissionRate: 85, // Retains 85% total share of GGR, paying 15% royalty to Admin
    depositCommissionRate: 5,
    withdrawalCommissionRate: 5,
    createdAt: '2026-02-15T12:00:00Z',
    status: 'active',
    phoneNumber: '+251912345678',
    cbeAccount: '1000987654321'
  },
  {
    id: 'sa-2',
    username: 'super_apex',
    password: 'password',
    role: 'SUPER_AGENT',
    displayName: 'Apex Global Network',
    balance: 200000,
    parentId: 'admin-1',
    commissionRate: 80, // Retains 80% total GGR, paying 20% to Admin
    depositCommissionRate: 4,
    withdrawalCommissionRate: 4,
    createdAt: '2026-03-01T09:30:00Z',
    status: 'active',
    phoneNumber: '+251923456789',
    cbeAccount: '1000876543210'
  },
  {
    id: 'ag-1',
    username: 'agent_ares',
    password: 'password',
    role: 'AGENT',
    displayName: 'Ares Sports Club',
    balance: 85000,
    parentId: 'sa-1',
    commissionRate: 70, // Keeps 70% GGR. Vortex Elite takes (85% - 70% = 15%). Admin takes 15%.
    depositCommissionRate: 3,
    withdrawalCommissionRate: 3,
    createdAt: '2026-02-20T14:45:00Z',
    status: 'active',
    phoneNumber: '+251934567890',
    cbeAccount: '1000765432109'
  },
  {
    id: 'ag-2',
    username: 'agent_zeus',
    password: 'password',
    role: 'AGENT',
    displayName: 'Zeus Betting Lounge',
    balance: 50000,
    parentId: 'sa-1',
    commissionRate: 65, // Keeps 65% GGR. Vortex Elite takes (85% - 65% = 20%). Admin takes 15%.
    depositCommissionRate: 2,
    withdrawalCommissionRate: 2,
    createdAt: '2026-03-10T11:20:00Z',
    status: 'active',
    phoneNumber: '+251945678901',
    cbeAccount: '1000654321098'
  },
  {
    id: 'ag-3',
    username: 'agent_titan',
    password: 'password',
    role: 'AGENT',
    displayName: 'Titan VIP Slot Club',
    balance: 90000,
    parentId: 'sa-2',
    commissionRate: 72, // Keeps 72% GGR. Apex Global takes (80% - 72% = 8%). Admin takes 20%.
    depositCommissionRate: 3,
    withdrawalCommissionRate: 3,
    createdAt: '2026-03-12T16:00:00Z',
    status: 'active',
    phoneNumber: '+251956789012',
    cbeAccount: '1000543210987'
  },
  {
    id: 'pl-1',
    username: 'lucky_spin',
    password: 'password',
    role: 'PLAYER',
    displayName: 'James R. (Lucky Spin)',
    balance: 3500,
    parentId: 'ag-1', // Under Ares Sports Club
    commissionRate: 0,
    createdAt: '2026-03-15T18:30:00Z',
    status: 'active',
    phoneNumber: '+251967890123',
    cbeAccount: '1000432109876'
  },
  {
    id: 'pl-2',
    username: 'high_roller',
    password: 'password',
    role: 'PLAYER',
    displayName: 'Sophia K. (VIP Elite)',
    balance: 15000,
    parentId: 'ag-3', // Under Titan VIP Slot Club
    commissionRate: 0,
    createdAt: '2026-03-18T10:15:00Z',
    status: 'active',
    phoneNumber: '+251978901234',
    cbeAccount: '1000321098765'
  },
  {
    id: 'pl-3',
    username: 'crash_master',
    password: 'password',
    role: 'PLAYER',
    displayName: 'Erick L. (Crash Pro)',
    balance: 2100,
    parentId: 'ag-2', // Under Zeus Betting Lounge
    commissionRate: 0,
    createdAt: '2026-03-20T22:00:00Z',
    status: 'active',
    phoneNumber: '+251989012345',
    cbeAccount: '1000210987654'
  }
];

const DEFAULT_CONFIG = {
  apiKey: 'mika_live_aggregator_938hskjfhskdjfhwisdjh',
  apiEndpoint: 'https://api.mika-games.et/v1/games',
  secureWebhook: 'https://api.mika-games.et/v1/webhooks/wallet',
  seamlessWalletEnabled: true,
  platformCommissionFee: 15, // standard platform fee
};

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    senderId: 'admin-1',
    senderName: 'Mika Global Admin',
    receiverId: 'sa-1',
    receiverName: 'Vortex Elite Distribution',
    amount: 350000,
    timestamp: '2026-02-15T12:05:00Z',
    type: 'transfer',
    notes: 'Initial credit distribution allocation for Super Agent'
  },
  {
    id: 'tx-2',
    senderId: 'admin-1',
    senderName: 'Mika Global Admin',
    receiverId: 'sa-2',
    receiverName: 'Apex Global Network',
    amount: 200000,
    timestamp: '2026-03-01T09:35:00Z',
    type: 'transfer',
    notes: 'Initial credit allocation'
  },
  {
    id: 'tx-3',
    senderId: 'sa-1',
    senderName: 'Vortex Elite Distribution',
    receiverId: 'ag-1',
    receiverName: 'Ares Sports Club',
    amount: 85000,
    timestamp: '2026-02-20T15:00:00Z',
    type: 'transfer',
    notes: 'Agent setup credits allocation'
  },
  {
    id: 'tx-4',
    senderId: 'ag-1',
    senderName: 'Ares Sports Club',
    receiverId: 'pl-1',
    receiverName: 'James R. (Lucky Spin)',
    amount: 3500,
    timestamp: '2026-03-15T19:00:00Z',
    type: 'deposit',
    notes: 'Cash in deposit'
  }
];

const DEFAULT_BETS: BetLog[] = [
  {
    id: 'bet-1',
    playerId: 'pl-1',
    playerName: 'James R. (Lucky Spin)',
    agentId: 'ag-1',
    superAgentId: 'sa-1',
    gameId: 'gates_of_olympus',
    gameTitle: 'Gates of Olympus 1000',
    providerName: 'Pragmatic Play',
    betAmount: 100,
    payoutAmount: 0,
    outcome: 'lose',
    timestamp: '2026-03-25T14:30:22Z',
    adminShare: 15,       // 100% - 85% = 15% of $100 loss
    superAgentShare: 15,  // 85% - 70% = 15% of $100 loss
    agentShare: 70,       // 70% of $100 loss
  },
  {
    id: 'bet-2',
    playerId: 'pl-2',
    playerName: 'Sophia K. (VIP Elite)',
    agentId: 'ag-3',
    superAgentId: 'sa-2',
    gameId: 'crazy_time',
    gameTitle: 'Crazy Time Live',
    providerName: 'Evolution Gaming',
    betAmount: 500,
    payoutAmount: 1250,
    outcome: 'win',
    timestamp: '2026-03-25T14:35:10Z',
    adminShare: -150,     // 20% of -$750 GGR (payout exceeded bet)
    superAgentShare: -60, // 8% of -$750 GGR
    agentShare: -540,     // 72% of -$750 GGR
  }
];

const DEFAULT_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-init-1',
    conversationId: 'global',
    senderId: 'admin-1',
    senderName: 'Mika Global Admin',
    senderRole: 'ADMIN',
    content: 'Welcome to the Mika Games Platform Hub! Live support & system broadcast channels are active.',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    read: true
  },
  {
    id: 'msg-init-2',
    conversationId: 'global',
    senderId: 'ag-1',
    senderName: 'Ares Sports Club',
    senderRole: 'AGENT',
    content: 'Great matches scheduled this week! Best odds live on EPL & Champions League.',
    timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
    read: true
  },
  {
    id: 'msg-init-3',
    conversationId: 'global',
    senderId: 'pl-1',
    senderName: 'James R. (Lucky Spin)',
    senderRole: 'PLAYER',
    content: 'Thanks Ares! Just hit a 10x multiplier on Gates of Olympus 🚀',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    read: true
  }
];

let inMemoryState: SystemState | null = null;

export function getSystemState(): SystemState {
  if (typeof window === 'undefined') {
    if (inMemoryState) {
      return inMemoryState;
    }
    const initialState: SystemState = {
      accounts: DEFAULT_ACCOUNTS,
      providers: INITIAL_PROVIDERS,
      config: DEFAULT_CONFIG,
      transactions: DEFAULT_TRANSACTIONS,
      bets: DEFAULT_BETS,
      cashRequests: [],
      agentPointRequests: [],
      chatMessages: DEFAULT_CHAT_MESSAGES
    };
    inMemoryState = initialState;
    return initialState;
  }

  if (inMemoryState) {
    return inMemoryState;
  }

  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!saved) {
    const initialState: SystemState = {
      accounts: DEFAULT_ACCOUNTS,
      providers: INITIAL_PROVIDERS,
      config: DEFAULT_CONFIG,
      transactions: DEFAULT_TRANSACTIONS,
      bets: DEFAULT_BETS,
      cashRequests: [],
      agentPointRequests: [],
      chatMessages: DEFAULT_CHAT_MESSAGES
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialState));
    inMemoryState = initialState;
    return initialState;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!parsed.cashRequests) {
      parsed.cashRequests = [];
    }
    if (!parsed.agentPointRequests) {
      parsed.agentPointRequests = [];
    }
    if (!parsed.chatMessages || !Array.isArray(parsed.chatMessages)) {
      parsed.chatMessages = DEFAULT_CHAT_MESSAGES;
    }
    // Ensure all accounts have a password (fallback to 'password')
    if (parsed.accounts && Array.isArray(parsed.accounts)) {
      parsed.accounts = parsed.accounts.map((a: any) => ({
        ...a,
        password: a.password || 'password'
      }));
    }
    // Ensure new initial providers (like the Aggregated Gateway) are injected if missing
    if (parsed.providers && Array.isArray(parsed.providers)) {
      INITIAL_PROVIDERS.forEach(p => {
        if (!parsed.providers.some((ep: any) => ep.id === p.id)) {
          parsed.providers.push(p);
        }
      });
    }
    inMemoryState = parsed;
    return parsed;
  } catch (e) {
    console.error('Failed to parse persistent state, re-seeding', e);
    const initialState: SystemState = {
      accounts: DEFAULT_ACCOUNTS,
      providers: INITIAL_PROVIDERS,
      config: DEFAULT_CONFIG,
      transactions: DEFAULT_TRANSACTIONS,
      bets: DEFAULT_BETS,
      cashRequests: [],
      agentPointRequests: []
    };
    inMemoryState = initialState;
    return initialState;
  }
}

export function saveSystemState(state: SystemState) {
  inMemoryState = state;
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }
}

// Balance transfer action
export function transferCredits(
  senderId: string,
  receiverId: string,
  amount: number,
  notes: string = ''
): { success: boolean; error?: string; state?: SystemState } {
  const state = getSystemState();
  const senderIndex = state.accounts.findIndex(a => a.id === senderId);
  const receiverIndex = state.accounts.findIndex(a => a.id === receiverId);

  if (senderIndex === -1 || receiverIndex === -1) {
    return { success: false, error: 'Sender or Receiver account not found.' };
  }

  const sender = state.accounts[senderIndex];
  const receiver = state.accounts[receiverIndex];

  // Admins have unlimited virtual balance for allocation
  const isSenderAdmin = sender.role === 'ADMIN';

  if (!isSenderAdmin && sender.balance < amount) {
    return { success: false, error: `Insufficient credit balance. Available: $${sender.balance.toLocaleString()}` };
  }

  // Deduct
  if (!isSenderAdmin) {
    sender.balance -= amount;
  }
  // Add
  receiver.balance += amount;

  // Calculate hierarchical commission on Cash Deposit
  let agentShare = 0;
  let superAgentShare = 0;
  let adminShare = 0;

  if (receiver.role === 'PLAYER') {
    if (sender.role === 'AGENT') {
      const superAgent = state.accounts.find(a => a.id === sender.parentId);
      const admin = state.accounts.find(a => a.role === 'ADMIN');

      const agentPct = sender.depositCommissionRate ?? 3;
      const superAgentPct = 0; // Super Agent gets 0 when player deposits
      const adminPct = 0; // No admin fee

      agentShare = Math.round(amount * (agentPct / 100) * 100) / 100;
      superAgentShare = 0;
      adminShare = 0;

      // Credit balances with commission
      sender.balance = Math.round((sender.balance + agentShare) * 100) / 100;
      if (superAgent) {
        superAgent.balance = Math.round((superAgent.balance + superAgentShare) * 100) / 100;
      }
      if (admin) {
        admin.balance = Math.round((admin.balance + adminShare) * 100) / 100;
      }
    } else if (sender.role === 'SUPER_AGENT') {
      const admin = state.accounts.find(a => a.role === 'ADMIN');

      const superAgentPct = sender.depositCommissionRate ?? 5;
      const adminPct = 0; // No admin fee

      superAgentShare = Math.round(amount * (superAgentPct / 100) * 100) / 100;
      adminShare = 0;

      sender.balance = Math.round((sender.balance + superAgentShare) * 100) / 100;
      if (admin) {
        admin.balance = Math.round((admin.balance + adminShare) * 100) / 100;
      }
    }
  } else if (receiver.role === 'AGENT' && sender.role === 'SUPER_AGENT') {
    // Agent Deposit (requested from Super Agent) - Super Agent gets commission, no Admin fee
    const admin = state.accounts.find(a => a.role === 'ADMIN');

    const agentPct = 0;
    const superAgentPct = sender.depositCommissionRate ?? 5;
    const adminPct = 0;

    agentShare = 0;
    superAgentShare = Math.round(amount * (superAgentPct / 100) * 100) / 100;
    adminShare = 0;

    sender.balance = Math.round((sender.balance + superAgentShare) * 100) / 100;
    if (admin) {
      admin.balance = Math.round((admin.balance + adminShare) * 100) / 100;
    }
  } else if (receiver.role === 'SUPER_AGENT' && sender.role === 'ADMIN') {
    // Super Agent Deposit (requested from Admin) - Super Agent gets commission, no Admin fee
    const superAgentPct = receiver.depositCommissionRate ?? 5;
    const adminPct = 0;

    superAgentShare = Math.round(amount * (superAgentPct / 100) * 100) / 100;
    adminShare = 0;

    receiver.balance = Math.round((receiver.balance + superAgentShare) * 100) / 100;
  }

  // Record Transaction
  const newTx: Transaction = {
    id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    senderId: sender.id,
    senderName: sender.displayName,
    receiverId: receiver.id,
    receiverName: receiver.displayName,
    amount,
    timestamp: new Date().toISOString(),
    type: isSenderAdmin ? 'transfer' : (receiver.role === 'PLAYER' ? 'deposit' : 'transfer'),
    notes: notes || `${sender.role} transferred credits to ${receiver.role}`,
    agentShare: agentShare > 0 ? agentShare : undefined,
    superAgentShare: superAgentShare > 0 ? superAgentShare : undefined,
    adminShare: adminShare > 0 ? adminShare : undefined
  };

  state.transactions.unshift(newTx);
  saveSystemState(state);

  return { success: true, state };
}

// Direct Withdrawal (Pull balance back up the tree)
export function withdrawCredits(
  receiverId: string, // Account performing withdrawal (higher tier pulling from lower tier)
  senderId: string,   // Lower tier being debited
  amount: number,
  notes: string = ''
): { success: boolean; error?: string; state?: SystemState } {
  const state = getSystemState();
  const senderIndex = state.accounts.findIndex(a => a.id === senderId);
  const receiverIndex = state.accounts.findIndex(a => a.id === receiverId);

  if (senderIndex === -1 || receiverIndex === -1) {
    return { success: false, error: 'Sender or Receiver account not found.' };
  }

  const sender = state.accounts[senderIndex]; // Lower tier (e.g. Player or Agent)
  const receiver = state.accounts[receiverIndex]; // Higher tier (e.g. Agent or Super Agent)

  if (sender.balance < amount) {
    return { success: false, error: `Account has insufficient balance. Available: $${sender.balance.toLocaleString()}` };
  }

  // Deduct from lower
  sender.balance -= amount;
  // Add to higher (Admins don't strictly need their balance incremented as it is virtual, but we do it anyway for accuracy)
  if (receiver.role !== 'ADMIN') {
    receiver.balance += amount;
  }

  // Calculate hierarchical commission on Cash Withdrawal (now earning positive commission)
  let agentShare = 0;
  let superAgentShare = 0;
  let adminShare = 0;

  if (sender.role === 'PLAYER') {
    if (receiver.role === 'AGENT') {
      const superAgent = state.accounts.find(a => a.id === receiver.parentId);
      const admin = state.accounts.find(a => a.role === 'ADMIN');

      const agentPct = receiver.withdrawalCommissionRate ?? 3;
      const superAgentPct = 0; // Super Agent gets 0 when player withdraws
      const adminPct = 0; // No admin fee

      agentShare = Math.round(amount * (agentPct / 100) * 100) / 100;
      superAgentShare = 0;
      adminShare = 0;

      // Credit balances (positive commission earned)
      receiver.balance = Math.round((receiver.balance + agentShare) * 100) / 100;
      if (superAgent) {
        superAgent.balance = Math.round((superAgent.balance + superAgentShare) * 100) / 100;
      }
      if (admin) {
        admin.balance = Math.round((admin.balance + adminShare) * 100) / 100;
      }
    } else if (receiver.role === 'SUPER_AGENT') {
      const admin = state.accounts.find(a => a.role === 'ADMIN');

      const superAgentPct = receiver.withdrawalCommissionRate ?? 5;
      const adminPct = 0; // No admin fee

      superAgentShare = Math.round(amount * (superAgentPct / 100) * 100) / 100;
      adminShare = 0;

      receiver.balance = Math.round((receiver.balance + superAgentShare) * 100) / 100;
      if (admin) {
        admin.balance = Math.round((admin.balance + adminShare) * 100) / 100;
      }
    }
  } else if (sender.role === 'AGENT' && receiver.role === 'SUPER_AGENT') {
    // Agent Withdrawal (requested from Super Agent) - Super Agent gets commission, no Admin fee
    const admin = state.accounts.find(a => a.role === 'ADMIN');

    const agentPct = 0;
    const superAgentPct = receiver.withdrawalCommissionRate ?? 5;
    const adminPct = 0;

    agentShare = 0;
    superAgentShare = Math.round(amount * (superAgentPct / 100) * 100) / 100;
    adminShare = 0;

    receiver.balance = Math.round((receiver.balance + superAgentShare) * 100) / 100;
    if (admin) {
      admin.balance = Math.round((admin.balance + adminShare) * 100) / 100;
    }
  } else if (sender.role === 'SUPER_AGENT' && receiver.role === 'ADMIN') {
    // Super Agent Withdrawal (requested from Admin) - Super Agent gets commission, no Admin fee
    const superAgentPct = sender.withdrawalCommissionRate ?? 5;
    const adminPct = 0;

    superAgentShare = Math.round(amount * (superAgentPct / 100) * 100) / 100;
    adminShare = 0;

    sender.balance = Math.round((sender.balance + superAgentShare) * 100) / 100;
  }

  // Record Transaction
  const newTx: Transaction = {
    id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    senderId: sender.id,
    senderName: sender.displayName,
    receiverId: receiver.id,
    receiverName: receiver.displayName,
    amount,
    timestamp: new Date().toISOString(),
    type: sender.role === 'PLAYER' ? 'withdrawal' : 'transfer',
    notes: notes || `${receiver.displayName} withdrew credits from ${sender.displayName}`,
    agentShare: agentShare > 0 ? agentShare : undefined,
    superAgentShare: superAgentShare > 0 ? superAgentShare : undefined,
    adminShare: adminShare > 0 ? adminShare : undefined
  };

  state.transactions.unshift(newTx);
  saveSystemState(state);

  return { success: true, state };
}

// Account creation down the hierarchy
export function createAccount(
  username: string,
  displayName: string,
  role: UserRole,
  commissionRate: number,
  parentId: string,
  initialBalance: number = 0,
  phoneNumber?: string,
  cbeAccount?: string,
  password?: string,
  depositCommissionRate?: number,
  withdrawalCommissionRate?: number
): { success: boolean; error?: string; account?: Account; state?: SystemState } {
  const state = getSystemState();

  // Validate username uniqueness
  if (state.accounts.some(a => a.username.toLowerCase() === username.toLowerCase())) {
    return { success: false, error: 'Username already exists.' };
  }

  let actualParentId = parentId;
  if (role === 'PLAYER' && (!actualParentId || actualParentId === '')) {
    const fallbackAgent = state.accounts.find(a => a.role === 'AGENT' && a.status === 'active');
    if (fallbackAgent) {
      actualParentId = fallbackAgent.id;
    } else {
      return { success: false, error: 'No active Agent is currently available in the system.' };
    }
  }

  const parent = state.accounts.find(a => a.id === actualParentId);
  if (!parent) {
    return { success: false, error: 'Parent account not found.' };
  }

  // Validate Commission Rate limits
  // Agent's rate cannot exceed Super Agent's rate. Super Agent's rate cannot exceed 100.
  if (role === 'SUPER_AGENT' && commissionRate > 95) {
    return { success: false, error: 'Super Agent rate cannot exceed 95% (minimum 5% platform royalty required)' };
  }
  if (role === 'AGENT' && commissionRate >= parent.commissionRate) {
    return { success: false, error: `Agent commission rate must be strictly less than parent Super Agent's rate (${parent.commissionRate}%)` };
  }

  // Validate Deposit and Withdrawal rate limits
  const parentDepositRate = parent.depositCommissionRate ?? 5;
  const parentWithdrawalRate = parent.withdrawalCommissionRate ?? 5;

  if (role === 'SUPER_AGENT') {
    if (depositCommissionRate !== undefined && (depositCommissionRate < 0 || depositCommissionRate > 95)) {
      return { success: false, error: 'Deposit commission rate must be between 0% and 95%' };
    }
    if (withdrawalCommissionRate !== undefined && (withdrawalCommissionRate < 1 || withdrawalCommissionRate > 100)) {
      return { success: false, error: 'Withdrawal commission rate must be between 1% and 100%' };
    }
  }

  if (role === 'AGENT') {
    if (depositCommissionRate !== undefined && depositCommissionRate >= parentDepositRate) {
      return { success: false, error: `Agent deposit commission rate (${depositCommissionRate}%) must be strictly less than parent Super Agent's rate (${parentDepositRate}%)` };
    }
    if (withdrawalCommissionRate !== undefined && (withdrawalCommissionRate < 1 || withdrawalCommissionRate > 100)) {
      return { success: false, error: 'Withdrawal commission rate must be between 1% and 100%' };
    }
    if (withdrawalCommissionRate !== undefined && withdrawalCommissionRate > parentWithdrawalRate) {
      return { success: false, error: `Agent withdrawal commission rate (${withdrawalCommissionRate}%) must not exceed parent Super Agent's rate (${parentWithdrawalRate}%)` };
    }
  }

  // For Agents and Players, parent check
  if (role === 'AGENT' && parent.role !== 'SUPER_AGENT') {
    return { success: false, error: 'Agents must be created under a Super Agent parent.' };
  }
  if (role === 'PLAYER' && parent.role !== 'AGENT') {
    return { success: false, error: 'Players must be registered under an Agent parent.' };
  }

  // If there is an initial balance, check parent balance
  if (initialBalance > 0 && parent.role !== 'ADMIN' && parent.balance < initialBalance) {
    return { success: false, error: `Parent has insufficient credit balance to allocate $${initialBalance.toLocaleString()}` };
  }

  let accountId = `${role.toLowerCase()}-${Date.now()}`;
  if (role === 'PLAYER') {
    let isUnique = false;
    let tempId = '';
    let attempts = 0;
    while (!isUnique && attempts < 100) {
      tempId = Math.floor(10000000 + Math.random() * 90000000).toString();
      if (!state.accounts.some(a => a.id === tempId)) {
        isUnique = true;
      }
      attempts++;
    }
    accountId = tempId;
  }

  let finalDepositRate = 0;
  let finalWithdrawalRate = 0;

  if (role === 'SUPER_AGENT') {
    finalDepositRate = depositCommissionRate !== undefined ? depositCommissionRate : 5;
    finalWithdrawalRate = withdrawalCommissionRate !== undefined ? withdrawalCommissionRate : 5;
  } else if (role === 'AGENT') {
    finalDepositRate = depositCommissionRate !== undefined ? depositCommissionRate : 3;
    finalWithdrawalRate = withdrawalCommissionRate !== undefined ? withdrawalCommissionRate : 3;
  }

  const newAccount: Account = {
    id: accountId,
    username: username.toLowerCase(),
    password: password || 'password',
    role,
    displayName: displayName || username,
    balance: 0, // start at 0, then we will do a transaction
    parentId: actualParentId,
    commissionRate: role === 'PLAYER' ? 0 : commissionRate,
    depositCommissionRate: role === 'PLAYER' ? 0 : finalDepositRate,
    withdrawalCommissionRate: role === 'PLAYER' ? 0 : finalWithdrawalRate,
    createdAt: new Date().toISOString(),
    status: 'active',
    phoneNumber,
    cbeAccount
  };

  state.accounts.push(newAccount);
  saveSystemState(state);
  
  let updatedState = state;
  // If there's an initial balance, execute a transfer transaction
  if (initialBalance > 0) {
    const transferResult = transferCredits(parentId, newAccount.id, initialBalance, `Initial balance setup on account creation`);
    if (transferResult.state) {
      updatedState = transferResult.state;
    }
  }

  return { success: true, account: newAccount, state: updatedState };
}

// User login validator helper
export function loginUser(
  username: string,
  password?: string
): { success: boolean; error?: string; account?: Account } {
  const state = getSystemState();
  const account = state.accounts.find(a => a.username.toLowerCase() === username.trim().toLowerCase());
  
  if (!account) {
    return { success: false, error: 'Account not found.' };
  }
  
  if (account.status === 'suspended') {
    return { success: false, error: 'This account has been suspended. Please contact system support.' };
  }
  
  const savedPassword = account.password || 'password';
  if (savedPassword !== password) {
    return { success: false, error: 'Invalid password.' };
  }
  
  return { success: true, account };
}

export function changeUserPassword(
  accountId: string,
  newPassword: string
): { success: boolean; error?: string; state?: SystemState } {
  const state = getSystemState();
  const accIndex = state.accounts.findIndex(a => a.id === accountId);
  if (accIndex === -1) {
    return { success: false, error: 'Account not found.' };
  }
  state.accounts[accIndex].password = newPassword.trim();
  saveSystemState(state);
  return { success: true, state: state };
}

// Function to update/manage accounts on the fly
export function updateAccountDetails(
  accountId: string,
  updates: {
    displayName?: string;
    commissionRate?: number;
    depositCommissionRate?: number;
    withdrawalCommissionRate?: number;
    phoneNumber?: string;
    cbeAccount?: string;
    status?: 'active' | 'suspended';
  },
  callerId?: string
): { success: boolean; error?: string; state?: SystemState } {
  const state = getSystemState();

  if (callerId) {
    const caller = state.accounts.find(a => a.id === callerId);
    if (caller && (caller.role === 'AGENT' || caller.role === 'SUPER_AGENT')) {
      return { success: false, error: 'Agents and Super Agents do not have permission to change the account of any user.' };
    }
  }

  const accountIndex = state.accounts.findIndex(a => a.id === accountId);
  if (accountIndex === -1) {
    return { success: false, error: 'Account not found.' };
  }

  const account = state.accounts[accountIndex];
  
  // Validate Commission Rate limits if being updated
  if (updates.commissionRate !== undefined) {
    if (account.role === 'SUPER_AGENT') {
      if (updates.commissionRate > 95) {
        return { success: false, error: 'Super Agent rate cannot exceed 95% (minimum 5% platform royalty required)' };
      }
      // Also ensure that all children Agents' commission rates are strictly less than the new rate
      const childrenAgents = state.accounts.filter(a => a.parentId === account.id && a.role === 'AGENT');
      for (const agent of childrenAgents) {
        if (agent.commissionRate >= updates.commissionRate) {
          return { success: false, error: `Cannot set Super Agent rate to ${updates.commissionRate}%. Sub-agent '${agent.displayName}' has a rate of ${agent.commissionRate}%. Lower that agent's rate first.` };
        }
      }
    } else if (account.role === 'AGENT') {
      const parent = state.accounts.find(a => a.id === account.parentId);
      if (parent && updates.commissionRate >= parent.commissionRate) {
        return { success: false, error: `Agent commission rate must be strictly less than parent Super Agent's rate (${parent.commissionRate}%)` };
      }
    }
    account.commissionRate = updates.commissionRate;
  }

  // Validate Deposit Commission Rate limits if being updated
  if (updates.depositCommissionRate !== undefined) {
    if (account.role === 'SUPER_AGENT') {
      if (updates.depositCommissionRate < 0 || updates.depositCommissionRate > 95) {
        return { success: false, error: 'Super Agent deposit rate must be between 0% and 95%' };
      }
      const childrenAgents = state.accounts.filter(a => a.parentId === account.id && a.role === 'AGENT');
      for (const agent of childrenAgents) {
        const agentDepRate = agent.depositCommissionRate ?? 3;
        if (agentDepRate >= updates.depositCommissionRate) {
          return { success: false, error: `Cannot set Super Agent deposit rate to ${updates.depositCommissionRate}%. Sub-agent '${agent.displayName}' has a deposit rate of ${agentDepRate}%. Lower that agent's rate first.` };
        }
      }
    } else if (account.role === 'AGENT') {
      const parent = state.accounts.find(a => a.id === account.parentId);
      const parentDepRate = parent ? (parent.depositCommissionRate ?? 5) : 5;
      if (updates.depositCommissionRate >= parentDepRate) {
        return { success: false, error: `Agent deposit rate must be strictly less than parent Super Agent's rate (${parentDepRate}%)` };
      }
    }
    account.depositCommissionRate = updates.depositCommissionRate;
  }

  // Validate Withdrawal Commission Rate limits if being updated
  if (updates.withdrawalCommissionRate !== undefined) {
    if (account.role === 'SUPER_AGENT') {
      if (updates.withdrawalCommissionRate < 1 || updates.withdrawalCommissionRate > 100) {
        return { success: false, error: 'Super Agent withdrawal rate must be between 1% and 100%' };
      }
      const childrenAgents = state.accounts.filter(a => a.parentId === account.id && a.role === 'AGENT');
      for (const agent of childrenAgents) {
        const agentWithRate = agent.withdrawalCommissionRate ?? 3;
        if (agentWithRate > updates.withdrawalCommissionRate) {
          return { success: false, error: `Cannot set Super Agent withdrawal rate to ${updates.withdrawalCommissionRate}%. Sub-agent '${agent.displayName}' has a higher withdrawal rate of ${agentWithRate}%. Lower that agent's rate first.` };
        }
      }
    } else if (account.role === 'AGENT') {
      const parent = state.accounts.find(a => a.id === account.parentId);
      const parentWithRate = parent ? (parent.withdrawalCommissionRate ?? 5) : 5;
      if (updates.withdrawalCommissionRate < 1 || updates.withdrawalCommissionRate > 100) {
        return { success: false, error: 'Agent withdrawal rate must be between 1% and 100%' };
      }
      if (updates.withdrawalCommissionRate > parentWithRate) {
        return { success: false, error: `Agent withdrawal rate (${updates.withdrawalCommissionRate}%) must not exceed parent Super Agent's rate (${parentWithRate}%)` };
      }
    }
    account.withdrawalCommissionRate = updates.withdrawalCommissionRate;
  }

  if (updates.displayName !== undefined) {
    account.displayName = updates.displayName;
  }
  if (updates.phoneNumber !== undefined) {
    account.phoneNumber = updates.phoneNumber;
  }
  if (updates.cbeAccount !== undefined) {
    account.cbeAccount = updates.cbeAccount;
  }
  if (updates.status !== undefined) {
    account.status = updates.status;
  }

  saveSystemState(state);
  return { success: true, state };
}

// Simulate a Bet from a Player and trigger hierarchical commission splits
export function processBet(
  playerId: string,
  game: Game,
  betAmount: number,
  forcedOutcome?: 'win' | 'lose'
): { success: boolean; bet?: BetLog; error?: string; state?: SystemState } {
  const state = getSystemState();
  const playerIndex = state.accounts.findIndex(a => a.id === playerId);

  if (playerIndex === -1) {
    return { success: false, error: 'Player account not found.' };
  }

  const player = state.accounts[playerIndex];

  if (player.balance < betAmount) {
    return { success: false, error: 'Insufficient balance to place bet.' };
  }

  // 1. Determine Outcome & Payout
  let outcome: 'win' | 'lose' = 'lose';
  let payoutAmount = 0;

  if (forcedOutcome) {
    outcome = forcedOutcome;
  } else {
    // Generate outcome based on Game RTP
    const random = Math.random() * 100;
    // Basic slot math: RTP is simulated. E.g., if RTP is 96%, win 40% of times with average 2.4x payout.
    if (game.category === 'Sportsbook') {
      // Sports betting: higher win chance (e.g. 48%), lower payout odds (e.g. 1.9x)
      outcome = random < 45 ? 'win' : 'lose';
    } else if (game.category === 'Crash Games') {
      // Crash games: quick high risk
      outcome = random < 42 ? 'win' : 'lose';
    } else {
      // Slots/Casino
      outcome = random < 35 ? 'win' : 'lose';
    }
  }

  if (outcome === 'win') {
    if (game.category === 'Sportsbook') {
      // Sports odds: 1.8x to 3.5x
      const multiplier = 1.8 + Math.random() * 1.5;
      payoutAmount = Math.round(betAmount * multiplier * 100) / 100;
    } else if (game.category === 'Crash Games') {
      // Crash multiplier: 1.2x to 5x
      const multiplier = 1.2 + Math.random() * 3.8;
      payoutAmount = Math.round(betAmount * multiplier * 100) / 100;
    } else {
      // Slots & Table
      const multiplier = 1.5 + Math.random() * 4.5;
      payoutAmount = Math.round(betAmount * multiplier * 100) / 100;
    }
  }

  // 2. Adjust Player Balance
  const netGGR = betAmount - payoutAmount; // Gross Gaming Revenue generated by this bet (positive is house win, negative is house loss)
  player.balance = Math.round((player.balance - betAmount + payoutAmount) * 100) / 100;

  // 3. Find full Hierarchical path to split commission
  const agent = state.accounts.find(a => a.id === player.parentId);
  if (!agent) {
    return { success: false, error: 'Direct Agent parent not found.' };
  }

  const superAgent = state.accounts.find(a => a.id === agent.parentId);
  if (!superAgent) {
    return { success: false, error: 'Super Agent parent not found.' };
  }

  const admin = state.accounts.find(a => a.role === 'ADMIN');
  if (!admin) {
    return { success: false, error: 'Global Admin account not found.' };
  }

  // Commission distribution rates
  // Agent retains: agent.commissionRate% (e.g. 70%)
  // Super Agent retains: (superAgent.commissionRate% - agent.commissionRate%) (e.g. 85% - 70% = 15%)
  // Admin retains: (100% - superAgent.commissionRate%) (e.g. 100% - 85% = 15%)
  const agentPct = agent.commissionRate / 100;
  const superAgentPct = (superAgent.commissionRate - agent.commissionRate) / 100;
  const adminPct = (100 - superAgent.commissionRate) / 100;

  const agentShare = Math.round(netGGR * agentPct * 100) / 100;
  const superAgentShare = Math.round(netGGR * superAgentPct * 100) / 100;
  const adminShare = Math.round(netGGR * adminPct * 100) / 100;

  // Update Agent accounts commissions balances
  // We apply the GGR shares to each account balance.
  // Note: GGR is positive when player loses (meaning house earned money -> positive commission credited to agent network).
  // GGR is negative when player wins (meaning house lost money -> agents must pay their share of the loss, decreasing their balance).
  // This is the core ledger accounting of multi-tier bookmaking!
  agent.balance = Math.round((agent.balance + agentShare) * 100) / 100;
  superAgent.balance = Math.round((superAgent.balance + superAgentShare) * 100) / 100;
  admin.balance = Math.round((admin.balance + adminShare) * 100) / 100;

  // Log Bet
  const newBet: BetLog = {
    id: `bet-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    playerId: player.id,
    playerName: player.displayName,
    agentId: agent.id,
    superAgentId: superAgent.id,
    gameId: game.id,
    gameTitle: game.title,
    providerName: game.providerName,
    betAmount,
    payoutAmount,
    outcome,
    timestamp: new Date().toISOString(),
    adminShare,
    superAgentShare,
    agentShare
  };

  state.bets.unshift(newBet);
  
  // Save changes
  saveSystemState(state);

  return { success: true, bet: newBet, state };
}

export function toggleProviderStatus(providerId: string): SystemState {
  const state = getSystemState();
  const provider = state.providers.find(p => p.id === providerId);
  if (provider) {
    provider.status = provider.status === 'active' ? 'disabled' : 'active';
    saveSystemState(state);
  }
  return state;
}

export function updateProviderLatency(providerId: string, latency: number): SystemState {
  const state = getSystemState();
  const provider = state.providers.find(p => p.id === providerId);
  if (provider) {
    provider.apiLatency = latency;
    saveSystemState(state);
  }
  return state;
}

export function submitCashRequest(
  playerId: string,
  amount: number,
  type: 'deposit' | 'withdrawal',
  paymentMethod: string,
  paymentDetails: string,
  notes: string = ''
): SystemState {
  const state = getSystemState();
  const player = state.accounts.find(a => a.id === playerId);
  if (!player) return state;

  if (!state.cashRequests) {
    state.cashRequests = [];
  }

  const newRequest = {
    id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    playerId: player.id,
    playerName: player.displayName,
    // Unassigned initially (available to all agents in the public pool)
    agentId: undefined,
    agentName: undefined,
    amount,
    type,
    status: 'pending' as const,
    timestamp: new Date().toISOString(),
    paymentMethod,
    paymentDetails,
    notes
  };

  state.cashRequests.unshift(newRequest);
  saveSystemState(state);
  return state;
}

export function claimCashRequest(
  requestId: string,
  agentId: string
): { success: boolean; error?: string; state: SystemState } {
  const state = getSystemState();
  if (!state.cashRequests) {
    state.cashRequests = [];
  }

  const reqIndex = state.cashRequests.findIndex(r => r.id === requestId);
  if (reqIndex === -1) {
    return { success: false, error: 'Cash request not found.', state };
  }

  const req = state.cashRequests[reqIndex];
  if (req.status !== 'pending') {
    return { success: false, error: 'This request has already been claimed or processed by another agent.', state };
  }

  const agent = state.accounts.find(a => a.id === agentId);
  if (!agent) {
    return { success: false, error: 'Claiming Agent not found.', state };
  }

  // Accept/Claim the request
  req.status = 'claimed';
  req.agentId = agent.id;
  req.agentName = agent.displayName;
  req.claimedByAgentPhone = agent.phoneNumber || 'No phone provided';
  req.claimedByAgentCbe = agent.cbeAccount || 'No CBE account provided';

  saveSystemState(state);
  return { success: true, state };
}

export function processCashRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  processorId: string
): { success: boolean; error?: string; state: SystemState } {
  const state = getSystemState();
  if (!state.cashRequests) {
    state.cashRequests = [];
  }

  const reqIndex = state.cashRequests.findIndex(r => r.id === requestId);
  if (reqIndex === -1) {
    return { success: false, error: 'Cash request not found.', state };
  }

  const req = state.cashRequests[reqIndex];
  if (req.status !== 'claimed' && req.status !== 'pending') {
    return { success: false, error: 'Request is not in a processable state.', state };
  }

  // If claimed, ensure only the claiming agent can approve/reject
  if (req.status === 'claimed' && req.agentId !== processorId) {
    return { success: false, error: `This request is claimed by another agent (${req.agentName}).`, state };
  }

  const agent = state.accounts.find(a => a.id === processorId);
  if (!agent) {
    return { success: false, error: 'Processing Agent not found.', state };
  }

  // Ensure processor information is saved on request
  req.agentId = agent.id;
  req.agentName = agent.displayName;
  req.claimedByAgentPhone = agent.phoneNumber || 'No phone provided';
  req.claimedByAgentCbe = agent.cbeAccount || 'No CBE account provided';

  if (status === 'rejected') {
    req.status = 'rejected';
    saveSystemState(state);
    return { success: true, state };
  }

  // If approved:
  if (req.type === 'deposit') {
    if (!req.paymentDetails || req.paymentDetails.trim() === '' || req.paymentDetails.trim() === '(Awaiting Transfer Reference)') {
      return { 
        success: false, 
        error: `Cannot approve deposit: The player has not submitted a valid transaction reference yet!`, 
        state 
      };
    }

    // Check for duplicate reference/paymentDetails in already processed (approved) deposit requests!
    const trimmedRef = req.paymentDetails ? req.paymentDetails.trim().toLowerCase() : '';
    if (trimmedRef && trimmedRef !== 'cash' && trimmedRef !== 'in-person cash handshake') {
      const isDuplicate = state.cashRequests.some(r => 
        r.id !== req.id &&
        r.type === 'deposit' &&
        r.status === 'approved' &&
        r.paymentDetails &&
        r.paymentDetails.trim().toLowerCase() === trimmedRef
      );
      if (isDuplicate) {
        return { 
          success: false, 
          error: `Duplicate transaction reference detected! Another approved deposit has already used the reference: "${req.paymentDetails}". Approval blocked.`, 
          state 
        };
      }
    }

    // Approve a deposit: Agent processorId transfers credits to Player req.playerId
    if (agent.balance < req.amount) {
      return { success: false, error: `Agent has insufficient credits to approve deposit. Need $${req.amount.toLocaleString()}`, state };
    }

    const result = transferCredits(processorId, req.playerId, req.amount, `Approved Deposit Request: ${req.notes || ''}`);
    if (!result.success) {
      return { success: false, error: result.error, state };
    }

    const updatedState = result.state!;
    const requestOnNewState = updatedState.cashRequests?.find(r => r.id === requestId);
    if (requestOnNewState) {
      requestOnNewState.status = 'approved';
    }
    saveSystemState(updatedState);
    return { success: true, state: updatedState };
  } else {
    // Approve a withdrawal: Agent processorId pulls credits from Player req.playerId
    const result = withdrawCredits(processorId, req.playerId, req.amount, `Approved Withdrawal Request: ${req.notes || ''}`);
    if (!result.success) {
      return { success: false, error: result.error, state };
    }

    const updatedState = result.state!;
    const requestOnNewState = updatedState.cashRequests?.find(r => r.id === requestId);
    if (requestOnNewState) {
      requestOnNewState.status = 'approved';
    }
    saveSystemState(updatedState);
    return { success: true, state: updatedState };
  }
}

export function updatePlayerPaymentDetails(
  requestId: string,
  paymentDetails: string,
  playerId: string
): { success: boolean; error?: string; state: SystemState } {
  const state = getSystemState();
  if (!state.cashRequests) {
    state.cashRequests = [];
  }

  const req = state.cashRequests.find(r => r.id === requestId);
  if (!req) {
    return { success: false, error: 'Request not found.', state };
  }

  if (req.playerId !== playerId) {
    return { success: false, error: 'Unauthorized.', state };
  }

  // Ensure it's claimed or pending (claimed is better, but allow updating)
  req.paymentDetails = paymentDetails;
  saveSystemState(state);
  return { success: true, state };
}

export function submitAgentPointRequest(
  senderId: string,
  amount: number,
  type: 'deposit' | 'withdrawal',
  notes: string = '',
  referenceNumber?: string
): { success: boolean; error?: string; state: SystemState } {
  const state = getSystemState();
  if (!state.agentPointRequests) {
    state.agentPointRequests = [];
  }

  const sender = state.accounts.find(a => a.id === senderId);
  if (!sender) {
    return { success: false, error: 'Sender account not found.', state };
  }

  if (sender.role !== 'AGENT' && sender.role !== 'SUPER_AGENT') {
    return { success: false, error: 'Only Agents and Super Agents can submit point requests.', state };
  }

  // Find parent account
  let parent = state.accounts.find(a => a.id === sender.parentId);
  if (!parent && sender.role === 'SUPER_AGENT') {
    parent = state.accounts.find(a => a.role === 'ADMIN');
  }

  if (!parent) {
    return { success: false, error: 'Parent account (approver) not found.', state };
  }

  if (type === 'withdrawal' && sender.balance < amount) {
    return { success: false, error: `Insufficient balance to request withdrawal. You only have $${sender.balance.toLocaleString()}.`, state };
  }

  if (type === 'deposit') {
    if (!referenceNumber || !referenceNumber.trim()) {
      return { success: false, error: 'Reference number is required for deposit point requests.', state };
    }
    const trimmedRef = referenceNumber.trim().toLowerCase();
    
    // Check in existing agent point requests
    const isPtDup = state.agentPointRequests.some(r => r.referenceNumber && r.referenceNumber.trim().toLowerCase() === trimmedRef);
    if (isPtDup) {
      return { success: false, error: `Duplicate reference number detected! This reference "${referenceNumber}" has already been used.`, state };
    }

    // Check in player cash requests
    if (state.cashRequests) {
      const isCashDup = state.cashRequests.some(r => r.paymentDetails && r.paymentDetails.trim().toLowerCase() === trimmedRef);
      if (isCashDup) {
        return { success: false, error: `Duplicate reference number detected! This reference "${referenceNumber}" has already been used in player cash requests.`, state };
      }
    }
  }

  const newRequest: AgentPointRequest = {
    id: `pt-req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    senderId: sender.id,
    senderName: sender.displayName,
    senderRole: sender.role as 'AGENT' | 'SUPER_AGENT',
    receiverId: parent.id,
    receiverName: parent.displayName,
    amount,
    type,
    status: 'pending',
    timestamp: new Date().toISOString(),
    notes,
    referenceNumber: type === 'deposit' ? referenceNumber?.trim() : undefined
  };

  state.agentPointRequests.unshift(newRequest);
  saveSystemState(state);
  return { success: true, state };
}

export function processAgentPointRequest(
  requestId: string,
  status: 'approved' | 'rejected',
  processorId: string
): { success: boolean; error?: string; state: SystemState } {
  const state = getSystemState();
  if (!state.agentPointRequests) {
    state.agentPointRequests = [];
  }

  const reqIndex = state.agentPointRequests.findIndex(r => r.id === requestId);
  if (reqIndex === -1) {
    return { success: false, error: 'Point request not found.', state };
  }

  const req = state.agentPointRequests[reqIndex];
  if (req.status !== 'pending') {
    return { success: false, error: 'This request has already been processed.', state };
  }

  if (req.receiverId !== processorId) {
    return { success: false, error: 'Unauthorized to process this request.', state };
  }

  if (status === 'rejected') {
    req.status = 'rejected';
    req.processedTimestamp = new Date().toISOString();
    saveSystemState(state);
    return { success: true, state };
  }

  // Approved
  if (req.type === 'deposit') {
    const result = transferCredits(processorId, req.senderId, req.amount, `Approved Point Deposit Request: ${req.notes || ''}`);
    if (!result.success) {
      return { success: false, error: result.error, state };
    }
    const updatedState = result.state!;
    const reqOnNewState = updatedState.agentPointRequests?.find(r => r.id === requestId);
    if (reqOnNewState) {
      reqOnNewState.status = 'approved';
      reqOnNewState.processedTimestamp = new Date().toISOString();
    }
    saveSystemState(updatedState);
    return { success: true, state: updatedState };
  } else {
    const result = withdrawCredits(processorId, req.senderId, req.amount, `Approved Point Withdrawal Request: ${req.notes || ''}`);
    if (!result.success) {
      return { success: false, error: result.error, state };
    }
    const updatedState = result.state!;
    const reqOnNewState = updatedState.agentPointRequests?.find(r => r.id === requestId);
    if (reqOnNewState) {
      reqOnNewState.status = 'approved';
      reqOnNewState.processedTimestamp = new Date().toISOString();
    }
    saveSystemState(updatedState);
    return { success: true, state: updatedState };
  }
}

export function sendChatMessage(
  msg: Omit<ChatMessage, 'id' | 'timestamp'>
): { success: boolean; message: ChatMessage; state: SystemState } {
  const state = getSystemState();
  if (!state.chatMessages) {
    state.chatMessages = [];
  }

  const newMessage: ChatMessage = {
    ...msg,
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    read: false
  };

  state.chatMessages.push(newMessage);
  saveSystemState(state);
  return { success: true, message: newMessage, state };
}

export function markChatAsRead(
  conversationId: string,
  userId: string
): SystemState {
  const state = getSystemState();
  if (!state.chatMessages) return state;

  let updated = false;
  state.chatMessages.forEach(msg => {
    if (msg.conversationId === conversationId && msg.senderId !== userId && !msg.read) {
      msg.read = true;
      updated = true;
    }
  });

  if (updated) {
    saveSystemState(state);
  }
  return state;
}


