import React, { useState } from 'react';
import { Account, SystemState } from '../types';
import { loginUser, createAccount } from '../utils/db';
import { KeyRound, UserPlus, ShieldAlert, CheckCircle2, User, Phone, Landmark, ChevronDown, Sparkles, Shield, UserCheck, Lock } from 'lucide-react';
import MikaLogo from './MikaLogo';

interface AuthScreenProps {
  state: SystemState;
  onLoginSuccess: (account: Account) => void;
  onStateUpdate: (newState: SystemState) => void;
}

export default function AuthScreen({ state, onLoginSuccess, onStateUpdate }: AuthScreenProps) {
  const [portal, setPortal] = useState<'player' | 'staff'>('player');
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Login State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Registration State
  const [regDisplayName, setRegDisplayName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCbe, setRegCbe] = useState('');
  const [regAgentId, setRegAgentId] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Fetch all active agents in the system
  const activeAgents = state.accounts.filter(a => a.role === 'AGENT' && a.status === 'active');

  const switchPortal = (p: 'player' | 'staff') => {
    setPortal(p);
    setActiveTab('login');
    setLoginUsername('');
    setLoginPassword('');
    setLoginError('');
    setRegError('');
    setRegSuccess('');
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginUsername.trim()) {
      setLoginError('Please enter your username.');
      return;
    }

    const res = loginUser(loginUsername, loginPassword || 'password');
    if (res.success && res.account) {
      const role = res.account.role;
      if (portal === 'player' && role !== 'PLAYER') {
        setLoginError('Staff accounts (Admins/Agents) must sign in through the Management Portal. Click "Management Portal" below.');
        return;
      }
      if (portal === 'staff' && role === 'PLAYER') {
        setLoginError('Player accounts must sign in through the Player Portal. Click "Player Portal" below.');
        return;
      }
      onLoginSuccess(res.account);
    } else {
      setLoginError(res.error || 'Authentication failed.');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    if (!regDisplayName.trim()) {
      setRegError('Display name is required.');
      return;
    }
    if (!regUsername.trim()) {
      setRegError('Username is required.');
      return;
    }
    if (regUsername.trim().length < 3) {
      setRegError('Username must be at least 3 characters.');
      return;
    }
    if (!regPassword.trim()) {
      setRegError('Password is required.');
      return;
    }
    if (regPassword.trim().length < 4) {
      setRegError('Password must be at least 4 characters.');
      return;
    }
    if (!regPhone.trim()) {
      setRegError('Phone number is required for transaction identification.');
      return;
    }

    const res = createAccount(
      regUsername.trim().toLowerCase(),
      regDisplayName.trim(),
      'PLAYER',
      0, // commission rate is 0 for players
      regAgentId, // if empty, createAccount will auto-allocate a parent Agent
      0, // initial balance is 0
      regPhone.trim(),
      regCbe.trim() || undefined,
      regPassword.trim()
    );

    if (res.success && res.account && res.state) {
      setRegSuccess(`Registration successful! Player ID: ${res.account.id}`);
      onStateUpdate(res.state);
      
      // Auto-fill login and swap tabs
      setLoginUsername(regUsername.trim().toLowerCase());
      setLoginPassword(regPassword.trim());
      
      // Reset registration form
      setRegDisplayName('');
      setRegUsername('');
      setRegPassword('');
      setRegPhone('');
      setRegCbe('');
      setRegAgentId('');

      setTimeout(() => {
        setActiveTab('login');
        setRegSuccess('');
      }, 1500);
    } else {
      setRegError(res.error || 'Failed to register account.');
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4 md:p-8 space-y-6">
      {/* Portal Mode Indicator Pill */}
      <div className="flex bg-slate-900 border border-slate-800 p-1.5 rounded-xl shadow-lg gap-1.5">
        <button
          onClick={() => switchPortal('player')}
          className={`px-4 py-2 text-xs font-bold font-mono rounded-lg uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
            portal === 'player'
              ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck size={13} />
          Player Portal
        </button>
        <button
          onClick={() => switchPortal('staff')}
          className={`px-4 py-2 text-xs font-bold font-mono rounded-lg uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
            portal === 'staff'
              ? 'bg-gradient-to-r from-rose-600 to-rose-500 text-slate-100 font-black shadow-lg shadow-rose-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield size={13} />
          Management Portal
        </button>
      </div>

      <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Decorative Brand Header based on selected portal */}
        {portal === 'player' ? (
          <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 p-6 text-center space-y-2 relative">
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider">
              <Sparkles size={10} /> PLAYER GATEWAY
            </div>
            
            {/* Prominent Mika Games Logo */}
            <div className="py-1">
              <MikaLogo size="lg" variant="full" showTagline={true} />
            </div>

            <h2 className="text-sm font-bold text-slate-200 tracking-tight pt-1">Ethiopian Single-API Gaming Lobby</h2>
            <p className="text-xs text-slate-400 font-mono">Sign in to your player account or register with an Agent</p>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-slate-950 via-slate-900 to-rose-950/20 border-b border-slate-800 p-6 text-center space-y-2 relative">
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider">
              <Lock size={10} /> STAFF CONSOLE
            </div>

            {/* Prominent Mika Games Logo */}
            <div className="py-1">
              <MikaLogo size="lg" variant="full" showTagline={true} />
            </div>

            <h2 className="text-sm font-bold text-slate-200 tracking-tight pt-1">Management & Hierarchy Portal</h2>
            <p className="text-xs text-slate-400 font-mono">Admin, Super Agent & Agent commission and player management</p>
          </div>
        )}

        {/* Auth Tabs (Shown only for player portal, staff portal has login only) */}
        {portal === 'player' ? (
          <div className="flex border-b border-slate-800/60 bg-slate-950/50 p-1">
            <button
              onClick={() => { setActiveTab('login'); setRegError(''); setRegSuccess(''); }}
              className={`flex-1 py-3 text-center text-xs font-bold tracking-wider uppercase font-mono rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-slate-900 text-cyan-400 shadow border border-slate-800'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <KeyRound size={14} />
              Sign In
            </button>
            <button
              onClick={() => { setActiveTab('register'); setLoginError(''); }}
              className={`flex-1 py-3 text-center text-xs font-bold tracking-wider uppercase font-mono rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-slate-900 text-emerald-400 shadow border border-slate-800'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <UserPlus size={14} />
              Player Register
            </button>
          </div>
        ) : (
          <div className="bg-slate-950/30 p-3 text-center border-b border-slate-800/60 text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-center gap-2">
            <Shield size={13} className="text-rose-500" />
            <span>Secure Admin / Agent Credential Validator</span>
          </div>
        )}

        {/* Content Box */}
        <div className="p-6 flex-1 flex flex-col justify-between">
          
          {(activeTab === 'login' || portal === 'staff') && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-lg flex items-start gap-2.5 text-xs text-rose-300 font-mono">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <User size={11} /> Username
                </label>
                <input
                  type="text"
                  placeholder={portal === 'player' ? "e.g. lucky_spin" : "e.g. admin or super_vortex"}
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-1 font-mono ${
                    portal === 'player' ? 'focus:border-cyan-500/50 focus:ring-cyan-500/20' : 'focus:border-rose-500/50 focus:ring-rose-500/20'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <KeyRound size={11} /> Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-1 font-mono ${
                    portal === 'player' ? 'focus:border-cyan-500/50 focus:ring-cyan-500/20' : 'focus:border-rose-500/50 focus:ring-rose-500/20'
                  }`}
                />
                <p className="text-[10px] text-slate-500 italic">Default seed password is <code className="text-cyan-500/80 font-bold font-mono">password</code> if unchanged.</p>
              </div>

              <button
                type="submit"
                className={`w-full font-bold py-3 px-4 rounded-xl text-xs tracking-widest uppercase transition-all shadow-lg cursor-pointer mt-2 ${
                  portal === 'player'
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 shadow-cyan-500/10'
                    : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-500/10'
                }`}
              >
                Authenticate Session
              </button>
            </form>
          )}

          {activeTab === 'register' && portal === 'player' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {regError && (
                <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-lg flex items-start gap-2.5 text-xs text-rose-300 font-mono">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <span>{regError}</span>
                </div>
              )}

              {regSuccess && (
                <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-lg flex items-start gap-2.5 text-xs text-emerald-300 font-mono">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>{regSuccess}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                  <User size={11} /> Full Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Erick L."
                  value={regDisplayName}
                  onChange={(e) => setRegDisplayName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3.5 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                    <User size={11} /> Username
                  </label>
                  <input
                    type="text"
                    placeholder="crash_pro"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3.5 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                    <KeyRound size={11} /> Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3.5 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Phone size={11} /> Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+251912345678"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3.5 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                    <Landmark size={11} /> CBE Acc (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="1000123456789"
                    value={regCbe}
                    onChange={(e) => setRegCbe(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3.5 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Select Affiliate Club Agent parent (Optional)
                </label>
                <div className="relative">
                  <select
                    value={regAgentId}
                    onChange={(e) => setRegAgentId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-lg px-3.5 py-2.5 text-slate-200 text-sm focus:outline-none appearance-none pr-10 cursor-pointer"
                  >
                    <option value="">-- Choose automatically (Optional) --</option>
                    {activeAgents.map((agent) => {
                      const superAgent = state.accounts.find(sa => sa.id === agent.parentId);
                      return (
                        <option key={agent.id} value={agent.id}>
                          {agent.displayName} ({agent.username}) • Parent: {superAgent?.displayName || 'Direct'}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                    <ChevronDown size={14} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal">
                  You can choose a preferred affiliate agent, or leave it empty to be assigned to a verified active agent automatically. All deposits and cashouts are processed securely by your assigned agent.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs tracking-widest uppercase transition-all shadow-lg shadow-emerald-500/10 cursor-pointer mt-2"
              >
                Register & Initialize Account
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
