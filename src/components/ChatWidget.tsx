import React, { useState, useEffect, useRef } from 'react';
import { SystemState, Account, ChatMessage, UserRole } from '../types';
import { sendChatMessage, markChatAsRead } from '../utils/db';
import { 
  MessageSquare, 
  Send, 
  X, 
  Bot, 
  User, 
  Globe, 
  Search, 
  Sparkles, 
  ChevronLeft,
  ShieldAlert,
  HelpCircle,
  TrendingUp,
  CreditCard,
  Check,
  CheckCheck
} from 'lucide-react';

interface ChatWidgetProps {
  state: SystemState;
  currentUser: Account;
  onStateUpdate: (newState: SystemState) => void;
}

export default function ChatWidget({ state, currentUser, onStateUpdate }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'global' | 'dms' | 'ai'>('global');
  const [activeDmContactId, setActiveDmContactId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const allMessages = state.chatMessages || [];

  // Determine conversation ID
  const getDmConversationId = (id1: string, id2: string) => {
    const sorted = [id1, id2].sort();
    return `dm_${sorted[0]}_${sorted[1]}`;
  };

  const currentConversationId = activeTab === 'global' 
    ? 'global' 
    : activeTab === 'ai' 
      ? `ai_support_${currentUser.id}` 
      : activeDmContactId 
        ? getDmConversationId(currentUser.id, activeDmContactId) 
        : null;

  // Auto scroll to bottom when messages update or tab changes
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      // Mark active conversation as read
      if (currentConversationId) {
        const updatedState = markChatAsRead(currentConversationId, currentUser.id);
        if (updatedState !== state) {
          onStateUpdate(updatedState);
        }
      }
    }
  }, [isOpen, activeTab, activeDmContactId, allMessages.length]);

  // Compute unread counts
  const unreadTotal = allMessages.filter(msg => {
    if (msg.senderId === currentUser.id || msg.read) return false;
    if (msg.conversationId === 'global') return true;
    if (msg.receiverId === currentUser.id) return true;
    return false;
  }).length;

  // Filter messages for current active view
  const currentMessages = allMessages.filter(msg => {
    if (!currentConversationId) return false;
    return msg.conversationId === currentConversationId;
  });

  // Role filter state for contacts
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'SUPER_AGENT' | 'AGENT' | 'PLAYER'>('ALL');

  // Hierarchy relationship detectors
  const myDirectAgent = currentUser.role === 'PLAYER'
    ? state.accounts.find(a => a.id === (currentUser.agentId || currentUser.parentId)) || state.accounts.find(a => a.role === 'AGENT')
    : currentUser.role === 'AGENT'
      ? state.accounts.find(a => a.id === currentUser.agentId) || state.accounts.find(a => a.role === 'AGENT')
      : null;

  const myDirectSuperAgent = currentUser.role === 'AGENT'
    ? state.accounts.find(a => a.id === (currentUser.superAgentId || currentUser.parentId)) || state.accounts.find(a => a.role === 'SUPER_AGENT')
    : null;

  const globalAdmin = state.accounts.find(a => a.role === 'ADMIN');

  // Filter contacts by search and role
  const availableContacts = state.accounts.filter(acc => {
    if (acc.id === currentUser.id) return false;
    if (roleFilter !== 'ALL' && acc.role !== roleFilter) return false;
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    return acc.displayName.toLowerCase().includes(q) || acc.username.toLowerCase().includes(q) || acc.role.toLowerCase().includes(q);
  });

  // Calculate relationship label
  const getRelationshipLabel = (contact: Account) => {
    if (currentUser.role === 'PLAYER' && (contact.id === currentUser.agentId || contact.id === currentUser.parentId)) return '⭐ Your Assigned Agent';
    if (currentUser.role === 'AGENT' && (contact.id === currentUser.superAgentId || contact.id === currentUser.parentId)) return '🛡️ Your Parent Super Agent';
    if (currentUser.role === 'AGENT' && contact.role === 'PLAYER' && (contact.agentId === currentUser.id || contact.parentId === currentUser.id)) return '🎮 Your Player';
    if (currentUser.role === 'SUPER_AGENT' && contact.role === 'AGENT' && (contact.superAgentId === currentUser.id || contact.parentId === currentUser.id)) return '🏢 Your Sub-Agent';
    if (currentUser.role === 'SUPER_AGENT' && contact.role === 'ADMIN') return '👑 Global Admin';
    if (currentUser.role === 'ADMIN' && contact.role === 'SUPER_AGENT') return '🏢 Master Super Agent';
    return null;
  };

  const getContactUnreadCount = (contactId: string) => {
    const convId = getDmConversationId(currentUser.id, contactId);
    return allMessages.filter(m => m.conversationId === convId && m.senderId === contactId && !m.read).length;
  };

  // Active contact details
  const activeContact = state.accounts.find(a => a.id === activeDmContactId);

  const handleSendMessage = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const messageContent = customText || inputText;
    if (!messageContent.trim()) return;

    if (!customText) setInputText('');

    if (activeTab === 'global') {
      const res = sendChatMessage({
        conversationId: 'global',
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        senderRole: currentUser.role,
        content: messageContent
      });
      onStateUpdate(res.state);
    } else if (activeTab === 'ai') {
      const convId = `ai_support_${currentUser.id}`;
      const res = sendChatMessage({
        conversationId: convId,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        senderRole: currentUser.role,
        receiverId: 'ai-assistant',
        receiverName: 'Mika AI Support',
        content: messageContent
      });
      onStateUpdate(res.state);

      // Trigger Gemini AI Support Response
      setIsAiThinking(true);
      try {
        const response = await fetch('/api/chat/ai-respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: messageContent,
            userRole: currentUser.role,
            userName: currentUser.displayName
          })
        });

        const data = await response.json();
        const aiReplyText = data.success && data.reply ? data.reply : "Hello! Mika AI Support is here to help with all your betting and agent questions.";
        
        const aiRes = sendChatMessage({
          conversationId: convId,
          senderId: 'ai-assistant',
          senderName: 'Mika AI Support',
          senderRole: 'AI_ASSISTANT',
          receiverId: currentUser.id,
          receiverName: currentUser.displayName,
          content: aiReplyText
        });
        onStateUpdate(aiRes.state);
      } catch (err) {
        console.error("AI chat error:", err);
      } finally {
        setIsAiThinking(false);
      }
    } else if (activeTab === 'dms' && activeDmContactId && activeContact) {
      const convId = getDmConversationId(currentUser.id, activeDmContactId);
      const res = sendChatMessage({
        conversationId: convId,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        senderRole: currentUser.role,
        receiverId: activeContact.id,
        receiverName: activeContact.displayName,
        content: messageContent
      });
      onStateUpdate(res.state);
    }
  };

  const getRoleBadgeStyle = (role: UserRole | 'SYSTEM' | 'AI_ASSISTANT') => {
    switch (role) {
      case 'ADMIN': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'SUPER_AGENT': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'AGENT': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'PLAYER': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'AI_ASSISTANT': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <>
      {/* Floating Toggle Icon */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-[90] p-3.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-full shadow-2xl shadow-cyan-500/20 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center group border border-cyan-400/30 cursor-pointer"
          title="Open Mika Live Chat"
        >
          <MessageSquare size={22} className="group-hover:rotate-12 transition-transform" />
          {unreadTotal > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white font-mono text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center ring-2 ring-slate-950 animate-bounce">
              {unreadTotal > 9 ? '9+' : unreadTotal}
            </span>
          )}
        </button>
      )}

      {/* Main Floating Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-[100] w-full max-w-[380px] sm:max-w-[420px] h-[550px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans backdrop-blur-md animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Top Header */}
          <div className="bg-slate-950/90 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white rounded-xl shadow-md">
                <MessageSquare size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5 uppercase tracking-wider">
                  Mika Network Chat
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  {currentUser.displayName} ({currentUser.role})
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-slate-950/50 border-b border-slate-800/80 p-1.5 flex gap-1">
            <button
              onClick={() => {
                setActiveTab('global');
                setActiveDmContactId(null);
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'global'
                  ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Globe size={13} />
              <span>Global</span>
            </button>

            <button
              onClick={() => setActiveTab('dms')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 relative cursor-pointer ${
                activeTab === 'dms'
                  ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <User size={13} />
              <span>Direct DMs</span>
              {allMessages.some(m => m.conversationId.startsWith('dm_') && m.senderId !== currentUser.id && !m.read) && (
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('ai');
                setActiveDmContactId(null);
              }}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Sparkles size={13} className="text-cyan-400" />
              <span>AI Support</span>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950/30 relative">

            {/* CASE 1: DMs Contact Selector list when no contact selected */}
            {activeTab === 'dms' && !activeDmContactId && (
              <div className="flex-1 flex flex-col p-3 overflow-hidden">
                {/* Direct Hierarchy Channels Quick Bar */}
                <div className="mb-3 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider font-mono flex items-center gap-1">
                    <Sparkles size={11} />
                    <span>Direct Hierarchy Channels</span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {/* PLAYER -> AGENT Channel */}
                    {(currentUser.role === 'PLAYER' || currentUser.role === 'AGENT') && myDirectAgent && (
                      <button
                        onClick={() => setActiveDmContactId(myDirectAgent.id)}
                        className="w-full p-2 bg-gradient-to-r from-blue-950/80 to-slate-900 border border-blue-500/30 hover:border-blue-400 text-left rounded-xl flex items-center justify-between transition-all group cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">💬</span>
                          <div>
                            <div className="text-xs font-bold text-blue-200 group-hover:text-cyan-300 flex items-center gap-1">
                              <span>Chat with Assigned Agent</span>
                              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-mono font-bold">
                                {myDirectAgent.displayName}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono">Deposits, Withdrawals & Support Desk</p>
                          </div>
                        </div>
                        <span className="text-xs text-blue-400 font-bold font-mono">→</span>
                      </button>
                    )}

                    {/* AGENT -> SUPER AGENT Channel */}
                    {currentUser.role === 'AGENT' && myDirectSuperAgent && (
                      <button
                        onClick={() => setActiveDmContactId(myDirectSuperAgent.id)}
                        className="w-full p-2 bg-gradient-to-r from-amber-950/80 to-slate-900 border border-amber-500/30 hover:border-amber-400 text-left rounded-xl flex items-center justify-between transition-all group cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">🛡️</span>
                          <div>
                            <div className="text-xs font-bold text-amber-200 group-hover:text-amber-300 flex items-center gap-1">
                              <span>Chat with Super Agent</span>
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono font-bold">
                                {myDirectSuperAgent.displayName}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono">Point Requests & Credit Line Support</p>
                          </div>
                        </div>
                        <span className="text-xs text-amber-400 font-bold font-mono">→</span>
                      </button>
                    )}

                    {/* SUPER AGENT / AGENT -> ADMIN Channel */}
                    {(currentUser.role === 'SUPER_AGENT' || currentUser.role === 'ADMIN') && globalAdmin && globalAdmin.id !== currentUser.id && (
                      <button
                        onClick={() => setActiveDmContactId(globalAdmin.id)}
                        className="w-full p-2 bg-gradient-to-r from-rose-950/80 to-slate-900 border border-rose-500/30 hover:border-rose-400 text-left rounded-xl flex items-center justify-between transition-all group cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">👑</span>
                          <div>
                            <div className="text-xs font-bold text-rose-200 group-hover:text-rose-300 flex items-center gap-1">
                              <span>Chat with Global Admin</span>
                              <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-mono font-bold">
                                {globalAdmin.displayName}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono">Master Payouts & Platform Oversight</p>
                          </div>
                        </div>
                        <span className="text-xs text-rose-400 font-bold font-mono">→</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Role Filter Pills */}
                <div className="flex items-center gap-1 mb-2 overflow-x-auto pb-1 scrollbar-none font-mono text-[9px]">
                  {(['ALL', 'ADMIN', 'SUPER_AGENT', 'AGENT', 'PLAYER'] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => setRoleFilter(role)}
                      className={`px-2 py-1 rounded-lg border font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                        roleFilter === role
                          ? 'bg-slate-800 text-cyan-400 border-cyan-500/50 shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {role === 'ALL' ? 'All Roles' : role.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search accounts or usernames..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                </div>

                <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 font-mono flex items-center justify-between">
                  <span>Network Accounts ({availableContacts.length})</span>
                  <span>Select to Chat</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {availableContacts.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 font-mono">
                      No matching user accounts found.
                    </div>
                  ) : (
                    availableContacts.map(contact => {
                      const unreadCount = getContactUnreadCount(contact.id);
                      const relationship = getRelationshipLabel(contact);

                      return (
                        <button
                          key={contact.id}
                          onClick={() => setActiveDmContactId(contact.id)}
                          className="w-full text-left p-2.5 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 rounded-xl flex items-center justify-between transition-all group cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 font-bold font-mono text-xs group-hover:border-cyan-500/40">
                              {contact.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                                  {contact.displayName}
                                </span>
                                <span className={`text-[8px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border ${getRoleBadgeStyle(contact.role)}`}>
                                  {contact.role.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-500 font-mono">@{contact.username}</span>
                                {relationship && (
                                  <span className="text-[9px] text-cyan-400 font-mono font-bold bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-800/40">
                                    {relationship}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {unreadCount > 0 && (
                            <span className="bg-rose-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {unreadCount}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* CASE 2: Active Conversation View (Global, AI, or specific DM contact) */}
            {(activeTab !== 'dms' || activeDmContactId) && (
              <>
                {/* DM Header banner with back button */}
                {activeTab === 'dms' && activeContact && (
                  <div className="bg-slate-900/90 border-b border-slate-800 px-3 py-2 flex items-center justify-between">
                    <button
                      onClick={() => setActiveDmContactId(null)}
                      className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <ChevronLeft size={16} />
                      <span>Back</span>
                    </button>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {getRelationshipLabel(activeContact) && (
                        <span className="text-[9px] text-cyan-300 font-mono font-bold bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-700/50">
                          {getRelationshipLabel(activeContact)}
                        </span>
                      )}
                      <span className="text-xs font-bold text-slate-200">{activeContact.displayName}</span>
                      <span className={`text-[8px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border ${getRoleBadgeStyle(activeContact.role)}`}>
                        {activeContact.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                )}

                {/* AI Header banner */}
                {activeTab === 'ai' && (
                  <div className="bg-cyan-950/30 border-b border-cyan-900/30 px-3 py-2 flex items-center justify-between text-xs font-mono text-cyan-400">
                    <span className="flex items-center gap-1.5">
                      <Bot size={14} className="animate-bounce" />
                      <strong>Mika AI Support Assistant</strong>
                    </span>
                    <span className="text-[10px] text-slate-400">Powered by Gemini</span>
                  </div>
                )}

                {/* Chat Message Scroll List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {currentMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-slate-500 font-mono">
                      {activeTab === 'ai' ? (
                        <>
                          <Bot size={32} className="text-cyan-500/40 mb-1" />
                          <p className="text-xs text-slate-300 font-bold">Ask Mika AI Support Anything!</p>
                          <p className="text-[11px] text-slate-400">Get instant answers on game rules, deposits, CBE numbers, or account settings.</p>
                          <div className="pt-2 flex flex-wrap gap-1.5 justify-center">
                            <button
                              onClick={() => handleSendMessage(undefined, "How do I deposit money via CBE or Telebirr?")}
                              className="text-[10px] bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 px-2 py-1 rounded-lg transition-all"
                            >
                              💡 Deposit Help
                            </button>
                            <button
                              onClick={() => handleSendMessage(undefined, "What games have the highest RTP?")}
                              className="text-[10px] bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 px-2 py-1 rounded-lg transition-all"
                            >
                              🎰 Highest RTP
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <MessageSquare size={28} className="text-slate-700 mb-1" />
                          <p className="text-xs text-slate-400">No messages yet in this conversation.</p>
                          <p className="text-[10px] text-slate-600">Send a greeting to start chatting!</p>
                        </>
                      )}
                    </div>
                  ) : (
                    currentMessages.map(msg => {
                      const isMe = msg.senderId === currentUser.id;
                      const isAi = msg.senderRole === 'AI_ASSISTANT';

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          {/* Sender Label */}
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[10px] font-bold text-slate-400 font-mono">
                              {isMe ? 'You' : msg.senderName}
                            </span>
                            <span className={`text-[8px] px-1 py-0.1 rounded font-mono font-bold uppercase border ${getRoleBadgeStyle(msg.senderRole)}`}>
                              {msg.senderRole.replace('_', ' ')}
                            </span>
                            <span className="text-[9px] text-slate-600 font-mono">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Message Bubble */}
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs font-sans shadow-sm leading-relaxed ${
                              isMe
                                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-tr-none'
                                : isAi
                                  ? 'bg-slate-900 border border-cyan-500/40 text-cyan-100 rounded-tl-none shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* AI Thinking Spinner */}
                  {isAiThinking && (
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono py-2 px-1">
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span>Mika AI is thinking...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Footer */}
                <form onSubmit={(e) => handleSendMessage(e)} className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={
                      activeTab === 'ai' 
                        ? 'Ask Mika AI Support...' 
                        : activeTab === 'global' 
                          ? 'Message Global Lounge...' 
                          : `Message ${activeContact?.displayName || 'User'}...`
                    }
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="p-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-500/10 cursor-pointer"
                  >
                    <Send size={15} />
                  </button>
                </form>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}
