import React, { useState } from 'react';
import { SystemState, Account, Transaction, BetLog } from '../types';
import { transferCredits, createAccount, withdrawCredits, updateAccountDetails, processCashRequest, claimCashRequest, submitAgentPointRequest } from '../utils/db';
import SearchableSelect from './SearchableSelect';
import { 
  User, Users, DollarSign, Plus, ArrowDownLeft, 
  ArrowUpRight, Activity, Calendar, HelpCircle, Gamepad2,
  Check, X, Clock, CreditCard, AlertTriangle, CheckCircle2, XCircle
} from 'lucide-react';

interface AgentDashboardProps {
  state: SystemState;
  agentId: string;
  onStateUpdate: (newState: SystemState) => void;
}

export default function AgentDashboard({ state, agentId, onStateUpdate }: AgentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'bets' | 'requests' | 'point-requests'>('overview');

  // Point Requests form state
  const [pointReqAmount, setPointReqAmount] = useState<number>(1000);
  const [pointReqType, setPointReqType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [pointReqNotes, setPointReqNotes] = useState('');
  const [pointReqRefNumber, setPointReqRefNumber] = useState('');
  const [pointReqError, setPointReqError] = useState('');
  const [pointReqSuccess, setPointReqSuccess] = useState('');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Operation Modal State
  const [quickOpType, setQuickOpType] = useState<'deposit' | 'withdraw' | null>(null);
  const [quickOpPlayer, setQuickOpPlayer] = useState<Account | null>(null);
  const [quickOpAmount, setQuickOpAmount] = useState(500);
  const [quickOpNotes, setQuickOpNotes] = useState('');
  const [quickOpError, setQuickOpError] = useState('');
  const [quickOpSuccess, setQuickOpSuccess] = useState('');

  // Forms
  const [newPlUsername, setNewPlUsername] = useState('');
  const [newPlDisplayName, setNewPlDisplayName] = useState('');
  const [newPlInitialCredits, setNewPlInitialCredits] = useState(1000);
  const [newPlPhoneNumber, setNewPlPhoneNumber] = useState('');
  const [newPlCbeAccount, setNewPlCbeAccount] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // State for editing players
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editCbeAccount, setEditCbeAccount] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Cash In (fund player)
  const [cashInPlayerId, setCashInPlayerId] = useState('');
  const [cashInAmount, setCashInAmount] = useState(500);
  const [cashInNotes, setCashInNotes] = useState('');
  const [cashInError, setCashInError] = useState('');
  const [cashInSuccess, setCashInSuccess] = useState('');

  // Cash Out (withdraw player)
  const [cashOutPlayerId, setCashOutPlayerId] = useState('');
  const [cashOutAmount, setCashOutAmount] = useState(500);
  const [cashOutNotes, setCashOutNotes] = useState('');
  const [cashOutError, setCashOutError] = useState('');
  const [cashOutSuccess, setCashOutSuccess] = useState('');

  // Player Requests processing state
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState('');

  const handleProcessRequest = (requestId: string, status: 'approved' | 'rejected') => {
    setRequestError('');
    setRequestSuccess('');

    const result = processCashRequest(requestId, status, currentAg.id);
    if (result.success) {
      onStateUpdate(result.state);
      setRequestSuccess(`Request successfully ${status}!`);
    } else {
      setRequestError(result.error || `Failed to ${status} request.`);
    }
  };

  const handleClaimRequest = (requestId: string) => {
    setRequestError('');
    setRequestSuccess('');

    const result = claimCashRequest(requestId, currentAg.id);
    if (result.success) {
      onStateUpdate(result.state);
      setRequestSuccess('You successfully accepted/claimed this request! Private payment details are now unlocked below.');
    } else {
      setRequestError(result.error || 'Failed to claim request.');
    }
  };

  const handleSubmitPointRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setPointReqError('');
    setPointReqSuccess('');

    if (pointReqAmount <= 0) {
      setPointReqError('Please specify a valid amount.');
      return;
    }

    if (pointReqType === 'deposit' && !pointReqRefNumber.trim()) {
      setPointReqError('Reference number is required for deposit requests.');
      return;
    }

    const result = submitAgentPointRequest(
      currentAg.id, 
      pointReqAmount, 
      pointReqType, 
      pointReqNotes, 
      pointReqType === 'deposit' ? pointReqRefNumber.trim() : undefined
    );
    
    if (result.success && result.state) {
      onStateUpdate(result.state);
      setPointReqSuccess(`Point ${pointReqType === 'deposit' ? 'deposit' : 'withdrawal'} request for $${pointReqAmount.toLocaleString()} submitted successfully to ${parentSa.displayName}!`);
      setPointReqAmount(1000);
      setPointReqNotes('');
      setPointReqRefNumber('');
    } else {
      setPointReqError(result.error || 'Failed to submit point request.');
    }
  };

  const currentAg = state.accounts.find(a => a.id === agentId)!;
  const parentSa = state.accounts.find(a => a.id === currentAg.parentId)!;

  // Players
  const players = state.accounts.filter(a => a.parentId === currentAg.id && a.role === 'PLAYER');
  const allSystemPlayers = state.accounts.filter(a => a.role === 'PLAYER');

  // Filtered Players by Userid or Phone
  const filteredPlayers = players.filter(pl => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      pl.id.toLowerCase().includes(q) ||
      (pl.phoneNumber && pl.phoneNumber.toLowerCase().includes(q)) ||
      pl.username.toLowerCase().includes(q) ||
      pl.displayName.toLowerCase().includes(q)
    );
  });

  // Transactions list
  const filteredTxs = state.transactions.filter(
    tx => tx.senderId === currentAg.id || tx.receiverId === currentAg.id
  );

  // Filtered bets
  const filteredBets = state.bets.filter(b => b.agentId === currentAg.id);

  // Financial Metrics
  const totalBetsVolume = filteredBets.reduce((sum, b) => sum + b.betAmount, 0);
  const totalPayoutsVolume = filteredBets.reduce((sum, b) => sum + b.payoutAmount, 0);
  const totalGGR = totalBetsVolume - totalPayoutsVolume;
  
  // Agent direct commission: sum of agentShare in player bets and cash transactions
  const betCommissions = filteredBets.reduce((sum, b) => sum + b.agentShare, 0);
  const depositCommissions = state.transactions
    .filter(tx => tx.type === 'deposit' && tx.senderId === currentAg.id)
    .reduce((sum, tx) => sum + (tx.agentShare || 0), 0);
  const withdrawCommissions = state.transactions
    .filter(tx => tx.type === 'withdrawal' && tx.receiverId === currentAg.id)
    .reduce((sum, tx) => sum + (tx.agentShare || 0), 0);
  const cashCommissions = depositCommissions - withdrawCommissions;
  const agentCommissions = cashCommissions;

  // Handler: Register Player
  const handleRegisterPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (!newPlUsername || !newPlPhoneNumber) {
      setCreateError('Username and Phone Number are required fields.');
      return;
    }

    if (newPlInitialCredits > currentAg.balance) {
      setCreateError(`Insufficient credit balance. Your club has $${currentAg.balance.toLocaleString()} available.`);
      return;
    }

    const finalDisplayName = newPlDisplayName.trim() || newPlUsername.trim();

    const result = createAccount(
      newPlUsername.trim(),
      finalDisplayName,
      'PLAYER',
      0, // Players have 0 commission rate
      currentAg.id,
      newPlInitialCredits,
      newPlPhoneNumber.trim(),
      newPlCbeAccount.trim()
    );

    if (result.success && result.state && result.account) {
      onStateUpdate(result.state);
      setCreateSuccess(`Player '${finalDisplayName}' registered successfully with auto-generated ID: ${result.account.id} and funded with $${newPlInitialCredits.toLocaleString()}!`);
      setNewPlUsername('');
      setNewPlDisplayName('');
      setNewPlInitialCredits(1000);
      setNewPlPhoneNumber('');
      setNewPlCbeAccount('');
    } else {
      setCreateError(result.error || 'Failed to register player.');
    }
  };

  const startEditing = (acc: Account) => {
    setEditingAccountId(acc.id);
    setEditDisplayName(acc.displayName);
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
      commissionRate: 0, // Players always 0
      phoneNumber: editPhoneNumber,
      cbeAccount: editCbeAccount,
      status: editStatus
    }, currentAg.id);

    if (result.success && result.state) {
      onStateUpdate(result.state);
      setEditSuccess('Player details updated successfully!');
      setTimeout(() => {
        setEditingAccountId(null);
      }, 1000);
    } else {
      setEditError(result.error || 'Failed to update player.');
    }
  };

  // Handler: Cash In Player
  const handleCashIn = (e: React.FormEvent) => {
    e.preventDefault();
    setCashInError('');
    setCashInSuccess('');

    if (!cashInPlayerId || cashInAmount <= 0) {
      setCashInError('Please select a player and specify an amount.');
      return;
    }

    if (cashInAmount > currentAg.balance) {
      setCashInError(`Insufficient credits. Your club only has $${currentAg.balance.toLocaleString()} available.`);
      return;
    }

    const result = transferCredits(currentAg.id, cashInPlayerId, cashInAmount, cashInNotes || 'Player credit top-up cash-in.');

    if (result.success && result.state) {
      onStateUpdate(result.state);
      setCashInSuccess(`Successfully topped up player wallet with $${cashInAmount.toLocaleString()}!`);
      setCashInAmount(500);
      setCashInNotes('');
    } else {
      setCashInError(result.error || 'Failed to complete cash-in.');
    }
  };

  // Handler: Cash Out Player
  const handleCashOut = (e: React.FormEvent) => {
    e.preventDefault();
    setCashOutError('');
    setCashOutSuccess('');

    if (!cashOutPlayerId || cashOutAmount <= 0) {
      setCashOutError('Please select a player and specify an amount.');
      return;
    }

    const result = withdrawCredits(currentAg.id, cashOutPlayerId, cashOutAmount, cashOutNotes || 'Player balance cash-out payout.');

    if (result.success && result.state) {
      onStateUpdate(result.state);
      setCashOutSuccess(`Successfully cashed out $${cashOutAmount.toLocaleString()} from player's wallet.`);
      setCashOutAmount(500);
      setCashOutNotes('');
    } else {
      setCashOutError(result.error || 'Failed to complete cash-out.');
    }
  };

  // Quick Operations Handlers
  const handleOpenQuickOp = (player: Account, type: 'deposit' | 'withdraw') => {
    setQuickOpPlayer(player);
    setQuickOpType(type);
    setQuickOpAmount(500);
    setQuickOpNotes('');
    setQuickOpError('');
    setQuickOpSuccess('');
  };

  const handleQuickOpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickOpPlayer || !quickOpType) return;
    setQuickOpError('');
    setQuickOpSuccess('');

    if (quickOpAmount <= 0) {
      setQuickOpError('Please enter a valid amount.');
      return;
    }

    if (quickOpType === 'deposit') {
      if (quickOpAmount > currentAg.balance) {
        setQuickOpError(`Insufficient credits. Your club only has $${currentAg.balance.toLocaleString()} available.`);
        return;
      }
      const result = transferCredits(currentAg.id, quickOpPlayer.id, quickOpAmount, quickOpNotes || 'Player credit quick deposit.');
      if (result.success && result.state) {
        onStateUpdate(result.state);
        setQuickOpSuccess(`Successfully deposited $${quickOpAmount.toLocaleString()} to ${quickOpPlayer.displayName}'s wallet!`);
        setTimeout(() => {
          setQuickOpType(null);
          setQuickOpPlayer(null);
        }, 1200);
      } else {
        setQuickOpError(result.error || 'Failed to complete deposit.');
      }
    } else {
      // withdrawal
      if (quickOpAmount > quickOpPlayer.balance) {
        setQuickOpError(`Insufficient player balance. Player has $${quickOpPlayer.balance.toLocaleString()} available.`);
        return;
      }
      const result = withdrawCredits(currentAg.id, quickOpPlayer.id, quickOpAmount, quickOpNotes || 'Player quick balance withdrawal.');
      if (result.success && result.state) {
        onStateUpdate(result.state);
        setQuickOpSuccess(`Successfully withdrew $${quickOpAmount.toLocaleString()} from ${quickOpPlayer.displayName}'s wallet.`);
        setTimeout(() => {
          setQuickOpType(null);
          setQuickOpPlayer(null);
        }, 1200);
      } else {
        setQuickOpError(result.error || 'Failed to complete withdrawal.');
      }
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="text-xs font-mono text-blue-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <User size={14} />
              Local Club Agent Portal
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
              {currentAg.displayName}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Registered players: <strong className="text-blue-400">{players.length} members</strong> under <strong className="text-blue-400">{parentSa.displayName} (Super Agent)</strong> • Deposit Rate: <strong className="text-emerald-400">{currentAg.depositCommissionRate ?? 3}%</strong> • Withdrawal Rate: <strong className="text-amber-400">{currentAg.withdrawalCommissionRate ?? 3}%</strong>
            </p>
          </div>

          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg flex-wrap gap-1">
            {(['overview', 'players', 'bets', 'requests', 'point-requests'] as const).map((tab) => {
              const pendingRequestsCount = (state.cashRequests || []).filter(
                r => r.status === 'pending' || (r.agentId === currentAg.id && r.status === 'claimed')
              ).length;
              const showBadge = tab === 'requests' && pendingRequestsCount > 0;
              const label = tab === 'point-requests' ? 'Point Requests' : tab;
              return (
                <button
                  key={tab}
                  id={`ag-tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-bold rounded-md capitalize transition-all flex items-center gap-1.5 relative cursor-pointer ${
                    activeTab === tab 
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="whitespace-nowrap">{label}</span>
                  {showBadge && (
                    <span className="bg-amber-500 text-slate-950 font-mono text-[9px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>CLUB OPERATING BALANCE</span>
                  <DollarSign size={16} className="text-blue-500" />
                </div>
                <div className="text-2xl font-black font-mono tracking-tight text-white">
                  ${currentAg.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Available club treasury to allocate to player wallets and cash-out payout requests.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>NET CLUB COMMISSION</span>
                  <Activity size={16} className="text-emerald-500" />
                </div>
                <div className={`text-2xl font-black font-mono tracking-tight ${agentCommissions >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${agentCommissions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-500 font-mono space-y-0.5 border-t border-slate-800/60 pt-1.5 mt-1.5">
                  <div className="flex justify-between">
                    <span>Cash Deposit Comm:</span>
                    <span className="text-emerald-400 font-semibold">+${depositCommissions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cash Withdraw Comm:</span>
                    <span className="text-rose-400 font-semibold">-${withdrawCommissions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1">
                  Commission earned from player cash deposits and withdrawals based on defined rates.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>TOTAL PLAYER GGR</span>
                  <ArrowUpRight size={16} className="text-indigo-500" />
                </div>
                <div className={`text-2xl font-black font-mono tracking-tight ${totalGGR >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  ${totalGGR.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Gross Gaming Revenue (Total bets - Total payouts) of your club's registered base.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>REGISTERED USERS</span>
                  <Users size={16} className="text-blue-500" />
                </div>
                <div className="text-2xl font-black tracking-tight text-white">
                  {players.length} <span className="text-xs text-slate-500 font-normal">Active Accounts</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Direct bettors operating with single-API credentials under your club node.
                </p>
              </div>
            </div>

            {/* Quick stats and instructions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Instructions */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Gamepad2 size={18} className="text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Club Operator Guidelines
                  </h3>
                </div>

                <div className="space-y-3.5 text-xs text-slate-400">
                  <p className="leading-relaxed">
                    As a Club Agent, you manage direct cash-ins and cash-outs. When a player hands you physical cash, you perform a <strong className="text-emerald-400">CASH IN</strong> transfer, deducting from your operating balance and crediting the player's wallet.
                  </p>
                  <p className="leading-relaxed">
                    When players request payout on their winnings, you execute a <strong className="text-rose-400">CASH OUT</strong> from their wallet back to your club treasury, allowing you to settle up with them safely.
                  </p>
                  <div className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono text-[10px] space-y-1">
                    <span className="text-slate-500 uppercase font-bold block">Commission Splitting</span>
                    <span>Your commission rate is: <strong className="text-slate-200">{currentAg.commissionRate}%</strong></span>
                    <p className="text-[9px] text-slate-500 leading-tight pt-1">
                      This means you retain {currentAg.commissionRate}% of player GGR net losses. If player wins GGR, you absorb {currentAg.commissionRate}% of the payout claim.
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Downline Player directory */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 lg:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Direct Bettor Members Directory
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Manage player info, contact numbers, and commercial bank accounts.</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">LIVE COIN AUDIT</span>
                </div>

                {/* Real-time Search Filter Bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search players by 8-digit Player ID, username, or phone number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500 font-medium transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold font-mono text-slate-400 hover:text-slate-200 uppercase px-1.5 py-0.5 bg-slate-900 rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                        <th className="py-2.5 pr-2">Player Account</th>
                        <th className="py-2.5 px-2">Phone Number</th>
                        <th className="py-2.5 px-2">CBE Account</th>
                        <th className="py-2.5 px-2 text-right">Wallet Balance</th>
                        <th className="py-2.5 px-2 text-right">Turnover</th>
                        <th className="py-2.5 px-2 text-right">Net GGR</th>
                        <th className="py-2.5 px-2 text-center">Status</th>
                        <th className="py-2.5 pl-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {filteredPlayers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                            No matching players found.
                          </td>
                        </tr>
                      ) : (
                        filteredPlayers.map((pl) => {
                          const playerBets = state.bets.filter(b => b.playerId === pl.id);
                          const playerBetTotal = playerBets.reduce((sum, b) => sum + b.betAmount, 0);
                          const playerGgrTotal = playerBets.reduce((sum, b) => sum + (b.betAmount - b.payoutAmount), 0);
                          
                          return (
                            <tr key={pl.id} className="hover:bg-slate-900/40">
                              <td className="py-3 pr-2 font-semibold text-slate-100">
                                <div>{pl.displayName}</div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  @{pl.username} • ID: <span className="text-blue-400 font-bold">{pl.id}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2 font-mono text-slate-300">
                                {pl.phoneNumber || <span className="text-slate-600 italic">Not set</span>}
                              </td>
                              <td className="py-3 px-2 font-mono text-slate-300">
                                {pl.cbeAccount || <span className="text-slate-600 italic">Not set</span>}
                              </td>
                              <td className="py-3 px-2 text-right font-mono font-bold text-cyan-400">
                                ${pl.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3 px-2 text-right font-mono text-slate-400">
                                ${playerBetTotal.toLocaleString()}
                              </td>
                              <td className={`py-3 px-2 text-right font-mono font-bold ${playerGgrTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ${playerGgrTotal.toLocaleString()}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                  pl.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {pl.status}
                                </span>
                              </td>
                              <td className="py-3 pl-2 text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenQuickOp(pl, 'deposit')}
                                    className="px-2 py-1 text-[10px] font-bold uppercase text-emerald-400 hover:text-emerald-300 bg-emerald-950/20 border border-emerald-900/40 hover:border-emerald-800/60 rounded cursor-pointer transition-all"
                                  >
                                    Deposit
                                  </button>
                                  <button
                                    onClick={() => handleOpenQuickOp(pl, 'withdraw')}
                                    className="px-2 py-1 text-[10px] font-bold uppercase text-rose-400 hover:text-rose-300 bg-rose-950/20 border border-rose-900/40 hover:border-rose-800/60 rounded cursor-pointer transition-all"
                                  >
                                    Withdraw
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Recent Cash Ledger Operations */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Recent Cash Ledger Operations & Commissions
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">CLUB REAL-TIME AUDITING</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                      <th className="py-2.5">Type</th>
                      <th className="py-2.5">User</th>
                      <th className="py-2.5">Amount</th>
                      <th className="py-2.5">Your Commission</th>
                      <th className="py-2.5">Notes</th>
                      <th className="py-2.5 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {filteredTxs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-500 italic">
                          No cash ledger operations recorded yet.
                        </td>
                      </tr>
                    ) : (
                      filteredTxs.slice(0, 10).map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-900/40">
                          <td className="py-3 font-semibold">
                            <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                              tx.type === 'deposit' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                              tx.type === 'withdrawal' ? 'bg-rose-950 text-rose-400 border border-rose-900/30' :
                              'bg-indigo-950 text-indigo-400 border border-indigo-900/30'
                            }`}>
                              {tx.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 text-slate-200">
                            {tx.type === 'deposit' ? tx.receiverName : tx.senderName}
                          </td>
                          <td className="py-3 font-mono text-cyan-400 font-bold">${tx.amount.toLocaleString()}</td>
                          <td className={`py-3 font-mono font-semibold ${tx.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tx.agentShare ? `${tx.type === 'deposit' ? '+' : '-'}$${tx.agentShare}` : '-'}
                          </td>
                          <td className="py-3 text-slate-400 italic max-w-xs truncate">{tx.notes}</td>
                          <td className="py-3 text-right font-mono text-slate-500 text-[10px]">
                            {new Date(tx.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </>
        )}

        {activeTab === 'players' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Register player form */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 lg:col-span-1">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Plus size={18} className="text-blue-500" />
                <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                  Register Direct Player
                </h3>
              </div>

              {createError && <div className="bg-red-950/55 border border-red-900 text-red-400 p-2.5 text-xs rounded-lg font-semibold">{createError}</div>}
              {createSuccess && <div className="bg-emerald-950/55 border border-emerald-900 text-emerald-400 p-2.5 text-xs rounded-lg font-semibold">{createSuccess}</div>}

              <form onSubmit={handleRegisterPlayer} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Username (Unique handle)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. bettor_lucky"
                    value={newPlUsername}
                    onChange={(e) => setNewPlUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Display Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Peter Parker"
                    value={newPlDisplayName}
                    onChange={(e) => setNewPlDisplayName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Phone Number <span className="text-rose-500 font-bold">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +251912345678"
                    value={newPlPhoneNumber}
                    onChange={(e) => setNewPlPhoneNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">CBE Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 1000123456789"
                    value={newPlCbeAccount}
                    onChange={(e) => setNewPlCbeAccount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Initial Wallet Top-up ($)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newPlInitialCredits}
                    onChange={(e) => setNewPlInitialCredits(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 font-mono"
                  />
                  <p className="text-[9px] text-slate-500 font-mono italic">Credits are deducted immediately from your available $ {currentAg.balance.toLocaleString()}.</p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-lg uppercase tracking-wider text-xs shadow transition-all cursor-pointer"
                >
                  Create & Fund Player
                </button>
              </form>
            </div>

            {/* Cash in & cash out operations */}
            <div className="space-y-6 lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cash In */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <DollarSign size={18} className="text-emerald-400" />
                    <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                      Cash In (Load Wallet)
                    </h3>
                  </div>

                  {cashInError && <div className="bg-red-950/50 border border-red-900 text-red-400 p-2 text-xs rounded">{cashInError}</div>}
                  {cashInSuccess && <div className="bg-emerald-950/50 border border-emerald-900 text-emerald-400 p-2 text-xs rounded">{cashInSuccess}</div>}

                  <form onSubmit={handleCashIn} className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Select Player</label>
                      <SearchableSelect
                        items={allSystemPlayers}
                        value={cashInPlayerId}
                        onChange={setCashInPlayerId}
                        placeholder="Search player by ID, handle, or phone..."
                        labelType="Player"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Deposit Amount ($)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={cashInAmount}
                        onChange={(e) => setCashInAmount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Notes / Reference</label>
                      <input
                        type="text"
                        placeholder="e.g. Cash collected locally"
                        value={cashInNotes}
                        onChange={(e) => setCashInNotes(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                    >
                      Top-up Player
                    </button>
                  </form>
                </div>

                {/* Cash Out */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Plus size={18} className="text-rose-400 rotate-45" />
                    <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                      Cash Out (Withdraw Balance)
                    </h3>
                  </div>

                  {cashOutError && <div className="bg-red-950/50 border border-red-900 text-red-400 p-2 text-xs rounded">{cashOutError}</div>}
                  {cashOutSuccess && <div className="bg-emerald-950/50 border border-emerald-900 text-emerald-400 p-2 text-xs rounded">{cashOutSuccess}</div>}

                  <form onSubmit={handleCashOut} className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Select Player</label>
                      <SearchableSelect
                        items={allSystemPlayers}
                        value={cashOutPlayerId}
                        onChange={setCashOutPlayerId}
                        placeholder="Search player by ID, handle, or phone..."
                        labelType="Player"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Withdrawal Amount ($)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={cashOutAmount}
                        onChange={(e) => setCashOutAmount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Notes</label>
                      <input
                        type="text"
                        placeholder="e.g. Paid out to client physical cash"
                        value={cashOutNotes}
                        onChange={(e) => setCashOutNotes(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                    >
                      Process Payout
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bets' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs uppercase font-bold text-slate-200 tracking-wider">Club Bet Audits</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                    <th className="py-2.5">Bettor</th>
                    <th className="py-2.5">Game Title</th>
                    <th className="py-2.5">Bet</th>
                    <th className="py-2.5">Payout</th>
                    <th className="py-2.5">Outcome</th>
                    <th className="py-2.5 text-right">Your Comm Share ({currentAg.commissionRate}%)</th>
                    <th className="py-2.5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredBets.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-900/40">
                      <td className="py-3 font-semibold text-slate-200">{b.playerName}</td>
                      <td className="py-3 text-slate-300">
                        <span>{b.gameTitle}</span>
                        <span className="block text-[9px] text-slate-500 uppercase font-mono">{b.providerName}</span>
                      </td>
                      <td className="py-3 font-mono">${b.betAmount}</td>
                      <td className="py-3 font-mono">${b.payoutAmount}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.outcome === 'win' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-rose-950 text-rose-400 border border-rose-900'
                        }`}>
                          {b.outcome.toUpperCase()}
                        </span>
                      </td>
                      <td className={`py-3 text-right font-mono font-bold ${b.agentShare >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ${b.agentShare >= 0 ? '+' : ''}{b.agentShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 text-right font-mono text-slate-500 text-[10px]">
                        {new Date(b.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs uppercase font-bold text-slate-200 tracking-wider">
                  Cashier Requests Pipeline & Claims
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Accept open requests from the public pool, view player accounts upon acceptance, and complete transfers.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
                Gateway Pool Queue
              </span>
            </div>

            {requestError && (
              <div className="bg-rose-950/40 border border-rose-900/40 text-rose-400 text-xs p-2.5 rounded-lg flex items-start gap-2">
                <XCircle size={14} className="mt-0.5 shrink-0" />
                <span>{requestError}</span>
              </div>
            )}

            {requestSuccess && (
              <div className="bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 text-xs p-2.5 rounded-lg flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                <span>{requestSuccess}</span>
              </div>
            )}

            {/* SECTION 1: PUBLIC POOL (Unassigned / Pending) */}
            <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                  🌐 Available Requests Pool (Unassigned)
                </h4>
                <span className="text-[9px] font-mono text-slate-500">First-come, first-serve claiming</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 font-mono">
                      <th className="py-2 text-slate-400">Player</th>
                      <th className="py-2 text-slate-400">Type</th>
                      <th className="py-2 text-slate-400">Amount</th>
                      <th className="py-2 text-slate-400">Payment Channel</th>
                      <th className="py-2 text-slate-400">Account / Phone Details</th>
                      <th className="py-2 text-slate-400">Notes</th>
                      <th className="py-2 text-right text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {(!state.cashRequests || state.cashRequests.filter(r => r.status === 'pending').length === 0) ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-500 italic font-mono">
                          No open requests currently in the public pool.
                        </td>
                      </tr>
                    ) : (
                      state.cashRequests
                        .filter(r => r.status === 'pending')
                        .map((req) => (
                          <tr key={req.id} className="hover:bg-slate-900/30">
                            <td className="py-2.5 font-semibold text-slate-200">
                              <div>{req.playerName}</div>
                              <span className="text-[10px] font-mono text-slate-500">ID: {req.playerId}</span>
                            </td>
                            <td className="py-2.5">
                              <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                                req.type === 'deposit' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                              }`}>
                                {req.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono text-cyan-400 font-bold">${req.amount.toLocaleString()}</td>
                            <td className="py-2.5 text-slate-300 font-mono text-[10px]">{req.paymentMethod}</td>
                            <td className="py-2.5 text-slate-500 italic text-[10px]">
                              🔒 Masked (Accept claim to reveal)
                            </td>
                            <td className="py-2.5 text-slate-500 max-w-[120px] truncate" title={req.notes}>
                              {req.notes || '-'}
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() => handleClaimRequest(req.id)}
                                className="px-3 py-1 text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/20 rounded cursor-pointer transition-all inline-flex items-center gap-1"
                              >
                                ⚡ Accept & Claim
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 2: ACTIVE CLAIMS (Claimed by Me / Pending Action) */}
            <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/60">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={13} className="text-blue-400" />
                🔑 My Active Claims (Awaiting Your Transaction Transfer)
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 font-mono">
                      <th className="py-2 text-slate-400">Player</th>
                      <th className="py-2 text-slate-400">Type</th>
                      <th className="py-2 text-slate-400">Amount</th>
                      <th className="py-2 text-slate-400">Payment Channel</th>
                      <th className="py-2 text-slate-400 font-semibold text-blue-300">🔓 Unlocked Account / Phone Details</th>
                      <th className="py-2 text-slate-400">Notes</th>
                      <th className="py-2 text-right text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {(!state.cashRequests || state.cashRequests.filter(r => r.agentId === currentAg.id && r.status === 'claimed').length === 0) ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-500 italic font-mono">
                          You have no active claims. Accept requests from the pool above!
                        </td>
                      </tr>
                    ) : (
                      state.cashRequests
                        .filter(r => r.agentId === currentAg.id && r.status === 'claimed')
                        .map((req) => (
                          <tr key={req.id} className="hover:bg-slate-900/30 bg-blue-500/[0.02]">
                            <td className="py-3 font-semibold text-slate-200">
                              <div>{req.playerName}</div>
                              <span className="text-[10px] font-mono text-slate-500">ID: {req.playerId}</span>
                            </td>
                            <td className="py-3">
                              <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                                req.type === 'deposit' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                              }`}>
                                {req.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 font-mono text-cyan-400 font-bold">${req.amount.toLocaleString()}</td>
                            <td className="py-3 text-slate-300 font-mono text-[10px]">{req.paymentMethod}</td>
                            <td className="py-3 text-emerald-300 font-mono font-bold text-[11px] bg-emerald-500/5 px-2 rounded border border-emerald-500/10">
                              <div>{req.paymentDetails}</div>
                              {(() => {
                                const playerAcc = state.accounts.find(a => a.id === req.playerId);
                                if (playerAcc && (playerAcc.phoneNumber || playerAcc.cbeAccount)) {
                                  return (
                                    <div className="text-[10px] text-slate-400 font-sans mt-1 pt-1 border-t border-slate-800/40 space-y-0.5">
                                      {playerAcc.phoneNumber && <div>📞 Phone: {playerAcc.phoneNumber}</div>}
                                      {playerAcc.cbeAccount && <div>💳 CBE: {playerAcc.cbeAccount}</div>}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </td>
                            <td className="py-3 text-slate-400 max-w-[120px] truncate" title={req.notes}>
                              {req.notes || '-'}
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => handleProcessRequest(req.id, 'approved')}
                                  className="px-2 py-1 text-[10px] font-bold uppercase text-emerald-400 bg-emerald-950/20 hover:bg-emerald-500 hover:text-slate-950 border border-emerald-900/40 rounded cursor-pointer transition-all flex items-center gap-1"
                                >
                                  <Check size={11} />
                                  Approve / Complete
                                </button>
                                <button
                                  onClick={() => handleProcessRequest(req.id, 'rejected')}
                                  className="px-2 py-1 text-[10px] font-bold uppercase text-rose-400 bg-rose-950/20 hover:bg-rose-500 hover:text-white border border-rose-900/40 rounded cursor-pointer transition-all flex items-center gap-1"
                                >
                                  <X size={11} />
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 3: REQUEST HISTORY */}
            <div className="space-y-3 pt-4 border-t border-slate-800/60">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard size={13} className="text-slate-400" />
                Processed Requests History (Completed by Me)
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 font-mono">
                      <th className="py-2.5 text-slate-400">Player</th>
                      <th className="py-2.5 text-slate-400">Type</th>
                      <th className="py-2.5 text-slate-400">Amount</th>
                      <th className="py-2.5 text-slate-400">Payment Method</th>
                      <th className="py-2.5 text-slate-400">Status</th>
                      <th className="py-2.5 text-slate-400">Player Account details</th>
                      <th className="py-2.5 text-right text-slate-400">Processed On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {(!state.cashRequests || state.cashRequests.filter(r => r.agentId === currentAg.id && (r.status === 'approved' || r.status === 'rejected')).length === 0) ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic font-mono">
                          No processed requests found.
                        </td>
                      </tr>
                    ) : (
                      state.cashRequests
                        .filter(r => r.agentId === currentAg.id && (r.status === 'approved' || r.status === 'rejected'))
                        .map((req) => (
                          <tr key={req.id} className="hover:bg-slate-900/40 text-slate-300">
                            <td className="py-3 font-semibold">
                              <div>{req.playerName}</div>
                              <span className="text-[10px] font-mono text-slate-500">ID: {req.playerId}</span>
                            </td>
                            <td className="py-3 font-semibold">
                              <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                                req.type === 'deposit' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                                'bg-rose-950 text-rose-400 border border-rose-900/30'
                              }`}>
                                {req.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 font-mono text-cyan-400 font-bold">${req.amount.toLocaleString()}</td>
                            <td className="py-3 text-slate-400 font-mono text-[10px]">{req.paymentMethod}</td>
                            <td className="py-3">
                              <span className={`px-1.5 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                                req.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                                'bg-rose-950 text-rose-400 border border-rose-900/30'
                              }`}>
                                {req.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3 text-slate-400 max-w-[150px]">
                              <div>{req.paymentDetails || '-'}</div>
                              {(() => {
                                const playerAcc = state.accounts.find(a => a.id === req.playerId);
                                if (playerAcc && (playerAcc.phoneNumber || playerAcc.cbeAccount)) {
                                  return (
                                    <div className="text-[10px] text-slate-500 font-sans mt-1.5 pt-1.5 border-t border-slate-800/40 space-y-0.5">
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

          </div>
        )}

        {activeTab === 'point-requests' && (
          <div className="space-y-6">
            {/* Upper Stats Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 font-mono">My Account Balance</p>
                  <h4 className="text-xl font-bold text-slate-200 mt-1">${currentAg.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
                </div>
                <div className="bg-blue-500/10 p-2.5 rounded-lg text-blue-400">
                  <DollarSign size={20} />
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 font-mono">My Super Agent</p>
                  <h4 className="text-sm font-bold text-slate-200 mt-1">{parentSa.displayName}</h4>
                  <span className="text-[9px] text-slate-500 font-mono">ID: {parentSa.id}</span>
                </div>
                <div className="bg-indigo-500/10 p-2.5 rounded-lg text-indigo-400">
                  <User size={20} />
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-500 font-mono">Pending Sent Requests</p>
                  <h4 className="text-xl font-bold text-slate-200 mt-1">
                    {(state.agentPointRequests || []).filter(r => r.senderId === currentAg.id && r.status === 'pending').length} requests
                  </h4>
                </div>
                <div className="bg-amber-500/10 p-2.5 rounded-lg text-amber-400">
                  <Clock size={20} className="animate-pulse" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 h-fit space-y-4">
                <div>
                  <h3 className="text-xs uppercase font-bold text-slate-200 tracking-wider">Request Point Transfer</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Submit a points top-up (Deposit) or cash-out (Withdrawal) request to your parent Super Agent.</p>
                </div>

                {pointReqError && (
                  <div className="bg-red-950/55 border border-red-900 text-red-400 p-3 rounded-lg text-xs font-semibold">
                    {pointReqError}
                  </div>
                )}
                {pointReqSuccess && (
                  <div className="bg-emerald-950/55 border border-emerald-900 text-emerald-400 p-3 rounded-lg text-xs font-semibold">
                    {pointReqSuccess}
                  </div>
                )}

                <form onSubmit={handleSubmitPointRequest} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Operation Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPointReqType('deposit')}
                        className={`py-2 px-3 rounded-lg font-bold uppercase text-[10px] border transition-all cursor-pointer ${
                          pointReqType === 'deposit'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        Deposit (Top Up)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPointReqType('withdrawal')}
                        className={`py-2 px-3 rounded-lg font-bold uppercase text-[10px] border transition-all cursor-pointer ${
                          pointReqType === 'withdrawal'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        Withdrawal
                      </button>
                    </div>
                  </div>

                  {pointReqType === 'deposit' && (
                    <div className="bg-slate-950/85 border border-slate-800 p-3 rounded-lg space-y-1.5 text-[11px] font-sans">
                      <div className="font-bold text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                        <CreditCard size={12} className="text-amber-500" />
                        Super Agent Account Details
                      </div>
                      <p className="text-slate-400 text-[10px]">
                        Please transfer the deposit amount to your Super Agent using the details below before submitting.
                      </p>
                      <div className="space-y-0.5 border-t border-slate-800/40 pt-1 text-slate-300 font-mono">
                        <div><strong className="text-slate-500 font-sans text-[9px] uppercase">Name:</strong> {parentSa.displayName}</div>
                        {parentSa.phoneNumber && <div><strong className="text-slate-500 font-sans text-[9px] uppercase">Phone:</strong> {parentSa.phoneNumber}</div>}
                        {parentSa.cbeAccount && <div><strong className="text-slate-500 font-sans text-[9px] uppercase">CBE Account:</strong> {parentSa.cbeAccount}</div>}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Amount ($) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      required
                      min="10"
                      value={pointReqAmount}
                      onChange={(e) => setPointReqAmount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-sm"
                    />
                  </div>

                  {pointReqType === 'deposit' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">
                        Transaction Reference Number <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter bank transaction reference"
                        value={pointReqRefNumber}
                        onChange={(e) => setPointReqRefNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                      />
                      <p className="text-[9px] text-slate-500 font-sans italic">
                        Reference must be unique and match your actual payment slip.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Notes / Reason</label>
                    <textarea
                      placeholder="e.g. Settle weekend player deposits or top up cashier float"
                      value={pointReqNotes}
                      onChange={(e) => setPointReqNotes(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg uppercase tracking-wider text-[10px] transition-all cursor-pointer shadow-lg shadow-blue-500/10"
                  >
                    Submit Request to Super Agent
                  </button>
                </form>
              </div>

              {/* History Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 lg:col-span-2 space-y-4">
                <div>
                  <h3 className="text-xs uppercase font-bold text-slate-200 tracking-wider">Point Request History</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Track point allocation requests sent to your franchiser.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 font-mono">
                        <th className="py-2 text-slate-400">Request ID</th>
                        <th className="py-2 text-slate-400">Type</th>
                        <th className="py-2 text-slate-400">Amount</th>
                        <th className="py-2 text-slate-400">Reference</th>
                        <th className="py-2 text-slate-400">Notes</th>
                        <th className="py-2 text-slate-400">Status</th>
                        <th className="py-2 text-right text-slate-400">Created On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 font-mono">
                      {(!state.agentPointRequests || state.agentPointRequests.filter(r => r.senderId === currentAg.id).length === 0) ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500 italic font-mono">
                            No point requests found.
                          </td>
                        </tr>
                      ) : (
                        state.agentPointRequests
                          .filter(r => r.senderId === currentAg.id)
                          .map((req) => (
                            <tr key={req.id} className="hover:bg-slate-900/40 text-slate-300">
                              <td className="py-3 text-[10px] text-slate-500">{req.id}</td>
                              <td className="py-3 text-[10px]">
                                <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                                  req.type === 'deposit' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                                  'bg-rose-950 text-rose-400 border border-rose-900/30'
                                }`}>
                                  {req.type.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 text-cyan-400 font-bold">${req.amount.toLocaleString()}</td>
                              <td className="py-3 text-slate-400 text-[10px] max-w-[100px] truncate" title={req.referenceNumber}>
                                {req.referenceNumber || '-'}
                              </td>
                              <td className="py-3 text-slate-400 text-[10px] font-sans max-w-[120px] truncate" title={req.notes}>{req.notes || '-'}</td>
                              <td className="py-3 text-[10px]">
                                <span className={`px-1.5 py-0.5 rounded-full font-bold ${
                                  req.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                                  req.status === 'rejected' ? 'bg-rose-950 text-rose-400 border border-rose-900/30' :
                                  'bg-amber-950 text-amber-400 border border-amber-900/30 animate-pulse'
                                }`}>
                                  {req.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 text-right text-slate-500 text-[10px]">
                                {new Date(req.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Player Edit/Management Modal */}
        {editingAccountId && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                    Manage Player Account
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
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Display Name (Full name)</label>
                  <input
                    type="text"
                    required
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +251912345678"
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">CBE Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 1000123456789"
                    value={editCbeAccount}
                    onChange={(e) => setEditCbeAccount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'suspended')}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
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
                    className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-lg uppercase tracking-wider text-[10px] shadow transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Deposit/Withdrawal Modal */}
        {quickOpType && quickOpPlayer && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className={`font-bold uppercase text-xs tracking-wider ${quickOpType === 'deposit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {quickOpType === 'deposit' ? 'Direct Wallet Deposit' : 'Direct Wallet Withdrawal'}
                  </h3>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-mono">
                    Player: {quickOpPlayer.displayName} (@{quickOpPlayer.username}) • ID: {quickOpPlayer.id}
                  </p>
                </div>
                <button 
                  onClick={() => { setQuickOpType(null); setQuickOpPlayer(null); }}
                  className="text-slate-400 hover:text-slate-200 text-xs font-bold font-mono px-2 py-1 hover:bg-slate-800 rounded animate-pulse"
                >
                  ✕
                </button>
              </div>

              {quickOpError && (
                <div className="bg-red-950/55 border border-red-900 text-red-400 p-2.5 rounded-lg text-xs font-semibold">
                  {quickOpError}
                </div>
              )}
              {quickOpSuccess && (
                <div className="bg-emerald-950/55 border border-emerald-900 text-emerald-400 p-2.5 rounded-lg text-xs font-semibold">
                  {quickOpSuccess}
                </div>
              )}

              <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/85 text-[11px] space-y-1.5">
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500 uppercase">Your Club Balance:</span>
                  <span className="text-slate-200 font-bold">${currentAg.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-slate-500 uppercase">Player Wallet Balance:</span>
                  <span className="text-slate-200 font-bold">${quickOpPlayer.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <form onSubmit={handleQuickOpSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">
                    Amount ($) <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quickOpAmount}
                    onChange={(e) => setQuickOpAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-sm"
                  />
                  {quickOpType === 'deposit' ? (
                    <p className="text-[9px] text-slate-500 font-mono">Deducts immediately from your operating club balance.</p>
                  ) : (
                    <p className="text-[9px] text-slate-500 font-mono">Deducts from the player's balance and refunds your club treasury.</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Notes / Reference</label>
                  <input
                    type="text"
                    placeholder={quickOpType === 'deposit' ? 'e.g. Cash collected locally' : 'e.g. Settle cash withdrawal'}
                    value={quickOpNotes}
                    onChange={(e) => setQuickOpNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={() => { setQuickOpType(null); setQuickOpPlayer(null); }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 py-2 font-bold rounded-lg uppercase tracking-wider text-[10px] shadow transition-all cursor-pointer text-white ${
                      quickOpType === 'deposit' 
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600' 
                        : 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600'
                    }`}
                  >
                    {quickOpType === 'deposit' ? 'Confirm Deposit' : 'Confirm Withdrawal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
