import React, { useState } from 'react';
import { SystemState, Account, Transaction, BetLog } from '../types';
import { transferCredits, createAccount, withdrawCredits, updateAccountDetails, submitAgentPointRequest, processAgentPointRequest } from '../utils/db';
import SearchableSelect from './SearchableSelect';
import { 
  Award, Users, DollarSign, Plus, ArrowDownLeft, 
  ArrowUpRight, Activity, Calendar, HelpCircle, Key, RefreshCw,
  Clock, Check, X, CreditCard
} from 'lucide-react';

interface SuperAgentDashboardProps {
  state: SystemState;
  superAgentId: string;
  onStateUpdate: (newState: SystemState) => void;
}

export default function SuperAgentDashboard({ state, superAgentId, onStateUpdate }: SuperAgentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'agents' | 'ledgers' | 'requests' | 'point-requests'>('overview');

  // Point Requests form state (for Super Agent to Admin)
  const [pointReqAmount, setPointReqAmount] = useState<number>(50000);
  const [pointReqType, setPointReqType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [pointReqNotes, setPointReqNotes] = useState('');
  const [pointReqRefNumber, setPointReqRefNumber] = useState('');
  const [pointReqError, setPointReqError] = useState('');
  const [pointReqSuccess, setPointReqSuccess] = useState('');

  // Downstream Agent Point Requests processing state
  const [processPointReqError, setProcessPointReqError] = useState('');
  const [processPointReqSuccess, setProcessPointReqSuccess] = useState('');

  // Forms
  const [newAgUsername, setNewAgUsername] = useState('');
  const [newAgDisplayName, setNewAgDisplayName] = useState('');
  const [newAgPassword, setNewAgPassword] = useState('');
  const [newAgCommRate, setNewAgCommRate] = useState(70);
  const [newAgDepositCommRate, setNewAgDepositCommRate] = useState(3);
  const [newAgWithdrawalCommRate, setNewAgWithdrawalCommRate] = useState(3);
  const [newAgInitialCredits, setNewAgInitialCredits] = useState(20000);
  const [newAgPhoneNumber, setNewAgPhoneNumber] = useState('');
  const [newAgCbeAccount, setNewAgCbeAccount] = useState('');
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // State for editing agents
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

  // Transfer credits
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferAmount, setTransferAmount] = useState(5000);
  const [transferNotes, setTransferNotes] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');

  // Withdraw credits
  const [withdrawSourceId, setWithdrawSourceId] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState(5000);
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');

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
      currentSa.id, 
      pointReqAmount, 
      pointReqType, 
      pointReqNotes, 
      pointReqType === 'deposit' ? pointReqRefNumber.trim() : undefined
    );

    if (result.success && result.state) {
      onStateUpdate(result.state);
      setPointReqSuccess(`Point ${pointReqType === 'deposit' ? 'deposit' : 'withdrawal'} request for $${pointReqAmount.toLocaleString()} submitted successfully to Admin!`);
      setPointReqAmount(50000);
      setPointReqNotes('');
      setPointReqRefNumber('');
    } else {
      setPointReqError(result.error || 'Failed to submit point request.');
    }
  };

  const handleProcessAgentPointRequest = (requestId: string, status: 'approved' | 'rejected') => {
    setProcessPointReqError('');
    setProcessPointReqSuccess('');

    const result = processAgentPointRequest(requestId, status, currentSa.id);
    if (result.success && result.state) {
      onStateUpdate(result.state);
      setProcessPointReqSuccess(`Agent request successfully ${status}!`);
    } else {
      setProcessPointReqError(result.error || `Failed to ${status} request.`);
    }
  };

  const currentSa = state.accounts.find(a => a.id === superAgentId)!;
  const parentAdmin = state.accounts.find(a => a.id === currentSa.parentId)!;

  // Downlines
  const agents = state.accounts.filter(a => a.parentId === currentSa.id && a.role === 'AGENT');
  const allSystemAgents = state.accounts.filter(a => a.role === 'AGENT');
  const players = state.accounts.filter(a => a.role === 'PLAYER' && agents.some(ag => ag.id === a.parentId));

  // Transactions list
  const filteredTxs = state.transactions.filter(
    tx => tx.senderId === currentSa.id || tx.receiverId === currentSa.id
  );

  // Filtered bets
  const filteredBets = state.bets.filter(b => b.superAgentId === currentSa.id);

  // Financial Metrics
  const totalBetsVolume = filteredBets.reduce((sum, b) => sum + b.betAmount, 0);
  const totalPayoutsVolume = filteredBets.reduce((sum, b) => sum + b.payoutAmount, 0);
  const totalGGR = totalBetsVolume - totalPayoutsVolume;
  
  // Super Agent overrides commission: sum of superAgentShare in player bets and cash overrides
  const betOverrides = filteredBets.reduce((sum, b) => sum + b.superAgentShare, 0);

  // Overrides from Cash In (Deposit) transactions
  const depositOverrides = state.transactions
    .filter(tx => tx.type === 'deposit')
    .filter(tx => {
      const agent = state.accounts.find(a => a.id === tx.senderId);
      return agent && agent.parentId === currentSa.id;
    })
    .reduce((sum, tx) => sum + (tx.superAgentShare || 0), 0);

  // Overrides from Cash Out (Withdrawal) transactions
  const withdrawOverrides = state.transactions
    .filter(tx => tx.type === 'withdrawal')
    .filter(tx => {
      const agent = state.accounts.find(a => a.id === tx.receiverId);
      return agent && agent.parentId === currentSa.id;
    })
    .reduce((sum, tx) => sum + (tx.superAgentShare || 0), 0);

  const cashOverrides = depositOverrides - withdrawOverrides;
  const superAgentOverrides = cashOverrides;

  // Handler: Create Agent
  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (!newAgUsername || !newAgDisplayName) {
      setCreateError('Please fill out all fields.');
      return;
    }

    if (newAgCommRate >= currentSa.commissionRate) {
      setCreateError(`Agent commission rate (${newAgCommRate}%) must be strictly lower than your Super Agent rate (${currentSa.commissionRate}%) so you can earn an override margin!`);
      return;
    }

    const saDepositRate = currentSa.depositCommissionRate ?? 5;
    if (newAgDepositCommRate >= saDepositRate) {
      setCreateError(`Agent deposit commission rate (${newAgDepositCommRate}%) must be strictly lower than your rate (${saDepositRate}%) so you can earn an override margin!`);
      return;
    }

    const saWithdrawalRate = currentSa.withdrawalCommissionRate ?? 5;
    if (newAgWithdrawalCommRate > saWithdrawalRate) {
      setCreateError(`Agent withdrawal commission rate (${newAgWithdrawalCommRate}%) must not exceed your rate (${saWithdrawalRate}%)!`);
      return;
    }

    if (newAgInitialCredits > currentSa.balance) {
      setCreateError(`Insufficient credit balance to pre-fund Agent. Your available: $${currentSa.balance.toLocaleString()}`);
      return;
    }

    const result = createAccount(
      newAgUsername,
      newAgDisplayName,
      'AGENT',
      newAgCommRate,
      currentSa.id,
      newAgInitialCredits,
      newAgPhoneNumber,
      newAgCbeAccount,
      newAgPassword.trim() || undefined,
      newAgDepositCommRate,
      newAgWithdrawalCommRate
    );

    if (result.success && result.state) {
      onStateUpdate(result.state);
      setCreateSuccess(`Agent '${newAgDisplayName}' registered successfully with $${newAgInitialCredits.toLocaleString()} setup credits!`);
      setNewAgUsername('');
      setNewAgDisplayName('');
      setNewAgPassword('');
      setNewAgCommRate(70);
      setNewAgDepositCommRate(3);
      setNewAgWithdrawalCommRate(3);
      setNewAgInitialCredits(20000);
      setNewAgPhoneNumber('');
      setNewAgCbeAccount('');
    } else {
      setCreateError(result.error || 'Failed to register Agent.');
    }
  };

  const startEditing = (acc: Account) => {
    setEditingAccountId(acc.id);
    setEditDisplayName(acc.displayName);
    setEditCommRate(acc.commissionRate);
    setEditDepositCommRate(acc.depositCommissionRate ?? 3);
    setEditWithdrawalCommRate(acc.withdrawalCommissionRate ?? 3);
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

    // Commission must be less than current SA rate
    if (editCommRate >= currentSa.commissionRate) {
      setEditError(`Agent rate (${editCommRate}%) must be strictly less than your Super Agent rate (${currentSa.commissionRate}%)`);
      return;
    }

    const saDepositRate = currentSa.depositCommissionRate ?? 5;
    if (editDepositCommRate >= saDepositRate) {
      setEditError(`Agent deposit rate (${editDepositCommRate}%) must be strictly lower than your rate (${saDepositRate}%)`);
      return;
    }

    const saWithdrawalRate = currentSa.withdrawalCommissionRate ?? 5;
    if (editWithdrawalCommRate > saWithdrawalRate) {
      setEditError(`Agent withdrawal rate (${editWithdrawalCommRate}%) must not exceed your rate (${saWithdrawalRate}%)`);
      return;
    }

    const result = updateAccountDetails(editingAccountId, {
      displayName: editDisplayName,
      commissionRate: editCommRate,
      depositCommissionRate: editDepositCommRate,
      withdrawalCommissionRate: editWithdrawalCommRate,
      phoneNumber: editPhoneNumber,
      cbeAccount: editCbeAccount,
      status: editStatus
    }, currentSa.id);

    if (result.success && result.state) {
      onStateUpdate(result.state);
      setEditSuccess('Agent details updated successfully!');
      setTimeout(() => {
        setEditingAccountId(null);
      }, 1000);
    } else {
      setEditError(result.error || 'Failed to update Agent.');
    }
  };

  // Handler: Issue sub-credits
  const handleTransferCredits = (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess('');

    if (!transferTargetId || transferAmount <= 0) {
      setTransferError('Please select an Agent and specify an amount.');
      return;
    }

    if (transferAmount > currentSa.balance) {
      setTransferError(`Insufficient credit balance. You only have $${currentSa.balance.toLocaleString()} available.`);
      return;
    }

    const result = transferCredits(currentSa.id, transferTargetId, transferAmount, transferNotes || 'Credit top-up issued by master distributor.');

    if (result.success && result.state) {
      onStateUpdate(result.state);
      setTransferSuccess(`Successfully transferred $${transferAmount.toLocaleString()} credits to Agent.`);
      setTransferAmount(5000);
      setTransferNotes('');
    } else {
      setTransferError(result.error || 'Failed to allocate credits.');
    }
  };

  // Handler: Withdraw from sub-agent
  const handleWithdrawCredits = (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess('');

    if (!withdrawSourceId || withdrawAmount <= 0) {
      setWithdrawError('Please select an Agent and specify an amount to withdraw.');
      return;
    }

    const result = withdrawCredits(currentSa.id, withdrawSourceId, withdrawAmount, withdrawNotes || 'Super agent withdrawal transfer.');

    if (result.success && result.state) {
      onStateUpdate(result.state);
      setWithdrawSuccess(`Successfully withdrew $${withdrawAmount.toLocaleString()} credits.`);
      setWithdrawAmount(5000);
      setWithdrawNotes('');
    } else {
      setWithdrawError(result.error || 'Failed to withdraw credits.');
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="text-xs font-mono text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Award size={14} />
              Super Agent Franchise Portal
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
              {currentSa.displayName}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Downstream Agent network: <strong className="text-amber-400">{agents.length} sub-agents</strong> • Upstream Node: {parentAdmin.displayName}
            </p>
          </div>

          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg flex-wrap gap-1">
            {(['overview', 'agents', 'ledgers', 'requests', 'point-requests'] as const).map((tab) => {
              const downlineAgentIds = agents.map(a => a.id);
              const downlinePlayerIds = players.map(p => p.id);
              
              // Cash requests pending count
              const pendingRequestsCount = (state.cashRequests || []).filter(
                r => r.status === 'pending' && (
                  (r.agentId && downlineAgentIds.includes(r.agentId)) ||
                  (!r.agentId && downlinePlayerIds.includes(r.playerId))
                )
              ).length;

              // Agent point requests pending count (requests from downline Agents to this Super Agent)
              const pendingPointRequestsCount = (state.agentPointRequests || []).filter(
                r => r.receiverId === currentSa.id && r.status === 'pending'
              ).length;

              const showBadge = (tab === 'requests' && pendingRequestsCount > 0) || (tab === 'point-requests' && pendingPointRequestsCount > 0);
              const badgeCount = tab === 'requests' ? pendingRequestsCount : pendingPointRequestsCount;
              const label = tab === 'point-requests' ? 'Point Requests' : tab;

              return (
                <button
                  key={tab}
                  id={`sa-tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-bold rounded-md capitalize transition-all flex items-center gap-1.5 relative cursor-pointer ${
                    activeTab === tab 
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="whitespace-nowrap">{label}</span>
                  {showBadge && (
                    <span className="bg-amber-500 text-slate-950 font-mono text-[9px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
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
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>FRANCHISE CREDIT BALANCE</span>
                  <DollarSign size={16} className="text-amber-500" />
                </div>
                <div className="text-2xl font-black font-mono tracking-tight text-white">
                  ${currentSa.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Available virtual credit pool. Use this to seed and fund downstream agent clubs.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>OVERRIDE COMMISSIONS</span>
                  <Activity size={16} className="text-cyan-500" />
                </div>
                <div className={`text-2xl font-black font-mono tracking-tight ${superAgentOverrides >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${superAgentOverrides.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-slate-500 font-mono space-y-0.5 border-t border-slate-800/60 pt-1.5 mt-1.5">
                  <div className="flex justify-between">
                    <span>Deposit Overrides:</span>
                    <span className="text-emerald-400 font-semibold">+${depositOverrides.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Withdraw Overrides:</span>
                    <span className="text-rose-400 font-semibold">-${withdrawOverrides.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight pt-1">
                  Total override margin accumulated from deposit and withdrawal cash transaction splits.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>NETWORK TURNOVER (BET)</span>
                  <ArrowUpRight size={16} className="text-indigo-500" />
                </div>
                <div className="text-2xl font-black font-mono tracking-tight text-indigo-400">
                  ${totalBetsVolume.toLocaleString()}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Total GGR volume rolled by all players belonging to your downstream network.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl space-y-2">
                <div className="text-slate-400 text-xs font-semibold flex items-center justify-between">
                  <span>ACTIVE AGENTS & PLAYERS</span>
                  <Users size={16} className="text-amber-500" />
                </div>
                <div className="text-2xl font-black tracking-tight text-white">
                  {agents.length} <span className="text-xs text-slate-500 font-normal">Club Agents</span> • {players.length} <span className="text-xs text-slate-500 font-normal">Active</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Size of the multi-tier gaming distribution node managed by your franchise.
                </p>
              </div>
            </div>

            {/* Downstream margins & GGR splits card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Franchise Parameters card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Award size={18} className="text-amber-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Franchise Override Settings
                  </h3>
                </div>

                <div className="space-y-3.5 text-xs text-slate-400 font-mono">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Your Base Cash Rates</div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span>Deposit Commission:</span>
                        <strong className="text-emerald-400">+{currentSa.depositCommissionRate ?? 5}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Withdrawal Commission:</span>
                        <strong className="text-amber-400">+{currentSa.withdrawalCommissionRate ?? 5}%</strong>
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-500 leading-tight pt-1">
                      You earn risk-free override commission from downline cash transactions matching these base rates.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                    <div className="text-[10px] uppercase font-bold text-slate-500">How Overrides Work</div>
                    <p className="text-[9px] text-slate-400 leading-normal">
                      The gap between your franchise rate and your sub-agents' rates is credited directly to your credit balance with every successful cash operation.
                    </p>
                    <p className="text-[9px] text-slate-500 leading-normal italic">
                      Example: If you are at 5% and your agent is at 3%, you receive a +2% risk-free override on that transaction's volume!
                    </p>
                  </div>
                </div>
              </div>

              {/* Sub-Agent Performance summary */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 lg:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Club Agents Performance Directory
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Manage sub-agent rates, phones, status, and CBE bank accounts.</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">REALTIME NETWORK AUDITING</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                        <th className="py-2 pr-2">Agent Club Name</th>
                        <th className="py-2 px-2">Phone Number</th>
                        <th className="py-2 px-2">CBE Account</th>
                        <th className="py-2 px-2 text-center">Deposit Rate / Margin</th>
                        <th className="py-2 px-2 text-center">Withdraw Rate / Margin</th>
                        <th className="py-2 px-2 text-right">Balance</th>
                        <th className="py-2 px-2 text-center">Status</th>
                        <th className="py-2 pl-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {agents.map((ag) => {
                        const depOverride = (currentSa.depositCommissionRate ?? 5) - (ag.depositCommissionRate ?? 3);
                        const withOverride = (currentSa.withdrawalCommissionRate ?? 5) - (ag.withdrawalCommissionRate ?? 3);
                        return (
                          <tr key={ag.id} className="hover:bg-slate-900/40">
                            <td className="py-3 pr-2 font-semibold text-slate-100">
                              <div>{ag.displayName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">@{ag.username}</div>
                            </td>
                            <td className="py-3 px-2 font-mono text-slate-300">
                              {ag.phoneNumber || <span className="text-slate-600 italic">Not set</span>}
                            </td>
                            <td className="py-3 px-2 font-mono text-slate-300">
                              {ag.cbeAccount || <span className="text-slate-600 italic">Not set</span>}
                            </td>
                            <td className="py-3 px-2 text-center font-mono">
                              <div className="text-emerald-400 font-bold">{ag.depositCommissionRate ?? 3}%</div>
                              <div className="text-[10px] text-slate-400">Margin: +{depOverride}%</div>
                            </td>
                            <td className="py-3 px-2 text-center font-mono">
                              <div className="text-amber-400 font-bold">{ag.withdrawalCommissionRate ?? 3}%</div>
                              <div className="text-[10px] text-slate-400">Margin: +{withOverride}%</div>
                            </td>
                            <td className="py-3 px-2 text-right font-mono font-bold text-cyan-400">
                              ${ag.balance.toLocaleString()}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                ag.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}>
                                {ag.status}
                              </span>
                            </td>
                            <td className="py-3 pl-2 text-right">
                              <span className="text-[10px] text-slate-500 font-medium italic">Read-only</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </>
        )}

        {activeTab === 'agents' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create sub-agent form */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4 lg:col-span-1">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Plus size={18} className="text-amber-500" />
                <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                  Register Local Club Agent
                </h3>
              </div>

              {createError && <div className="bg-red-950/55 border border-red-900 text-red-400 p-2.5 text-xs rounded-lg font-semibold">{createError}</div>}
              {createSuccess && <div className="bg-emerald-950/55 border border-emerald-900 text-emerald-400 p-2.5 text-xs rounded-lg font-semibold">{createSuccess}</div>}

              <form onSubmit={handleCreateAgent} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Username (Unique handle)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. agent_titan"
                    value={newAgUsername}
                    onChange={(e) => setNewAgUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Display Name (Club Name)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Titan VIP Slot Club"
                    value={newAgDisplayName}
                    onChange={(e) => setNewAgDisplayName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Password (Leave blank for 'password')</label>
                  <input
                    type="password"
                    placeholder="Enter password (Optional)"
                    value={newAgPassword}
                    onChange={(e) => setNewAgPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +251912345678"
                    value={newAgPhoneNumber}
                    onChange={(e) => setNewAgPhoneNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">CBE Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 1000123456789"
                    value={newAgCbeAccount}
                    onChange={(e) => setNewAgCbeAccount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">
                    Deposit Commission Rate: <strong className="text-amber-400">{newAgDepositCommRate}%</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, (currentSa.depositCommissionRate ?? 5) - 1)}
                    step="1"
                    value={newAgDepositCommRate}
                    onChange={(e) => setNewAgDepositCommRate(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>0% min</span>
                    <span>Your override is {(currentSa.depositCommissionRate ?? 5) - newAgDepositCommRate}%</span>
                    <span>Max {Math.max(0, (currentSa.depositCommissionRate ?? 5) - 1)}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">
                    Withdrawal Commission Rate: <strong className="text-amber-400">{newAgWithdrawalCommRate}%</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max={currentSa.withdrawalCommissionRate ?? 100}
                    step="1"
                    value={newAgWithdrawalCommRate}
                    onChange={(e) => setNewAgWithdrawalCommRate(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>1% min</span>
                    <span>Your override is {(currentSa.withdrawalCommissionRate ?? 5) - newAgWithdrawalCommRate}%</span>
                    <span>Max {currentSa.withdrawalCommissionRate ?? 5}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Initial Credit Top-up ($)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newAgInitialCredits}
                    onChange={(e) => setNewAgInitialCredits(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 font-mono"
                  />
                  <p className="text-[9px] text-slate-500 font-mono italic">Credits are deducted immediately from your available $ {currentSa.balance.toLocaleString()}.</p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg uppercase tracking-wider text-xs shadow transition-all cursor-pointer"
                >
                  Create & Seed Agent Club
                </button>
              </form>
            </div>

            {/* Credit operations */}
            <div className="space-y-6 lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Credit Reload */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <DollarSign size={18} className="text-emerald-400" />
                    <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                      Credit Top-up Sub-Agent
                    </h3>
                  </div>

                  {transferError && <div className="bg-red-950/50 border border-red-900 text-red-400 p-2 text-xs rounded">{transferError}</div>}
                  {transferSuccess && <div className="bg-emerald-950/50 border border-emerald-900 text-emerald-400 p-2 text-xs rounded">{transferSuccess}</div>}

                  <form onSubmit={handleTransferCredits} className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Select Agent Club</label>
                      <SearchableSelect
                        items={allSystemAgents}
                        value={transferTargetId}
                        onChange={setTransferTargetId}
                        placeholder="Search agent by ID, club name, or phone..."
                        labelType="Agent"
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
                        placeholder="e.g. Holiday season credit increase"
                        value={transferNotes}
                        onChange={(e) => setTransferNotes(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                    >
                      Top-up Sub-Agent
                    </button>
                  </form>
                </div>

                {/* Credit Withdrawal */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Plus size={18} className="text-rose-400 rotate-45" />
                    <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                      Clawback Credits from Sub-Agent
                    </h3>
                  </div>

                  {withdrawError && <div className="bg-red-950/50 border border-red-900 text-red-400 p-2 text-xs rounded">{withdrawError}</div>}
                  {withdrawSuccess && <div className="bg-emerald-950/50 border border-emerald-900 text-emerald-400 p-2 text-xs rounded">{withdrawSuccess}</div>}

                  <form onSubmit={handleWithdrawCredits} className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Select Agent Club</label>
                      <SearchableSelect
                        items={allSystemAgents}
                        value={withdrawSourceId}
                        onChange={setWithdrawSourceId}
                        placeholder="Search agent by ID, club name, or phone..."
                        labelType="Agent"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 block">Clawback Amount ($)</label>
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
                        placeholder="e.g. Inactive agent balance reduction"
                        value={withdrawNotes}
                        onChange={(e) => setWithdrawNotes(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-slate-200"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-rose-700 hover:bg-rose-600 text-white font-bold rounded uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                    >
                      Pull Credits Back
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ledgers' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs uppercase font-bold text-slate-200 tracking-wider">Your Franchise Ledger Transactions</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500">
                    <th className="py-2.5">ID</th>
                    <th className="py-2.5">Sender</th>
                    <th className="py-2.5">Receiver</th>
                    <th className="py-2.5">Operation</th>
                    <th className="py-2.5">Notes</th>
                    <th className="py-2.5 text-right">Value Payload</th>
                    <th className="py-2.5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredTxs.map((tx) => (
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
                        ${tx.amount.toLocaleString()}
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
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xs uppercase font-bold text-slate-200 tracking-wider">
                  Downstream Cashier Pipeline Audit
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Supervise and audit pending or completed player cashier requests across all of your agent clubs.
                </p>
              </div>
              <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">
                Audit Trail
              </span>
            </div>

            {/* Pending Requests across all downline clubs */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                Pending Downline Requests
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 font-mono">
                      <th className="py-2.5 text-slate-400">Player</th>
                      <th className="py-2.5 text-slate-400">Type</th>
                      <th className="py-2.5 text-slate-400">Target Agent Club</th>
                      <th className="py-2.5 text-slate-400">Amount</th>
                      <th className="py-2.5 text-slate-400">Method</th>
                      <th className="py-2.5 text-slate-400">Details</th>
                      <th className="py-2.5 text-right text-slate-400">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {(!state.cashRequests || state.cashRequests.filter(r => 
                      r.status === 'pending' && (
                        (r.agentId && agents.some(ag => ag.id === r.agentId)) ||
                        (!r.agentId && players.some(p => p.id === r.playerId))
                      )
                    ).length === 0) ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500 italic font-mono">
                          No pending downline requests currently logged.
                        </td>
                      </tr>
                    ) : (
                      state.cashRequests
                        .filter(r => 
                          r.status === 'pending' && (
                            (r.agentId && agents.some(ag => ag.id === r.agentId)) ||
                            (!r.agentId && players.some(p => p.id === r.playerId))
                          )
                        )
                        .map((req) => {
                          const player = state.accounts.find(a => a.id === req.playerId);
                          const resolvedAgent = player ? state.accounts.find(a => a.id === player.parentId) : null;
                          const resolvedAgentName = resolvedAgent ? resolvedAgent.displayName : 'Unknown';

                          return (
                            <tr key={req.id} className="hover:bg-slate-900/40">
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
                              <td className="py-3 text-slate-300 font-semibold">
                                {req.agentName || `${resolvedAgentName} (Unassigned)`}
                              </td>
                              <td className="py-3 font-mono text-cyan-400 font-bold">${req.amount.toLocaleString()}</td>
                              <td className="py-3 text-slate-400 font-mono text-[10px]">{req.paymentMethod}</td>
                              <td className="py-3 text-slate-400 max-w-[150px]">
                                <div>
                                  {req.type === 'deposit' ? (
                                    <span className="text-slate-500 text-[10px]">🔒 Masked (Awaiting Claim)</span>
                                  ) : (
                                    req.paymentDetails
                                  )}
                                </div>
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
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Processed History across all downline clubs */}
            <div className="space-y-3 pt-4 border-t border-slate-800/60">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Completed Downline Requests History
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 font-mono">
                      <th className="py-2.5 text-slate-400">Player</th>
                      <th className="py-2.5 text-slate-400">Type</th>
                      <th className="py-2.5 text-slate-400">Target Agent Club</th>
                      <th className="py-2.5 text-slate-400">Amount</th>
                      <th className="py-2.5 text-slate-400">Method</th>
                      <th className="py-2.5 text-slate-400">Status</th>
                      <th className="py-2.5 text-slate-400">Details</th>
                      <th className="py-2.5 text-right text-slate-400">Processed On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {(!state.cashRequests || state.cashRequests.filter(r => agents.some(ag => ag.id === r.agentId) && r.status !== 'pending').length === 0) ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500 italic font-mono">
                          No processed downline requests found.
                        </td>
                      </tr>
                    ) : (
                      state.cashRequests
                        .filter(r => agents.some(ag => ag.id === r.agentId) && r.status !== 'pending')
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
                            <td className="py-3 text-slate-300 font-semibold">{req.agentName}</td>
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
            
            {/* Top Sub-Agent Requests (Approvals Panel) */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={16} className="text-amber-500 animate-pulse" />
                  Requests from My Sub-Agents
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 font-sans">
                  Process points top-ups or withdrawal settlements submitted by your downstream agents.
                </p>
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
                      <th className="py-2.5 text-slate-400">Agent</th>
                      <th className="py-2.5 text-slate-400">Type</th>
                      <th className="py-2.5 text-slate-400">Amount</th>
                      <th className="py-2.5 text-slate-400">Notes / Reason</th>
                      <th className="py-2.5 text-slate-400">Status</th>
                      <th className="py-2.5 text-slate-400">Date Submitted</th>
                      <th className="py-2.5 text-right text-slate-400">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {(!state.agentPointRequests || state.agentPointRequests.filter(r => r.receiverId === currentSa.id).length === 0) ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-500 italic font-mono">
                          No downline point requests found.
                        </td>
                      </tr>
                    ) : (
                      state.agentPointRequests
                        .filter(r => r.receiverId === currentSa.id)
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((req) => {
                          const requester = state.accounts.find(a => a.id === req.senderId);
                          return (
                            <tr key={req.id} className="hover:bg-slate-900/40 text-slate-300">
                              <td className="py-3.5">
                                <div className="font-semibold text-slate-200">{requester?.displayName || req.senderId}</div>
                                <div className="text-[10px] text-slate-500 font-mono space-y-0.5">
                                  <div>ID: {req.senderId} • Bal: ${requester?.balance.toLocaleString()}</div>
                                  {requester?.phoneNumber && <div className="text-amber-400 font-sans">📞 {requester.phoneNumber}</div>}
                                  {requester?.cbeAccount && <div className="text-cyan-400 font-bold">💳 CBE: {requester.cbeAccount}</div>}
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
                              <td className="py-3.5 text-slate-300 max-w-[180px]">
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

            {/* Bottom Form and History for Super Agent to Admin */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 h-fit space-y-4">
                <div>
                  <h3 className="text-xs uppercase font-bold text-slate-200 tracking-wider">Request Points from Admin</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Need more franchise float? Request point deposits or cashouts from the primary Admin.</p>
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
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
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

                  {pointReqType === 'deposit' && parentAdmin && (
                    <div className="bg-slate-950/85 border border-slate-800 p-3 rounded-lg space-y-1.5 text-[11px] font-sans">
                      <div className="font-bold text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                        <CreditCard size={12} className="text-amber-500" />
                        Admin Account Details
                      </div>
                      <p className="text-slate-400 text-[10px]">
                        Please transfer the deposit amount to Admin using the details below before submitting.
                      </p>
                      <div className="space-y-0.5 border-t border-slate-800/40 pt-1 text-slate-300 font-mono">
                        <div><strong className="text-slate-500 font-sans text-[9px] uppercase">Name:</strong> {parentAdmin.displayName}</div>
                        {parentAdmin.phoneNumber && <div><strong className="text-slate-500 font-sans text-[9px] uppercase">Phone:</strong> {parentAdmin.phoneNumber}</div>}
                        {parentAdmin.cbeAccount && <div><strong className="text-slate-500 font-sans text-[9px] uppercase">CBE Account:</strong> {parentAdmin.cbeAccount}</div>}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Amount ($) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      required
                      min="100"
                      value={pointReqAmount}
                      onChange={(e) => setPointReqAmount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-sm"
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                      />
                      <p className="text-[9px] text-slate-500 font-sans italic">
                        Reference must be unique and match your actual payment slip.
                      </p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block">Notes / Reason</label>
                    <textarea
                      placeholder="e.g. Settle agent deposit demands or settle commission payouts"
                      value={pointReqNotes}
                      onChange={(e) => setPointReqNotes(e.target.value)}
                      rows={3}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg uppercase tracking-wider text-[10px] transition-all cursor-pointer shadow-lg shadow-amber-500/10"
                  >
                    Submit Request to Admin
                  </button>
                </form>
              </div>

              {/* History Card */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 lg:col-span-2 space-y-4">
                <div>
                  <h3 className="text-xs uppercase font-bold text-slate-200 tracking-wider">My Point Request History</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Track point requests sent to your franchiser (Admin).</p>
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
                      {(!state.agentPointRequests || state.agentPointRequests.filter(r => r.senderId === currentSa.id).length === 0) ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500 italic font-mono">
                            No point requests found.
                          </td>
                        </tr>
                      ) : (
                        state.agentPointRequests
                          .filter(r => r.senderId === currentSa.id)
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
                              <td className="py-3 text-slate-400 text-[10px] max-w-[100px] truncate font-mono" title={req.referenceNumber}>
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

        {/* Agent Edit/Management Modal */}
        {editingAccountId && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl text-left">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                    Manage Agent Club Account
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
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Display Name (Club Name)</label>
                  <input
                    type="text"
                    required
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +251912345678"
                    value={editPhoneNumber}
                    onChange={(e) => setEditPhoneNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">CBE Account Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 1000123456789"
                    value={editCbeAccount}
                    onChange={(e) => setEditCbeAccount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">
                    Deposit Commission Rate: <strong className="text-amber-400">{editDepositCommRate}%</strong>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, (currentSa.depositCommissionRate ?? 5) - 1)}
                    step="1"
                    value={editDepositCommRate}
                    onChange={(e) => setEditDepositCommRate(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>0% min</span>
                    <span>Max {Math.max(0, (currentSa.depositCommissionRate ?? 5) - 1)}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">
                    Withdrawal Commission Rate: <strong className="text-amber-400">{editWithdrawalCommRate}%</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max={currentSa.withdrawalCommissionRate ?? 100}
                    step="1"
                    value={editWithdrawalCommRate}
                    onChange={(e) => setEditWithdrawalCommRate(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                    <span>1% min</span>
                    <span>Max {currentSa.withdrawalCommissionRate ?? 5}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'suspended')}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500"
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
                    className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg uppercase tracking-wider text-[10px] shadow transition-all cursor-pointer"
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
  );
}
