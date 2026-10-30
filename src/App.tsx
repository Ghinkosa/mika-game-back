import React, { useState, useEffect } from 'react';
import { SystemState, Account, UserRole } from './types';
import { getSystemState, saveSystemState, changeUserPassword } from './utils/db';
import { LogOut, RefreshCw, User, Wallet, Key } from 'lucide-react';
import AdminDashboard from './components/AdminDashboard';
import SuperAgentDashboard from './components/SuperAgentDashboard';
import AgentDashboard from './components/AgentDashboard';
import PlayerLobby from './components/PlayerLobby';
import AuthScreen from './components/AuthScreen';
import ChatWidget from './components/ChatWidget';
import MikaLogo from './components/MikaLogo';

export default function App() {
  const [state, setState] = useState<SystemState | null>(null);
  const [loggedInAccountId, setLoggedInAccountId] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    source: string;
    error: string | null;
  } | null>(null);

  // Load state on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const response = await fetch('/api/state');
        if (response.ok) {
          const data = await response.json();
          if (data && data.success && data.state) {
            setDbStatus({
              connected: true,
              source: data.source || 'database',
              error: null
            });
            setState(data.state);
            saveSystemState(data.state);
            return;
          } else {
            setDbStatus({
              connected: false,
              source: data.source || 'unknown',
              error: data.dbError || 'API returned empty database state'
            });
          }
        } else {
          let errMsg = `HTTP Error ${response.status}: ${response.statusText}`;
          try {
            const data = await response.json();
            if (data && data.dbError) errMsg = data.dbError;
          } catch {}
          setDbStatus({
            connected: false,
            source: 'api_error',
            error: errMsg
          });
        }
      } catch (e: any) {
        console.log("Failed to fetch state from backend:", e);
        setDbStatus({
          connected: false,
          source: 'network_error',
          error: e.message || 'Failed to connect to backend server state API.'
        });
      }
    };

    loadState();

    const savedSession = localStorage.getItem('nexus_logged_in_account_id');
    if (savedSession) {
      setLoggedInAccountId(savedSession);
    } else {
      setLoggedInAccountId(null);
    }
  }, []);

  // Update central state and save to persistent storage
  const handleStateUpdate = (newState: SystemState) => {
    setState(newState);
    saveSystemState(newState);

    // Persist to Express backend API
    fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newState)
    })
    .then(async res => {
      if (!res.ok) {
        let errMsg = `Failed to save changes. Server returned status ${res.status}`;
        try {
          const data = await res.json();
          if (data && data.dbError) errMsg = data.dbError;
        } catch {}
        setDbStatus(prev => ({
          connected: false,
          source: 'save_error',
          error: errMsg
        }));
      } else {
        setDbStatus(prev => prev ? { ...prev, connected: true, error: null } : { connected: true, source: 'database', error: null });
      }
    })
    .catch(err => {
      console.warn("Could not save state to backend:", err);
      setDbStatus(prev => ({
        connected: false,
        source: 'save_network_error',
        error: `Network failure: could not persist changes to backend. Details: ${err.message}`
      }));
    });
  };

  const handleLoginSuccess = (account: Account) => {
    setLoggedInAccountId(account.id);
    localStorage.setItem('nexus_logged_in_account_id', account.id);
  };

  const handleLogout = () => {
    setLoggedInAccountId(null);
    localStorage.removeItem('nexus_logged_in_account_id');
  };

  // Reset database state to seed templates
  const handleResetDatabase = () => {
    if (typeof window !== 'undefined') {
      if (confirm('Are you sure you want to reset the database to the default seed template? This will restore initial credits and default accounts.')) {
        localStorage.removeItem('nexus_logged_in_account_id');
        const defaultState = getSystemState();
        setState(defaultState);
        setLoggedInAccountId(null);

        // Sync default state to server too
        fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(defaultState)
        })
        .then(async res => {
          if (res.ok) {
            setDbStatus(prev => prev ? { ...prev, connected: true, error: null } : { connected: true, source: 'database', error: null });
          } else {
            let errMsg = `Failed to reset state. Server returned ${res.status}`;
            try {
              const data = await res.json();
              if (data && data.dbError) errMsg = data.dbError;
            } catch {}
            setDbStatus({
              connected: false,
              source: 'reset_error',
              error: errMsg
            });
          }
        })
        .catch(err => {
          setDbStatus({
            connected: false,
            source: 'reset_network_error',
            error: `Network failure resetting database: ${err.message}`
          });
        });
      }
    }
  };

  // Change password states
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');

  const handleUpdatePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');

    if (!newPasswordVal.trim()) {
      setChangePasswordError('Password cannot be empty.');
      return;
    }
    if (newPasswordVal.trim().length < 4) {
      setChangePasswordError('Password must be at least 4 characters.');
      return;
    }
    if (!loggedInAccountId) return;

    const res = changeUserPassword(loggedInAccountId, newPasswordVal);
    if (res.success && res.state) {
      setState(res.state);
      setChangePasswordSuccess('Password updated successfully!');
      setNewPasswordVal('');
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setChangePasswordSuccess('');
      }, 1500);
    } else {
      setChangePasswordError(res.error || 'Failed to update password.');
    }
  };



  if (!state) {
    return (
      <div className="bg-slate-950 min-h-screen text-slate-100 flex items-center justify-center p-6 font-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <span>Bootstrapping Mika Games Single API Gateway...</span>
        </div>
      </div>
    );
  }

  // If not logged in, render Auth Screen
  if (!loggedInAccountId) {
    return (
      <div id="mika-app" className="bg-slate-950 min-h-screen flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950">
        <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 py-3.5 px-6 text-center shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MikaLogo size="sm" variant="horizontal" />
              <div className="text-left border-l border-slate-800 pl-3 hidden sm:block">
                <h1 className="text-xs font-semibold text-slate-200 tracking-tight flex items-center gap-1.5 font-mono">
                  Gaming Aggregator & Multi-Tier Gateway
                </h1>
                <p className="text-[10px] text-slate-400 font-mono">
                  Ethiopian Market Betting Network • Portal Access
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {dbStatus && (
                <div 
                  className={`flex items-center gap-2 text-[10px] font-mono border px-3 py-1.5 rounded-lg transition-all ${
                    dbStatus.connected 
                      ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' 
                      : 'border-rose-500/20 bg-rose-500/5 text-rose-400'
                  }`}
                  title={dbStatus.error || 'Connection status with Backend server.'}
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${dbStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
                  <span className="font-bold uppercase tracking-wide">
                    {dbStatus.connected ? 'Backend Connected' : 'Backend Offline'}
                  </span>
                  {dbStatus.error && (
                    <span className="text-rose-400 max-w-[150px] truncate block opacity-80" title={dbStatus.error}>
                      ({dbStatus.error})
                    </span>
                  )}
                </div>
              )}

              <button
                onClick={handleResetDatabase}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-red-950/20 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-900/40 text-xs font-semibold font-mono transition-all flex items-center gap-1 cursor-pointer"
                title="Reset Database to Seed State"
              >
                Reset Database
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center">
          <AuthScreen 
            state={state} 
            onLoginSuccess={handleLoginSuccess} 
            onStateUpdate={handleStateUpdate} 
          />
        </main>

        <footer className="bg-slate-950 border-t border-slate-900 py-4 px-6 text-center text-[10px] font-mono text-slate-500">
          Mika Games Platform Console • Secure credential verification and player enrollment systems active.
        </footer>
      </div>
    );
  }

  // Get current active profile based strictly on loggedInAccountId to prevent bypasses
  const activeAccount = state.accounts.find((a) => a.id === loggedInAccountId) || state.accounts.find(a => a.role === 'ADMIN')!;
  const currentRole = activeAccount.role;

  return (
    <div id="mika-app" className="bg-slate-950 min-h-screen flex flex-col justify-between selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Personal Profile & Navigation Header Bar */}
      <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 py-3 px-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-3">
            <MikaLogo size="sm" variant="horizontal" />
            <div className="border-l border-slate-800 pl-3 hidden lg:block">
              <h1 className="text-xs font-semibold text-slate-200 tracking-tight flex items-center gap-1.5 font-mono">
                Single-API Aggregator
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">
                Multi-Level Commission Router • Secure Session Active
              </p>
            </div>
          </div>

          {/* Middle: Profile Info Card for the Logged In User */}
          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800/80 max-w-sm">
            <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800 text-slate-400">
              <User size={16} />
            </div>
            <div className="text-left font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-100">{activeAccount.displayName}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase ${
                  activeAccount.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                  activeAccount.role === 'SUPER_AGENT' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  activeAccount.role === 'AGENT' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {activeAccount.role.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Wallet size={11} className="text-cyan-400" />
                <span>Balance: <strong className="text-cyan-400">${activeAccount.balance.toLocaleString()}</strong></span>
              </p>
            </div>
          </div>

          {/* Right Actions: Reset Sandbox & Logout */}
          <div className="flex items-center gap-2 shrink-0">
            {dbStatus && (
              <div 
                className={`flex items-center gap-2 text-[10px] font-mono border px-3 py-1.5 rounded-lg transition-all ${
                  dbStatus.connected 
                    ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' 
                    : 'border-rose-500/20 bg-rose-500/5 text-rose-400'
                }`}
                title={dbStatus.error || 'Connection status with Backend server.'}
              >
                <div className={`h-1.5 w-1.5 rounded-full ${dbStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
                <span className="font-bold uppercase tracking-wide">
                  {dbStatus.connected ? 'DB Live' : 'DB Offline'}
                </span>
                {dbStatus.error && (
                  <span className="text-rose-400 max-w-[120px] truncate block opacity-80" title={dbStatus.error}>
                    ({dbStatus.error})
                  </span>
                )}
              </div>
            )}

            <button
              onClick={() => setShowChangePasswordModal(true)}
              className="p-1.5 px-3 rounded bg-slate-800/60 hover:bg-cyan-950/25 text-slate-400 hover:text-cyan-400 border border-slate-700/60 hover:border-cyan-900/40 text-[11px] font-semibold font-mono transition-all flex items-center gap-1.5 cursor-pointer"
              title="Change Password"
            >
              <Key size={12} />
              <span>Change Password</span>
            </button>

            <button
              onClick={handleResetDatabase}
              className="p-1.5 px-3 rounded bg-slate-800/60 hover:bg-red-950/20 text-slate-400 hover:text-red-400 border border-slate-700/60 hover:border-red-900/40 text-[11px] font-semibold font-mono transition-all flex items-center gap-1.5 cursor-pointer"
              title="Reset Sandbox Database"
            >
              <RefreshCw size={12} />
              <span>Reset Sandbox</span>
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 px-3 rounded bg-rose-950/20 text-rose-400 hover:text-rose-300 hover:bg-rose-900/30 border border-rose-900/30 hover:border-rose-800/40 transition-all cursor-pointer flex items-center gap-1.5 text-[11px] font-semibold font-mono"
              title="Sign Out Session"
            >
              <LogOut size={12} />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard Frame */}
      <main className="flex-1">
        {currentRole === 'ADMIN' && (
          <AdminDashboard state={state} onStateUpdate={handleStateUpdate} />
        )}
        {currentRole === 'SUPER_AGENT' && (
          <SuperAgentDashboard 
            state={state} 
            superAgentId={activeAccount.id} 
            onStateUpdate={handleStateUpdate} 
          />
        )}
        {currentRole === 'AGENT' && (
          <AgentDashboard 
            state={state} 
            agentId={activeAccount.id} 
            onStateUpdate={handleStateUpdate} 
          />
        )}
        {currentRole === 'PLAYER' && (
          <PlayerLobby 
            state={state} 
            playerId={activeAccount.id} 
            onStateUpdate={handleStateUpdate} 
          />
        )}
      </main>

      {/* Real-time Network Chat Widget accessible to all roles */}
      <ChatWidget 
        state={state} 
        currentUser={activeAccount} 
        onStateUpdate={handleStateUpdate} 
      />

      {/* Modern Compact Footnote */}
      <footer className="bg-slate-950 border-t border-slate-900 py-4 px-6 text-center text-[10px] font-mono text-slate-500">
        Mika Games Platform Console • Single-API Game Router & Multi-tier Network Active • Built for Ethiopian Market Compliance.
      </footer>

      {/* Change Password Modal Overlay */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                <Key size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Change Account Password</h3>
                <p className="text-[10px] text-slate-400 font-mono">Set a secure login credential</p>
              </div>
            </div>

            {changePasswordError && (
              <div className="bg-rose-950/50 border border-rose-900 text-rose-400 p-2 text-xs rounded font-semibold font-mono">
                {changePasswordError}
              </div>
            )}
            {changePasswordSuccess && (
              <div className="bg-emerald-950/50 border border-emerald-900 text-emerald-400 p-2 text-xs rounded font-semibold font-mono">
                {changePasswordSuccess}
              </div>
            )}

            <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">New Password</label>
                <input
                  type="password"
                  placeholder="Enter new secure password"
                  required
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setNewPasswordVal('');
                    setChangePasswordError('');
                    setChangePasswordSuccess('');
                  }}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/10 cursor-pointer"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
