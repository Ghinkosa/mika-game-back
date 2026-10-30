import React, { useState, useEffect } from 'react';
import { SystemState, Account } from '../types';
import { 
  Server, Key, RefreshCw, Copy, Check, ExternalLink, ShieldCheck, 
  Terminal, Send, CheckCircle2, FileText, Zap, Globe, AlertCircle, Play, ArrowRight, Lock
} from 'lucide-react';

interface SoftSwissIntegrationPanelProps {
  state: SystemState;
  onStateUpdate: (newState: SystemState) => void;
}

export default function SoftSwissIntegrationPanel({ state, onStateUpdate }: SoftSwissIntegrationPanelProps) {
  // Callback URLs requested by Yuliya
  const stageCallbackUrl = "https://ais-dev-6yow2zrthwxecf3h7pp5y4-701381312603.europe-west2.run.app/api/integrations/softswiss/stage/callback";
  const prodCallbackUrl = "https://ais-pre-6yow2zrthwxecf3h7pp5y4-701381312603.europe-west2.run.app/api/integrations/softswiss/prod/callback";
  const contactEmail = "galata17137@gmail.com";

  // Server config state
  const [serverConfig, setServerConfig] = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/integrations/softswiss/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setServerConfig(data);
        }
      })
      .catch(err => console.warn('Could not fetch SoftSwiss config:', err));
  }, []);

  // Copy state
  const [copiedStage, setCopiedStage] = useState(false);
  const [copiedProd, setCopiedProd] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // Live Test Bench State
  const players = state.accounts.filter(a => a.role === 'PLAYER');
  const [selectedPlayerId, setSelectedPlayerId] = useState(players[0]?.id || 'player-1');
  const [testAmount, setTestAmount] = useState('25.123456');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResponse, setTestResponse] = useState<any | null>(null);
  const [testError, setTestError] = useState('');
  const [pingStatus, setPingStatus] = useState<{ stage?: string; prod?: string }>({});

  const handleCopy = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2500);
  };

  const emailReplyTemplate = `Hello Yuliya,

Thank you for reaching out! We are glad to e-meet you and excited to proceed with the SoftSwiss (S7S) Game Aggregator integration for Mika Games.

Here are our 2 callback URLs for the test/stage and production environments:

1. Test / Stage Callback URL:
${stageCallbackUrl}

2. Production Callback URL:
${prodCallbackUrl}

Please grant personal access to Confluence (Game list & restricted territories) and send confidential documentation/keys to:
${contactEmail}

We have also noted and implemented the critical technical requirements:
• Money Amount String Format: Fully supported with up to 18 integer digits and 12 fractional digits via our BigInt fixed-point decimal engine. All requests (including Evolution 6-decimal currencies and multi-decimal jackpots) are processed with zero floating-point rounding loss.
• Launcher Parameters: We have strictly omitted 'wallet_id' and enabled support for 'session_payload'.

Looking forward to receiving our test stage credentials and Confluence access!

Best regards,
Mika Games Integration Team`;

  const handlePingCallback = async (env: 'stage' | 'prod') => {
    setPingStatus(prev => ({ ...prev, [env]: 'pinging' }));
    try {
      const endpoint = env === 'stage' 
        ? '/api/integrations/softswiss/stage/callback/balance' 
        : '/api/integrations/softswiss/prod/callback/balance';
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedPlayerId, currency: 'ETB' })
      });
      const data = await res.json();
      if (res.ok) {
        setPingStatus(prev => ({ ...prev, [env]: `Online (Balance: ${data.balance} ETB)` }));
      } else {
        setPingStatus(prev => ({ ...prev, [env]: `Response HTTP ${res.status}` }));
      }
    } catch (err: any) {
      setPingStatus(prev => ({ ...prev, [env]: `Error: ${err.message}` }));
    }
  };

  const runSimulation = async (testType: 'balance' | 'evolution_bet' | 'jackpot_win' | 'rollback' | 'full_cycle') => {
    setIsRunningTest(true);
    setTestError('');
    setTestResponse(null);

    try {
      const res = await fetch('/api/integrations/softswiss/simulate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          testType: testType,
          customAmount: testAmount
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Test execution failed');
      }

      setTestResponse(data);

      // Refresh system state to reflect any simulated balance updates
      try {
        const stateRes = await fetch('/api/state');
        const stateData = await stateRes.json();
        if (stateData.success && stateData.state) {
          onStateUpdate(stateData.state);
        }
      } catch (e) {
        console.warn('Could not sync local state after test', e);
      }
    } catch (err: any) {
      setTestError(err.message || 'Simulation encountered an error');
    } finally {
      setIsRunningTest(false);
    }
  };

  const selectedPlayer = players.find(p => p.id === selectedPlayerId) || players[0];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-500/30 p-5 rounded-2xl relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>SoftSwiss (S7S) Game Aggregator 2.0 Integration</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
              Single-API Seamless Wallet Hub
            </h2>
            <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl">
              Equipped with high-precision String Decimal math (18-digit integer & 12-digit fraction), strictly omitted <code className="text-amber-400 bg-slate-950/60 px-1 py-0.5 rounded text-[11px]">wallet_id</code>, and isolated callback routers for test and production.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <div className="bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-lg">
              <span className="text-slate-500 text-[10px] uppercase block">Manager</span>
              <span className="text-slate-200 font-bold">Yuliya (S7S)</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-lg">
              <span className="text-slate-500 text-[10px] uppercase block">Target Market</span>
              <span className="text-cyan-400 font-bold">Ethiopia (ETB)</span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-lg">
              <span className="text-slate-500 text-[10px] uppercase block">Decimal Engine</span>
              <span className="text-emerald-400 font-bold">12 Decimals (BigInt)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Callback URLs & Fast Email Response */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: The 2 Required Callback URLs */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-indigo-400" />
                <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                  Requested Callback URLs (Stage & Prod)
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">
                2 Distinct Endpoints
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Yuliya requested two different callback URLs so SoftSwiss can provision both a sandbox test stage and live production environment.
            </p>

            {/* Stage Callback URL */}
            <div className="space-y-1.5 mb-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  1. Test / Stage Callback URL
                </label>
                {pingStatus.stage && (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/60">
                    {pingStatus.stage}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-2">
                <input 
                  type="text" 
                  readOnly 
                  value={stageCallbackUrl} 
                  className="bg-transparent text-slate-200 text-xs font-mono w-full focus:outline-none"
                />
                <button
                  onClick={() => handleCopy(stageCallbackUrl, setCopiedStage)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                  title="Copy Stage Callback URL"
                >
                  {copiedStage ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedStage ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => handlePingCallback('stage')}
                  className="px-2 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/40 rounded text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                  title="Ping endpoint"
                >
                  <RefreshCw size={12} className={pingStatus.stage === 'pinging' ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Production Callback URL */}
            <div className="space-y-1.5 mb-4">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  2. Production Callback URL
                </label>
                {pingStatus.prod && (
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/60">
                    {pingStatus.prod}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-2">
                <input 
                  type="text" 
                  readOnly 
                  value={prodCallbackUrl} 
                  className="bg-transparent text-slate-200 text-xs font-mono w-full focus:outline-none"
                />
                <button
                  onClick={() => handleCopy(prodCallbackUrl, setCopiedProd)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                  title="Copy Production Callback URL"
                >
                  {copiedProd ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedProd ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => handlePingCallback('prod')}
                  className="px-2 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/40 rounded text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                  title="Ping endpoint"
                >
                  <RefreshCw size={12} className={pingStatus.prod === 'pinging' ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Contact Email Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Send size={12} className="text-cyan-400" />
                Contact Email for Documentation & Confluence Access
              </label>
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-2">
                <input 
                  type="text" 
                  readOnly 
                  value={contactEmail} 
                  className="bg-transparent text-cyan-300 font-mono text-xs w-full focus:outline-none"
                />
                <button
                  onClick={() => handleCopy(contactEmail, setCopiedEmail)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                >
                  {copiedEmail ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-lg text-[11px] text-slate-400 font-mono flex items-start gap-2">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-200 font-bold">Automatic Action Router:</span> Both endpoints handle <code className="text-indigo-300">/play</code> (bets/wins), <code className="text-indigo-300">/rollback</code>, and <code className="text-indigo-300">/balance</code> inquiries with immediate idempotency verification.
            </div>
          </div>
        </div>

        {/* Card 2: 1-Click Copy Ready-to-Send Email to Yuliya */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-cyan-400" />
                <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                  Ready-to-Send Reply for Yuliya
                </h3>
              </div>
              <button
                onClick={() => handleCopy(emailReplyTemplate, setCopiedTemplate)}
                className="px-3 py-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                {copiedTemplate ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
                <span>{copiedTemplate ? 'Email Copied!' : 'Copy Reply Email'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              One-click response formatted with both callback URLs, contact email, and explicit confirmation of string decimal precision & launcher compliance:
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-slate-300 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
              {emailReplyTemplate}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Lock size={12} className="text-emerald-400" />
              Credentials stored in <code className="text-slate-300">.env</code> & <code className="text-slate-300">.env.example</code>
            </span>
            <span className="text-cyan-400 font-mono">Recipient: Yuliya</span>
          </div>
        </div>
      </div>

      {/* Card 3: Technical Specifications & Documentation Vault */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-amber-400" />
            <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
              Integration Documentation & Credentials Vault
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            SoftSwiss Technical Requirements Compliance
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Documentation Access & Credentials */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ExternalLink size={14} className="text-indigo-400" />
                Confluence Documentation & Keys
              </h4>
              <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded ${
                serverConfig?.credentials?.authTokenMasked ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-amber-950 text-amber-400 border border-amber-900'
              }`}>
                {serverConfig?.credentials?.authTokenMasked ? 'Configured' : 'Blank (In Code)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Access Game List, restricted territories, and portal API credentials.
            </p>
            <div className="bg-slate-900/60 p-2 rounded text-[11px] font-mono space-y-1.5 border border-slate-800/80">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Pop-up Login:</span>
                <span className="text-slate-200 font-bold">
                  {serverConfig?.documentation?.popupCredentials?.username 
                    ? `${serverConfig.documentation.popupCredentials.username} / ${serverConfig.documentation.popupCredentials.password}`
                    : <span className="text-amber-400 font-normal italic">[Blank - ready in code]</span>}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Page Login:</span>
                <span className="text-slate-200 font-bold">
                  {serverConfig?.documentation?.pageCredentials?.username 
                    ? `${serverConfig.documentation.pageCredentials.username} / ${serverConfig.documentation.pageCredentials.password}`
                    : <span className="text-amber-400 font-normal italic">[Blank - ready in code]</span>}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                <span className="text-slate-500">Casino ID:</span>
                <span className="text-cyan-400 font-bold">
                  {serverConfig?.credentials?.casinoId || <span className="text-amber-400 font-normal italic">[Blank - set in code]</span>}
                </span>
              </div>
            </div>
            <a 
              href="https://docs.softswiss.com/spaces/CASINOPUB/pages/31263340/GAME+AGGREGATOR" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-bold mt-1"
            >
              Open Confluence Documentation <ArrowRight size={12} />
            </a>
          </div>

          {/* Money Amount Specification */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Zap size={14} className="text-amber-400" />
                Money Amount String Standard
              </h4>
              <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-900">Passed</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Strictly passes amounts as strings without IEEE 754 precision loss.
            </p>
            <div className="bg-slate-900/60 p-2 rounded text-[11px] font-mono space-y-1 border border-slate-800/80">
              <div className="flex justify-between">
                <span className="text-slate-500">Integer Part:</span>
                <span className="text-slate-200">Up to 18 digits</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fractional Part:</span>
                <span className="text-emerald-400 font-bold">Up to 12 digits</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Evolution Currencies:</span>
                <span className="text-cyan-400 font-bold">6 Decimals</span>
              </div>
            </div>
            <a 
              href="https://docs.s7s.ai/game-aggregator/developer-portal/game-aggregator-api-2/overview#money-amount" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-bold mt-1"
            >
              View Money Amount Spec <ArrowRight size={12} />
            </a>
          </div>

          {/* Launcher Real Specification */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Play size={14} className="text-emerald-400" />
                Launcher_Real Parameter Rules
              </h4>
              <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-900">API 2.0</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Launch sessions mapped directly to SoftSwiss standard.
            </p>
            <div className="bg-slate-900/60 p-2 rounded text-[11px] font-mono space-y-1 border border-slate-800/80">
              <div className="flex justify-between">
                <span className="text-slate-500">'wallet_id':</span>
                <span className="text-rose-400 font-bold line-through">Omitted (No v1)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">'session_payload':</span>
                <span className="text-emerald-400 font-bold">Enabled</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Return & Deposit URLs:</span>
                <span className="text-slate-200 font-bold">Passed in 'urls'</span>
              </div>
            </div>
            <a 
              href="https://docs.s7s.ai/game-aggregator/developer-portal/game-aggregator-api-2/casino-api-reference/game-aggregator-api-for-casino#tag/Launcher/operation/Launcher_Real" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold mt-1"
            >
              View Launcher API Reference <ArrowRight size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Card 4: Live Seamless Wallet Test Bench & Certification Simulator */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Terminal size={18} className="text-emerald-400" />
              <h3 className="font-bold text-slate-200 uppercase text-xs tracking-wider">
                Live Seamless Wallet Test Bench & Decimal Simulator
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate exact S7S callback payloads against the live backend to verify 6-decimal Evolution bets, jackpot payouts, and rollbacks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              {players.map(p => (
                <option key={p.id} value={p.id}>
                  {p.displayName} ({p.balance.toLocaleString()} ETB)
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
              <span className="text-[10px] text-slate-500 font-mono">Amount:</span>
              <input
                type="text"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                className="bg-transparent text-xs font-mono text-cyan-300 w-24 focus:outline-none"
                placeholder="25.123456"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => runSimulation('balance')}
            disabled={isRunningTest}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={12} className={isRunningTest ? 'animate-spin' : ''} />
            Test /balance Inquiry
          </button>

          <button
            onClick={() => runSimulation('evolution_bet')}
            disabled={isRunningTest}
            className="px-3.5 py-2 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800/60 disabled:opacity-50 text-indigo-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Play size={12} />
            Test Evolution 6-Decimal Bet
          </button>

          <button
            onClick={() => runSimulation('jackpot_win')}
            disabled={isRunningTest}
            className="px-3.5 py-2 bg-amber-950 hover:bg-amber-900 border border-amber-800/60 disabled:opacity-50 text-amber-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Zap size={12} />
            Test Jackpot Win (8 Decimals)
          </button>

          <button
            onClick={() => runSimulation('rollback')}
            disabled={isRunningTest}
            className="px-3.5 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-800/60 disabled:opacity-50 text-rose-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={12} />
            Test Rollback
          </button>

          <button
            onClick={() => runSimulation('full_cycle')}
            disabled={isRunningTest}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold rounded-lg shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
          >
            <ShieldCheck size={14} />
            {isRunningTest ? 'Simulating Test Cycle...' : 'Run Full 4-Step S7S Test Suite'}
          </button>
        </div>

        {testError && (
          <div className="p-3 bg-red-950/60 border border-red-900/60 rounded-lg text-xs text-red-300 flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{testError}</span>
          </div>
        )}

        {/* Test Output Logs */}
        {testResponse && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                <CheckCircle2 size={14} />
                Simulation Passed • Latency: {testResponse.latencyMs}ms
              </span>
              {testResponse.summary && (
                <span className="text-slate-400">
                  {testResponse.summary.stringDecimalCompliance}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {testResponse.logs?.map((stepLog: any, idx: number) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{stepLog.step}</span>
                    <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      HTTP {stepLog.status}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-indigo-400">{stepLog.method}</div>
                  
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-500 block mb-1">Payload Sent:</span>
                      <pre className="text-slate-300 whitespace-pre-wrap overflow-x-auto max-h-24">
                        {JSON.stringify(stepLog.request, null, 2)}
                      </pre>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800/80">
                      <span className="text-slate-500 block mb-1">Callback Response:</span>
                      <pre className="text-emerald-300 whitespace-pre-wrap overflow-x-auto max-h-24">
                        {JSON.stringify(stepLog.response, null, 2)}
                      </pre>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 italic">
                    ✓ {stepLog.validation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
