import { Account, UserRole } from '../types';
import { ShieldCheck, Award, User, ShoppingBag, Eye, RefreshCw, LogOut } from 'lucide-react';
import MikaLogo from './MikaLogo';

interface RoleSwitcherProps {
  accounts: Account[];
  currentRole: UserRole;
  selectedAccountId: string;
  onSelectAccount: (accountId: string) => void;
  onResetDatabase: () => void;
  onLogout?: () => void;
}

export default function RoleSwitcher({
  accounts,
  currentRole,
  selectedAccountId,
  onSelectAccount,
  onResetDatabase,
  onLogout,
}: RoleSwitcherProps) {
  // Group accounts by role
  const admins = accounts.filter((a) => a.role === 'ADMIN');
  const superAgents = accounts.filter((a) => a.role === 'SUPER_AGENT');
  const agents = accounts.filter((a) => a.role === 'AGENT');
  const players = accounts.filter((a) => a.role === 'PLAYER');

  const currentAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div id="role-switcher" className="bg-slate-900 border-b border-slate-800 py-3 px-4 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-3">
          <MikaLogo size="sm" variant="horizontal" />
          <div className="border-l border-slate-800 pl-3 hidden lg:block">
            <h1 className="text-xs font-semibold text-slate-200 tracking-tight flex items-center gap-1.5 font-mono">
              Aggregator Portal
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              Single-API Gaming Router • Seamless Wallet Active
            </p>
          </div>
        </div>

        {/* Middle: Interactive Account Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
            <Eye size={12} /> Sandbox View:
          </span>

          {/* Admin Group */}
          <div className="flex bg-slate-950 p-1 rounded-md border border-slate-800">
            {admins.map((acc) => (
              <button
                key={acc.id}
                id={`btn-role-${acc.id}`}
                onClick={() => onSelectAccount(acc.id)}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedAccountId === acc.id
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <ShieldCheck size={13} />
                Admin
              </button>
            ))}
          </div>

          {/* Super Agent Dropdown/Group */}
          <div className="flex bg-slate-950 p-1 rounded-md border border-slate-800">
            <span className="px-1.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-500 self-center">
              Super
            </span>
            {superAgents.map((acc) => (
              <button
                key={acc.id}
                id={`btn-role-${acc.id}`}
                onClick={() => onSelectAccount(acc.id)}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedAccountId === acc.id
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title={acc.displayName}
              >
                <Award size={13} />
                {acc.username.replace('super_', '')}
              </button>
            ))}
          </div>

          {/* Agent Group */}
          <div className="flex bg-slate-950 p-1 rounded-md border border-slate-800 max-w-[200px] md:max-w-none overflow-x-auto">
            <span className="px-1.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-500 self-center whitespace-nowrap">
              Agent
            </span>
            {agents.map((acc) => (
              <button
                key={acc.id}
                id={`btn-role-${acc.id}`}
                onClick={() => onSelectAccount(acc.id)}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all whitespace-nowrap ${
                  selectedAccountId === acc.id
                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title={acc.displayName}
              >
                <User size={13} />
                {acc.username.replace('agent_', '')}
              </button>
            ))}
          </div>

          {/* Player Group */}
          <div className="flex bg-slate-950 p-1 rounded-md border border-slate-800">
            <span className="px-1.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-500 self-center">
              Player
            </span>
            {players.map((acc) => (
              <button
                key={acc.id}
                id={`btn-role-${acc.id}`}
                onClick={() => onSelectAccount(acc.id)}
                className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  selectedAccountId === acc.id
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
                title={acc.displayName}
              >
                <ShoppingBag size={13} />
                {acc.username}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Active Profile summary & Sandbox Reset */}
        <div className="flex items-center gap-3 justify-end">
          <div className="text-right border-r border-slate-800 pr-3">
            <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5 justify-end">
              <span className={`w-1.5 h-1.5 rounded-full ${
                currentRole === 'ADMIN' ? 'bg-red-500' :
                currentRole === 'SUPER_AGENT' ? 'bg-amber-500' :
                currentRole === 'AGENT' ? 'bg-blue-500' : 'bg-emerald-500'
              }`} />
              {currentAccount?.displayName}
            </div>
            <div className="text-[11px] font-mono text-cyan-400 font-bold">
              Balance: ${currentAccount?.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <button
            id="btn-reset-db"
            onClick={onResetDatabase}
            className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-950/20 border border-slate-700 hover:border-red-900/40 transition-all cursor-pointer"
            title="Reset Sandbox Database"
          >
            <RefreshCw size={14} />
          </button>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 px-2.5 rounded bg-rose-950/20 text-rose-400 hover:text-rose-300 hover:bg-rose-900/30 border border-rose-900/30 hover:border-rose-800/40 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold font-mono"
              title="Sign Out Session"
            >
              <LogOut size={13} />
              <span>LOGOUT</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
