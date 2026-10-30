import React, { useState } from 'react';
import { SystemState, Account, Provider, Transaction, BetLog } from '../types';
import { transferCredits, createAccount, toggleProviderStatus, updateProviderLatency, withdrawCredits, updateAccountDetails, processAgentPointRequest } from '../utils/db';
import SearchableSelect from './SearchableSelect';
import SoftSwissIntegrationPanel from './SoftSwissIntegrationPanel';
import { 
  Server, Key, RefreshCw, Layers, Plus, DollarSign, 
  ArrowUpRight, Users, Activity, HelpCircle, Check, AlertTriangle, Play,
  Clock, X, CreditCard, Copy, ExternalLink, ShieldCheck, Terminal, Send, CheckCircle2, FileText, Zap, Globe
} from 'lucide-react';

interface AdminDashboardProps {
  state: SystemState;
  onStateUpdate: (newState: SystemState) => void;
}

export default function AdminDashboard({ state, onStateUpdate }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'providers' | 'softswiss' | 'agents' | 'transactions' | 'requests' | 'point-requests'>('overview');
  
  // SoftSwiss Integration State
  const [copiedStageUrl, setCopiedStageUrl] = useState(false);
  const [copiedProdUrl, setCopiedProdUrl] = useState(false);
  const [copiedEmailReply, setCopiedEmailReply] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<any | null>(null);
  const [testError, setTestError] = useState('');
  const [selectedPlayerForTest, setSelectedPlayerForTest] = useState('player-1');
  const [customTestAmount, setCustomTestAmount] = useState('25.123456');
  
  // Downstream Agent Point Requests processing state
  const [processPointReqError, setProcessPointReqError] = useState('');
  const [processPointReqSuccess, setProcessPointReqSuccess] = useState('');
  
  // State for forms
  const [newSaUsername, setNewSaUsername] = useState('');
  const [newSaDisplayName, setNewSaDisplayName] = useState('');
  const [newSaPassword, setNewSaPassword] = useState('');
  const [newSaCommRate, setNewSaCommRate] = useState(85);
  const [newSaDepositCommRate, setNewSaDepositCommRate] = useState(5);
  const [newSaWithdrawalCommRate, setNewSaWithdrawalCommRate] = useState(5);
  const [newSaInitialCredits, setNewSaInitialCredits] = useState(100000);
  const [newSaPhoneNumber, setNewSaPhoneNumber] = useState('');
  const [newSaCbeAccount, setNewSaCbeAccount] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // State for editing accounts
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editCommRate, setEditCommRate] = useState(0);
  const [editDepositCommRate, setEditDepositCommRate] = useState(0);
  const [editWithdrawalCommRate, setEditWithdrawalCommRate] = useState(0);
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editCbeAccount, setEditCbeAccount] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // State for credit transfers
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferAmount, setTransferAmount] = useState(10000);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');

  // State for withdrawing credits
  const [withdrawSourceId, setWithdrawSourceId] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState(10000);
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');

  // State for simulated API configurations
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [pingsSimulating, setPingsSimulating] = useState<string | null>(null);

  const adminAccount = state.accounts.find(a => a.role === 'ADMIN')!;
  const superAgents = state.accounts.filter(a => a.role === 'SUPER_AGENT');
  const agents = state.accounts.filter(a => a.role === 'AGENT');
  const players = state.accounts.filter(a => a.role === 'PLAYER');

  // Platform Metrics calculations
  const totalGGR = state.bets.reduce((sum, b) => sum + (b.betAmount - b.payoutAmount), 0);
  const betRoyalties = state.bets.reduce((sum, b) => sum + b.adminShare, 0);
  const depositRoyalties = state.transactions
    .filter(tx => tx.type === 'deposit')
    .reduce((sum, tx) => sum + (tx.adminShare || 0), 0);
  const withdrawRoyalties = state.transactions
    .filter(tx => tx.type === 'withdrawal')
    .reduce((sum, tx) => sum + (tx.adminShare || 0), 0);
  const cashRoyalties = depositRoyalties - withdrawRoyalties;
  const adminRoyalties = betRoyalties + cashRoyalties;
  const totalBetsVolume = state.bets.reduce((sum, b) => sum + b.betAmount, 0);
  const totalPayoutsVolume = state.bets.reduce((sum, b) => sum + b.payoutAmount, 0);

  // GGR share by category
  const categoryStats = state.bets.reduce((acc, bet) => {
    // Find category for the game
    const cat = bet.gameTitle.includes('Matchday') || bet.gameTitle.includes('Basketball') || bet.gameTitle.includes('UEFA') ? 'Sportsbook' :
                bet.gameTitle.includes('Live') || bet.gameTitle.includes('Roulette') || bet.gameTitle.includes('Blackjack') ? 'Live Casino' :
                bet.gameTitle.includes('Crash') || bet.gameTitle.includes('Mines') || bet.gameTitle.includes('Rocket') ? 'Crash Games' : 'Slots';
    
    if (!acc[cat]) acc[cat] = { volume: 0, ggr: 0, count: 0 };
    acc[cat].volume += bet.betAmount;
    acc[cat].ggr += (bet.betAmount - bet.payoutAmount);
    acc[cat].count += 1;
    return acc;
  }, {} as Record<string, { volume: number; ggr: number; count: number }>);

  // Handler: Register Super Agent
  const handleCreateSuperAgent = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (!newSaUsername || !newSaDisplayName) {
      setCreateError('Please fill out all fields.');
      return;
    }

    const result = createAccount(
      newSaUsername,
      newSaDisplayName,
      'SUPER_AGENT',
      newSaCommRate,
      adminAccount.id,
      newSaInitialCredits,
      newSaPhoneNumber,
      newSaCbeAccount,
      newSaPassword.trim() || undefined,
      newSaDepositCommRate,
      newSaWithdrawalCommRate
    );

    if (result.success && result.state) {
      onStateUpdate(result.state);
      setCreateSuccess(`Super Agent '${newSaDisplayName}' created successfully with $${newSaInitialCredits.toLocaleString()} allocated credits!`);
      setNewSaUsername('');
      setNewSaDisplayName('');
      setNewSaPassword('');
      setNewSaCommRate(85);
      setNewSaDepositCommRate(5);
      setNewSaWithdrawalCommRate(5);
      setNewSaInitialCredits(100000);
      setNewSaPhoneNumber('');
      setNewSaCbeAccount('');
    } else {
      setCreateError(result.error || 'Failed to create Super Agent.');
    }
  };

  const startEditing = (acc: Account) => {
    setEditingAccountId(acc.id);
    setEditDisplayName(acc.displayName);
    setEditCommRate(acc.commissionRate);
    setEditDepositCommRate(acc.depositCommissionRate ?? 5);
    setEditWithdrawalCommRate(acc.withdrawalCommissionRate ?? 5);
    setEditPhoneNumber(acc.phoneNumber || '');
    setEditCbeAccount(acc.cbeAccount || '');
    setEditStatus(acc.status);
    setEditError('');
    setEditSuccess('');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccountId) return;
    setEditError('');
    setEditSuccess('');

    const result = updateAccountDetails(editingAccountId, {
      displayName: editDisplayName,
      commissionRate: editCommRate,
      depositCommissionRate: editDepositCommRate,
      withdrawalCommissionRate: editWithdrawalCommRate,
      phoneNumber: editPhoneNumber,
      cbeAccount: editCbeAccount,
      status: editStatus
    });

    if (result.success && result.state) {
      onStateUpdate(result.state);
      setEditSuccess('Account details updated successfully!');
      setTimeout(() => {
        setEditingAccountId(null);
      }, 1000);
    } else {
      setEditError(result.error || 'Failed to update account.');
    }
  };

  // Handler: Allocate Credits to Super Agent
  const handleTransferCredits = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess('');

    if (!transferTargetId || transferAmount <= 0) {
      setTransferError('Please select a Super Agent and specify an amount.');
      return;
    }

    const result = transferCredits(adminAccount.id, transferTargetId, transferAmount, transferNotes || 'Additional credit reload by master administrator.');

    if (result.success && result.state) {
      onStateUpdate(result.state);
      setTransferSuccess(`Successfully transferred $${transferAmount.toLocaleString()} to Super Agent.`);
      setTransferAmount(10000);
      setTransferNotes('');
    } else {
      setTransferError(result.error || 'Failed to allocate credits.');
    }
  };

  // Handler: Withdraw Credits from Super Agent
  const handleWithdrawCredits = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');

    if (!withdrawSourceId || withdrawAmount <= 0) {
      setWithdrawError('Please select a Super Agent and specify an amount to withdraw.');
      return;
    }

    const result = withdrawCredits(adminAccount.id, withdrawSourceId, withdrawAmount, withdrawNotes || 'Admin cash-out clawback transfer.');

    if (result.success && result.state) {
      onStateUpdate(result.state);
      setWithdrawSuccess(`Successfully withdrew $${withdrawAmount.toLocaleString()} credits.`);
      setWithdrawAmount(10000);
      setWithdrawNotes('');
    } else {
      setWithdrawError(result.error || 'Failed to withdraw credits.');
    }
  };

  // Handler: Simulate API Ping Latency Check
  const handleSimulatePing = (providerId: string) => {
    setPingsSimulating(providerId);
    setTimeout(() => {
      const newLatency = Math.floor(25 + Math.random() * 85);
      const newState = updateProviderLatency(providerId, newLatency);
      onStateUpdate(newState);
      setPingsSimulating(null);
    }, 800);
  };

  // Handler: Toggle Provider
  const handleToggleProvider = (providerId: string) => {
    const newState = toggleProviderStatus(providerId);
    onStateUpdate(newState);
  };

  const handleProcessAgentPointRequest = (requestId: string, status: 'approved' | 'rejected') => {
    setProcessPointReqError('');
    setProcessPointReqSuccess('');

    const result = processAgentPointRequest(requestId, status, adminAccount.id);
    if (result.success && result.state) {
      onStateUpdate(result.state);
      setProcessPointReqSuccess(`Super Agent point request successfully ${status}!`);
    } else {
      setProcessPointReqError(result.error || `Failed to ${status} request.`);
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="text-xs font-mono text-red-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              Admin Master Control Suite
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
              Global Platform Ledger & Gateway API
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Configure unified slot & sportsbook aggregations, inspect override commission distributions, and dispatch network credit payloads.
            </p>
          </div>

          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg flex-wrap gap-1">
            {(['overview', 'providers', 'softswiss', 'agents', 'transactions', 'requests', 'point-requests'] as const).map((tab) => {
              const pendingRequestsCount = (state.cashRequests || []).filter(r => r.status === 'pending').length;
              const pendingPointCount = (state.agentPointRequests || []).filter(r => r.receiverId === adminAccount.id && r.status === 'pending').length;
              const isSoftSwiss = tab === 'softswiss';
              const showBadge = (tab === 'requests' && pendingRequestsCount > 0) || (tab === 'point-requests' && pendingPointCount > 0) || isSoftSwiss;
              const badgeCount = tab === 'requests' ? pendingRequestsCount : tab === 'point-requests' ? pendingPointCount : 'API 2.0';
              const label = tab === 'point-requests' ? 'Point Requests' : tab === 'softswiss' ? 'SoftSwiss (S7S)' : tab;

              return (
                <button
                  key={tab}
                  id={`admin-tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-bold rounded-md capitalize transition-all flex items-center gap-1.5 relative cursor-pointer ${
                    activeTab === tab 
                      ? isSoftSwiss 
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                        : 'bg-red-500/15 text-red-400 border border-red-500/20' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="whitespace-nowrap">{label}</span>
                  {showBadge && (
                    <span className={`font-mono text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                      isSoftSwiss 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                        : 'bg-red-500 text-white animate-pulse'
                    }`}>
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Core Stats Bento Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>SYSTEM VOLUME (BET)</span>
                  <Activity size={16} className="text-red-500" />
                </div>
                <div className="text-2xl font-black font-mono tracking-tight text-white">
                  ${totalBetsVolume.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Total rolling betting turnover processed by game aggregators.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>TOTAL PLAYER GGR</span>
                  <DollarSign size={16} className="text-amber-500" />
                </div>
                <div className={`text-2xl font-black font-mono tracking-tight ${totalGGR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${totalGGR.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Gross Gaming Revenue (Bet - Payout). Positive represents platform/house profit.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>ADMIN ROYALTIES (15-20%)</span>
                  <ArrowUpRight size={16} className="text-cyan-500" />
                </div>
                <div className="text-2xl font-black font-mono tracking-tight text-cyan-400">
                  ${adminRoyalties.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-500 font-mono space-y-0.5 border-t border-slate-800/60 pt-1.5 mt-1.5">
                  <div className="flex justify-between">
                    <span>Betting GGR Royalties:</span>
                    <span className="text-slate-300 font-semibold">${betRoyalties.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Deposit Royalties:</span>
                    <span className="text-emerald-400 font-semibold">+${depositRoyalties.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Withdraw Royalties:</span>
                    <span className="text-rose-400 font-semibold">-${withdrawRoyalties.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1">
                  Remaining GGR royalties and cash transaction shares kept by system master.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>NETWORK SIZE</span>
                  <Users size={16} className="text-indigo-500" />
                </div>
                <div className="text-2xl font-black tracking-tight text-white flex items-baseline gap-1.5">
                  {superAgents.length} <span className="text-xs font-normal text-slate-500">Super</span> • {agents.length} <span className="text-xs font-normal text-slate-500">Ag</span> • {players.length} <span className="text-xs font-normal text-slate-500">Players</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Hierarchical account tiers operating on the unified credit book.
                </p>
              </div>
            </div>

            {/* Middle Row: Network Commission Splits Graph & Quick Aggregator Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Aggregator API Config Sandbox */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-5 space-y-4 lg:col-span-1">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Server size={18} className="text-red-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    Aggregator Node Sandbox
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Aggregator Endpoint URL</label>
                    <div className="bg-slate-950 p-2 rounded text-xs font-mono text-slate-300 border border-slate-800 break-all select-all">
                      {state.config.apiEndpoint}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Single API Secret Token</label>
                    <div className="flex gap-1.5">
                      <div className="bg-slate-950 p-2 rounded text-xs font-mono text-slate-400 border border-slate-800 flex-1 flex justify-between items-center overflow-hidden">
                        <span className="truncate">
                          {apiKeyVisible ? state.config.apiKey : '•••••••••••••••••••••••••••••••••'}
                        </span>
                        <button
                          onClick={() => setApiKeyVisible(!apiKeyVisible)}
                          className="text-[10px] text-cyan-400 hover:underline cursor-pointer ml-2"
                        >
                          {apiKeyVisible ? 'Hide' : 'Reveal'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Secure Transfer Webhook</label>
                    <div className="bg-slate-950 p-2 rounded text-xs font-mono text-slate-400 border border-slate-800 truncate select-all">
                      {state.config.secureWebhook}
                    </div>
                  </div>

                  {/* Settings toggles */}
                  <div className="pt-2 space-y-2 border-t border-slate-800/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Unified Wallet System</span>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold">
                        SEAMLESS WALLET
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Master Royalty Target</span>
                      <span className="font-mono font-bold text-slate-200">
                        15% - 20% Royalty
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* GGR by Category Visualizer */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 lg:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-cyan-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                      Unified GGR by Vertical
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">REALTIME ROUTED DATA</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category lists with beautiful custom gauge bars */}
                  <div className="space-y-3">
                    {(['Slots', 'Live Casino', 'Sportsbook', 'Crash Games'] as const).map((cat) => {
                      const stats = categoryStats[cat] || { volume: 0, ggr: 0, count: 0 };
                      // calculate ratio of total bets volume
                      const maxVol = totalBetsVolume || 1;
                      const percentage = Math.min(100, Math.round((stats.volume / maxVol) * 100));

                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-300">{cat}</span>
                            <span className="font-mono text-slate-400">
                              {stats.count} bets • <span className="font-bold text-slate-200">${stats.volume.toLocaleString()}</span>
                            </span>
                          </div>
                          {/* Custom visual progress bar */}
                          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                cat === 'Slots' ? 'bg-fuchsia-500' :
                                cat === 'Live Casino' ? 'bg-red-500' :
                                cat === 'Sportsbook' ? 'bg-cyan-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Micro GGR Area Map Simulated via responsive SVG */}
                  <div className="bg-slate-950 rounded-xl border border-slate-800/60 p-4 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-slate-500">Net Operator Earnings GGR</h4>
                      <p className="text-lg font-mono font-bold text-emerald-400">
                        ${totalGGR.toLocaleString()} GGR
                      </p>
                      <p className="text-[9px] text-slate-400 leading-tight">
                        Aggregator turnover minus total payout claims. System margins currently optimized.
                      </p>
                    </div>

                    {/* Compact SVG Line Graph representation */}
                    <div className="h-20 w-full mt-2 relative">
                      <svg className="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="ggrGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {/* Shaded Area */}
                        <path 
                          d="M0 50 Q25 40 50 48 T100 25 T150 15 T200 10 L200 60 L0 60 Z" 
                          fill="url(#ggrGrad)" 
                        />
                        {/* Line */}
                        <path 
                          d="M0 50 Q25 40 50 48 T100 25 T150 15 T200 10" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="2" 
                          strokeLinecap="round"
                        />
                        {/* Zero Line */}
                        <line x1="0" y1="45" x2="200" y2="45" stroke="#334155" strokeWidth="1" strokeDasharray="3,3" />
                      </svg>
                      <span className="absolute bottom-1 right-2 text-[8px] font-mono text-slate-500">Turnover timeline</span>
                      <span className="absolute top-1 left-2 text-[8px] font-mono text-emerald-500 font-bold">+Profit Limit</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Quick list of Super Agents & Transactions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Super Agents List */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers size={18} className="text-amber-500" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                      Super Agent Franchise Network ({superAgents.length})
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">DIRECT DOWNLINES</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                        <th className="py-2">Super Agent</th>
                        <th className="py-2 text-right">Deposit Comm.</th>
                        <th className="py-2 text-right">Withdrawal Comm.</th>
                        <th className="py-2 text-right">Available Credits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-xs">
                      {superAgents.map((sa) => {
                        return (
                          <tr key={sa.id} className="hover:bg-slate-900/40">
                            <td className="py-2.5 font-semibold text-slate-100 flex flex-col">
                              <span>{sa.displayName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">@{sa.username}</span>
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-emerald-400">
                              {sa.depositCommissionRate ?? 5}%
                            </td>
                            <td className="py-2.5 text-right font-mono font-bold text-amber-400">
                              {sa.withdrawalCommissionRate ?? 5}%
                            </td>
                            <td className="py-2.5 text-right font-mono text-cyan-400 font-bold">
                              ${sa.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Live Webhook / Transaction Log */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                    Latest Ledger Operations
                  </h3>
                  <span className="text-[10px] font-mono text-cyan-400">WEBHOOK STREAM</span>
                </div>

                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {state.transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/60 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                          tx.type === 'deposit' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                          tx.type === 'withdrawal' ? 'bg-red-950 text-red-400 border border-red-900' :
                          'bg-indigo-950 text-indigo-400 border border-indigo-900'
                        }`}>
                          {tx.type.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(tx.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-slate-300">
                        <strong className="text-slate-100">{tx.senderName}</strong> GGR Transfer to <strong className="text-slate-100">{tx.receiverName}</strong>
                      </div>
                      <div className="flex items-baseline justify-between pt-0.5 border-t border-slate-900 mt-1">
                        <span className="text-[10px] italic text-slate-500">{tx.notes}</span>
                        <span className="font-mono font-bold text-cyan-400">${tx.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'providers' && (
          <div className="space-y-6">
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Server size={18} className="text-red-400" />
                  <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                    Aggregated Providers Single-API Gateway Router
                  </h3>
                </div>
                <div className="text-[11px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">
                  Single integration active
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {state.providers.map((p) => (
                  <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 relative overflow-hidden">
                    {p.status === 'disabled' && (
                      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-[1px] flex flex-col items-center justify-center z-10 gap-2.5">
                        <div className="bg-red-950/80 text-red-400 px-3 py-1.5 rounded-lg border border-red-900/60 font-bold text-xs flex items-center gap-1">
                          <AlertTriangle size={14} /> Disabled by Admin
                        </div>
                        <button
                          onClick={() => handleToggleProvider(p.id)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-lg shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                        >
                          Enable Provider
                        </button>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-900 border border-slate-700 font-bold text-slate-200 text-xs flex items-center justify-center">
                            {p.logo}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-200">{p.name}</h4>
                            <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500">{p.category}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          p.status === 'active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                          p.status === 'maintenance' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                          'bg-slate-900 text-slate-500'
                        }`}>
                          {p.status}
                        </span>
                      </div>

                      <div className="space-y-1 bg-slate-900/40 p-2.5 rounded-lg text-[11px] font-mono space-y-1 border border-slate-900">
                        <div className="flex justify-between">
                          <span className="text-slate-500">API Endpoint:</span>
                          <span className="text-slate-400 truncate max-w-[150px]">{p.apiEndpoint}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Provider Fee:</span>
                          <span className="text-slate-300 font-bold">{p.revenueShare}% royalty</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Latency Link:</span>
                          <span className={`font-bold ${
                            p.apiLatency < 50 ? 'text-emerald-400' :
                            p.apiLatency < 80 ? 'text-amber-400' : 'text-rose-400'
                          }`}>
                            {p.apiLatency} ms
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSimulatePing(p.id)}
                        disabled={pingsSimulating === p.id}
                        className="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <RefreshCw size={10} className={pingsSimulating === p.id ? 'animate-spin' : ''} />
                        Ping Latency
                      </button>
                      <button
                        onClick={() => handleToggleProvider(p.id)}
                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                          p.status === 'active' 
                            ? 'text-red-400 hover:text-red-300 bg-red-950/20 border-red-900/40 hover:border-red-800/60'
                            : 'text-emerald-400 hover:text-emerald-300 bg-emerald-950/20 border-emerald-900/40 hover:border-emerald-800/60'
                        }`}
                      >
                        {p.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'softswiss' && (
          <SoftSwissIntegrationPanel state={state} onStateUpdate={onStateUpdate} />
        )}

        {activeTab === 'agents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Super Agent Account Form */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 lg:col-span-1">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Plus size={18} className="text-red-400" />
                <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                  Provision Super Agent
                </h3>
              </div>

              {createError && (
                <div className="bg-red-950/55 border border-red-900 text-red-400 p-2.5 rounded-lg text-xs font-semibold">
                  {createError}
                </div>
              )}
              {createSuccess && (
                <div className="bg-emerald-950/55 border border-emerald-900 text-emerald-400 p-2.5 rounded-lg text-xs font-semibold">
                  {createSuccess}
                </div>
              )}

              <form onSubmit={handleCreateSuperAgent} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Username (Unique handle)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. super_vortex"
                    value={newSaUsername}
                    onChange={(e) => setNewSaUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Display Name (Agency/Group)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vortex Elite Distribution"
                    value={newSaDisplayName}
                    onChange={(e) => setNewSaDisplayName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Password (Leave blank for 'password')</label>
                  <input
                    type="password"
                    placeholder="Enter password (Optional)"
                    value={newSaPassword}
                    onChange={(e) => setNewSaPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +251912345678"
                    value={newSaPhoneNumber}
                    onChange={(e) => setNewSaPhoneNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">CBE Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 1000123456789"
                    value={newSaCbeAccount}
                    onChange={(e) => setNewSaCbeAccount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">
                    Deposit Commission Rate: <strong className="text-red-400">{newSaDepositCommRate}%</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="95"
                    step="1"
                    value={newSaDepositCommRate}
                    onChange={(e) => setNewSaDepositCommRate(Number(e.target.value))}
                    className="w-full accent-red-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>0%</span>
                    <span>95%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">
                    Withdrawal Commission Rate: <strong className="text-red-400">{newSaWithdrawalCommRate}%</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={newSaWithdrawalCommRate}
                    onChange={(e) => setNewSaWithdrawalCommRate(Number(e.target.value))}
                    className="w-full accent-red-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>1%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Initial Credit Allocation ($)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newSaInitialCredits}
                    onChange={(e) => setNewSaInitialCredits(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-red-500 font-mono"
                  />
                  <p className="text-[9px] text-slate-500 font-mono italic">Credits are deducted immediately from global registry.</p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-lg uppercase tracking-wider text-xs shadow transition-all cursor-pointer"
                >
                  Create & Fund Super Agent
                </button>
              </form>
            </div>

            {/* Credit Operations (Funding & Claws) */}
            <div className="space-y-6 lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Credit Reload Form */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <DollarSign size={18} className="text-emerald-400" />
                    <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                      Fund Super Agent Credits
                    </h3>
                  </div>

                  {transferError && <div className="bg-red-950/50 border border-red-900 text-red-400 p-2 text-xs rounded">{transferError}</div>}
                  {transferSuccess && <div className="bg-emerald-950/50 border border-emerald-900 text-emerald-400 p-2 text-xs rounded">{transferSuccess}</div>}

                  <form onSubmit={handleTransferCredits} className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Select Target Super Agent</label>
                      <SearchableSelect
                        items={superAgents}
                        value={transferTargetId}
                        onChange={setTransferTargetId}
                        placeholder="Search super agent by ID, name, or phone..."
                        labelType="Super Agent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Transfer Amount ($)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Notes</label>
                      <input
                        type="text"
                        placeholder="e.g. Credit top-up for expansion GGR"
                        value={transferNotes}
                        onChange={(e) => setTransferNotes(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                    >
                      Fund Account
                    </button>
                  </form>
                </div>

                {/* Credit Withdrawal clawback Form */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <AlertTriangle size={18} className="text-rose-400" />
                    <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                      Clawback Credits (Withdraw)
                    </h3>
                  </div>

                  {withdrawError && <div className="bg-red-950/50 border border-red-900 text-red-400 p-2 text-xs rounded">{withdrawError}</div>}
                  {withdrawSuccess && <div className="bg-emerald-950/50 border border-emerald-900 text-emerald-400 p-2 text-xs rounded">{withdrawSuccess}</div>}

                  <form onSubmit={handleWithdrawCredits} className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Select Target Super Agent</label>
                      <SearchableSelect
                        items={superAgents}
                        value={withdrawSourceId}
                        onChange={setWithdrawSourceId}
                        placeholder="Search super agent by ID, name, or phone..."
                        labelType="Super Agent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Withdrawal Amount ($)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Notes</label>
                      <input
                        type="text"
                        placeholder="e.g. Account balance rebalancing payout"
                        value={withdrawNotes}
                        onChange={(e) => setWithdrawNotes(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                    >
                      Withdraw Credits
                    </button>
                  </form>
                </div>
              </div>

              {/* Franchise Grid & Full Management Directory */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-xs uppercase font-bold text-slate-200 tracking-wider">Network Account Directory</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Manage rates, status, phone contacts, and Commercial Bank of Ethiopia (CBE) accounts.</p>
                  </div>
                  <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase">
                    Admin Registry
                  </span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                        <th className="py-2.5 pr-2">User Details</th>
                        <th className="py-2.5 px-2">Role</th>
                        <th className="py-2.5 px-2">Phone Number</th>
                        <th className="py-2.5 px-2">CBE Account</th>
                        <th className="py-2.5 px-2 text-center">Dep % / With %</th>
                        <th className="py-2.5 px-2 text-right">Balance</th>
                        <th className="py-2.5 px-2 text-center">Status</th>
                        <th className="py-2.5 pl-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {[...superAgents, ...agents, ...players].map((acc) => {
                        return (
                          <tr key={acc.id} className="hover:bg-slate-900/40">
                            <td className="py-3 pr-2 font-semibold text-slate-200">
                              <div>{acc.displayName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">@{acc.username}</div>
                            </td>
                            <td className="py-3 px-2">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                acc.role === 'SUPER_AGENT' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                acc.role === 'AGENT' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              }`}>
                                {acc.role.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-2 font-mono text-slate-300">
                              {acc.phoneNumber || <span className="text-slate-600 italic">Not set</span>}
                            </td>
                            <td className="py-3 px-2 font-mono text-slate-300">
                              {acc.cbeAccount || <span className="text-slate-600 italic">Not set</span>}
                            </td>
                            <td className="py-3 px-2 text-center text-slate-300 font-mono">
                              {acc.role === 'PLAYER' ? (
                                <span className="text-slate-600">-</span>
                              ) : (
                                <div className="text-[10px] space-y-0.5">
                                  <div className="text-emerald-400 font-bold">D: {acc.depositCommissionRate ?? 5}%</div>
                                  <div className="text-amber-400 font-bold">W: {acc.withdrawalCommissionRate ?? 5}%</div>
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right font-mono font-bold text-cyan-400">
                              ${acc.balance.toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                acc.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {acc.status}
                              </span>
                            </td>
                            <td className="py-3 pl-2 text-right">
                              <button
                                onClick={() => startEditing(acc)}
                                className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 bg-cyan-950/20 border border-cyan-900/40 hover:border-cyan-800/60 rounded cursor-pointer transition-all"
                              >
                                Edit / Manage
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Account Edit/Management Modal */}
              {editingAccountId && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                          Manage Account Registry
                        </h3>
                        <p className="text-[9px] text-slate-500 mt-0.5 font-mono">
                          ID: {editingAccountId}
                        </p>
                      </div>
                      <button 
                        onClick={() => setEditingAccountId(null)}
                        className="text-slate-400 hover:text-slate-200 text-xs font-bold font-mono px-2 py-1 hover:bg-slate-800 rounded"
                      >
                        ✕
                      </button>
                    </div>

                    {editError && (
                      <div className="bg-red-950/55 border border-red-900 text-red-400 p-2.5 rounded-lg text-xs font-semibold">
                        {editError}
                      </div>
                    )}
                    {editSuccess && (
                      <div className="bg-emerald-950/55 border border-emerald-900 text-emerald-400 p-2.5 rounded-lg text-xs font-semibold">
                        {editSuccess}
                      </div>
                    )}

                    <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block">Display Name</label>
                        <input
                          type="text"
                          required
                          value={editDisplayName}
                          onChange={(e) => setEditDisplayName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block">Phone Number</label>
                        <input
                          type="text"
                          placeholder="e.g. +251912345678"
                          value={editPhoneNumber}
                          onChange={(e) => setEditPhoneNumber(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block">CBE Account Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 1000123456789"
                          value={editCbeAccount}
                          onChange={(e) => setEditCbeAccount(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>

                      {state.accounts.find(a => a.id === editingAccountId)?.role !== 'PLAYER' && (
                        <>
                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400 block">
                              Deposit Commission Rate: <strong className="text-cyan-400">{editDepositCommRate}%</strong>
                            </label>
                            <input
                              type="range"
                              min="0"
                              max="95"
                              step="1"
                              value={editDepositCommRate}
                              onChange={(e) => setEditDepositCommRate(Number(e.target.value))}
                              className="w-full accent-cyan-500"
                            />
                            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                              <span>0%</span>
                              <span>95%</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400 block">
                              Withdrawal Commission Rate: <strong className="text-cyan-400">{editWithdrawalCommRate}%</strong>
                            </label>
                            <input
                              type="range"
                              min="1"
                              max="100"
                              step="1"
                              value={editWithdrawalCommRate}
                              onChange={(e) => setEditWithdrawalCommRate(Number(e.target.value))}
                              className="w-full accent-cyan-500"
                            />
                            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                              <span>1%</span>
                              <span>100%</span>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block">Account Status</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as 'active' | 'suspended')}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
                        >
                          <option value="active">Active</option>
                          <option value="suspended">Suspended / Frozen</option>
                        </select>
                      </div>

                      <div className="flex gap-2 pt-2 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => setEditingAccountId(null)}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white font-bold rounded-lg uppercase tracking-wider text-[10px] shadow transition-all cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Seamless Wallet Ledger Operations Webhook Logger
              </h3>
              <span className="text-[10px] text-red-400 font-mono">SECURE SIGNED ENDPOINT</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                    <th className="py-2.5">Transaction ID</th>
                    <th className="py-2.5">Sender</th>
                    <th className="py-2.5">Receiver</th>
                    <th className="py-2.5">Operation</th>
                    <th className="py-2.5">Notes</th>
                    <th className="py-2.5 text-right">Credit Payload</th>
                    <th className="py-2.5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {state.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-900/40">
                      <td className="py-3 font-mono text-[10px] text-slate-500">{tx.id}</td>
                      <td className="py-3 font-semibold text-slate-300">{tx.senderName}</td>
                      <td className="py-3 font-semibold text-slate-300">{tx.receiverName}</td>
                      <td className="py-3">
                        <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                          tx.type === 'deposit' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                          tx.type === 'withdrawal' ? 'bg-red-950 text-red-400 border border-red-900' :
                          'bg-indigo-950 text-indigo-400 border border-indigo-900'
                        }`}>
                          {tx.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 italic max-w-xs">
                        <div>{tx.notes}</div>
                        {(tx.agentShare || tx.superAgentShare || tx.adminShare) && (
                          <div className="text-[9px] text-emerald-500 font-mono flex flex-wrap items-center gap-x-2 mt-0.5">
                            <span className="text-slate-500 uppercase font-bold text-[8px]">Cash Comm:</span>
                            {tx.agentShare ? <span>Ag: ${tx.agentShare.toFixed(2)}</span> : null}
                            {tx.superAgentShare ? <span>Super: ${tx.superAgentShare.toFixed(2)}</span> : null}
                            {tx.adminShare ? <span>Admin: ${tx.adminShare.toFixed(2)}</span> : null}
                          </div>
                        )}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-cyan-400">
                        ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-500 text-[10px]">
                        {new Date(tx.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Global Cashier Audit logs
              </h3>
              <span className="text-[10px] text-red-500 font-mono">GLOBAL GATEWAY MONITOR</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 font-mono">
                    <th className="py-2.5">Player</th>
                    <th className="py-2.5">Type</th>
                    <th className="py-2.5">Processing Agent Club</th>
                    <th className="py-2.5">Amount</th>
                    <th className="py-2.5">Method</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5">Reference / Details</th>
                    <th className="py-2.5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {(!state.cashRequests || state.cashRequests.length === 0) ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 italic font-mono">
                        No cashier requests logged in the system.
                      </td>
                    </tr>
                  ) : (
                    state.cashRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-900/40">
                        <td className="py-3 font-semibold text-slate-200">
                          <div>{req.playerName}</div>
                          <span className="text-[10px] font-mono text-slate-500">ID: {req.playerId}</span>
                        </td>
                        <td className="py-3">
                          <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                            req.type === 'deposit' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                            'bg-rose-950 text-rose-400 border border-rose-900/30'
                          }`}>
                            {req.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-slate-300 font-semibold">{req.agentName}</td>
                        <td className="py-3 font-mono text-cyan-400 font-bold">${req.amount.toLocaleString()}</td>
                        <td className="py-3 text-slate-400 font-mono text-[10px]">{req.paymentMethod}</td>
                        <td className="py-3">
                          <span className={`px-1.5 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                            req.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-900/30' :
                            req.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                            'bg-rose-950 text-rose-400 border border-rose-900/30'
                          }`}>
                            {req.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400 max-w-xs" title={req.paymentDetails}>
                          <div>{req.paymentDetails || '-'}</div>
                          {(() => {
                            const playerAcc = state.accounts.find(a => a.id === req.playerId);
                            if (playerAcc && (playerAcc.phoneNumber || playerAcc.cbeAccount)) {
                              return (
                                <div className="text-[10px] text-slate-400 font-sans mt-1 pt-1 border-t border-slate-800/40 space-y-0.5">
                                  {playerAcc.phoneNumber && <div>📞 {playerAcc.phoneNumber}</div>}
                                  {playerAcc.cbeAccount && <div>💳 CBE: {playerAcc.cbeAccount}</div>}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        <td className="py-3 text-right font-mono text-slate-500 text-[10px]">
                          {new Date(req.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'point-requests' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <Clock size={16} className="text-red-500 animate-pulse" />
                  Super Agent Point Requests
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 font-sans">
                  Process points top-up or settlement requests submitted by Super Agents.
                </p>
              </div>
              <span className="text-[10px] text-red-500 font-mono font-bold uppercase">SUPER FRANCHISE CORES</span>
            </div>

            {processPointReqError && (
              <div className="bg-red-950/55 border border-red-900 text-red-400 p-3 rounded-lg text-xs font-semibold">
                {processPointReqError}
              </div>
            )}
            {processPointReqSuccess && (
              <div className="bg-emerald-950/55 border border-emerald-900 text-emerald-400 p-3 rounded-lg text-xs font-semibold">
                {processPointReqSuccess}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 font-mono">
                    <th className="py-2.5 text-slate-400">Super Agent</th>
                    <th className="py-2.5 text-slate-400">Type</th>
                    <th className="py-2.5 text-slate-400">Amount</th>
                    <th className="py-2.5 text-slate-400">Notes / Reason</th>
                    <th className="py-2.5 text-slate-400">Status</th>
                    <th className="py-2.5 text-slate-400">Date Submitted</th>
                    <th className="py-2.5 text-right text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {(!state.agentPointRequests || state.agentPointRequests.filter(r => r.receiverId === adminAccount.id).length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-500 italic font-mono">
                        No super agent point requests found.
                      </td>
                    </tr>
                  ) : (
                    state.agentPointRequests
                      .filter(r => r.receiverId === adminAccount.id)
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map((req) => {
                        const requester = state.accounts.find(a => a.id === req.senderId);
                        return (
                          <tr key={req.id} className="hover:bg-slate-900/40 text-slate-300">
                            <td className="py-3.5">
                              <div className="font-bold text-slate-200">{requester?.displayName || req.senderId}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5 space-y-0.5">
                                <div>ID: {req.senderId} • Bal: ${requester?.balance.toLocaleString()}</div>
                                {requester?.phoneNumber && <div className="text-amber-400">📞 {requester.phoneNumber}</div>}
                                {requester?.cbeAccount && <div className="text-cyan-400">💳 CBE: {requester.cbeAccount}</div>}
                              </div>
                            </td>
                            <td className="py-3.5 font-semibold">
                              <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                                req.type === 'deposit' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                                'bg-rose-950 text-rose-400 border border-rose-900/30'
                              }`}>
                                {req.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3.5 font-mono text-cyan-400 font-bold">${req.amount.toLocaleString()}</td>
                            <td className="py-3.5 text-slate-300 max-w-[200px]">
                              {req.referenceNumber && (
                                <div className="font-mono text-[10px] text-amber-400 font-bold bg-amber-500/5 border border-amber-500/10 rounded px-1.5 py-0.5 w-fit mb-1" title="Transaction Reference">
                                  Ref: {req.referenceNumber}
                                </div>
                              )}
                              <div className="text-slate-400 truncate text-[11px]" title={req.notes}>{req.notes || '-'}</div>
                            </td>
                            <td className="py-3.5 font-mono">
                              <span className={`px-1.5 py-0.5 rounded-full font-bold text-[9px] ${
                                req.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                                req.status === 'rejected' ? 'bg-rose-950 text-rose-400 border border-rose-900/30' :
                                'bg-amber-950 text-amber-400 border border-amber-900/30 animate-pulse'
                              }`}>
                                {req.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3.5 font-mono text-slate-500 text-[10px]">
                              {new Date(req.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3.5 text-right">
                              {req.status === 'pending' ? (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => handleProcessAgentPointRequest(req.id, 'approved')}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-1 px-2.5 rounded-lg text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check size={12} /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleProcessAgentPointRequest(req.id, 'rejected')}
                                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold p-1 px-2.5 rounded-lg text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <X size={12} /> Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-mono">Processed</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
