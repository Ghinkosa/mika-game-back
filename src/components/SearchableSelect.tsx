import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check, ChevronDown, User, Phone, DollarSign } from 'lucide-react';
import { Account } from '../types';

interface SearchableSelectProps {
  items: Account[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  labelType: 'Player' | 'Agent' | 'Super Agent';
}

export default function SearchableSelect({
  items,
  value,
  onChange,
  placeholder,
  labelType,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedItem = items.find((item) => item.id === value);

  // Filter items based on search query
  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      item.id.toLowerCase().includes(q) ||
      (item.phoneNumber && item.phoneNumber.toLowerCase().includes(q)) ||
      item.username.toLowerCase().includes(q) ||
      item.displayName.toLowerCase().includes(q)
    );
  });

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full text-xs">
      {/* Trigger Button */}
      {selectedItem ? (
        // Selected Card State
        <div className="flex items-center justify-between bg-slate-900 border-2 border-emerald-500/50 rounded-lg p-3 text-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Check size={16} />
            </div>
            <div>
              <div className="font-semibold text-slate-100 flex items-center gap-1.5 flex-wrap">
                <span>{selectedItem.displayName}</span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Selected
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 flex-wrap mt-0.5">
                <span>@{selectedItem.username}</span>
                <span>•</span>
                <span>ID: <strong className="text-cyan-400">{selectedItem.id}</strong></span>
                {selectedItem.phoneNumber && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-0.5">
                      <Phone size={10} className="text-slate-500" />
                      {selectedItem.phoneNumber}
                    </span>
                  </>
                )}
              </div>
              <div className="text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-0.5 mt-1">
                <DollarSign size={11} className="text-cyan-500" />
                <span>Balance: ${selectedItem.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="px-2.5 py-1.5 text-[10px] font-bold uppercase text-rose-400 hover:text-rose-300 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 rounded transition-all cursor-pointer"
          >
            Change
          </button>
        </div>
      ) : (
        // Closed/Search input State
        <div className="relative">
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg px-3 py-2.5 flex items-center justify-between text-slate-400 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2">
              <Search size={14} className="text-slate-500" />
              <span className="text-slate-400">
                {placeholder || `Select ${labelType}...`}
              </span>
            </div>
            <ChevronDown size={14} className="text-slate-500" />
          </div>

          {/* Search Dropdown Panel */}
          {isOpen && (
            <div className="absolute left-0 right-0 mt-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col max-h-[320px]">
              {/* Internal Search bar */}
              <div className="p-2 border-b border-slate-800 bg-slate-950 flex items-center gap-2">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder={`Search ${labelType.toLowerCase()} by ID, phone, username, or name...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-slate-200 text-xs focus:outline-none placeholder-slate-500 font-medium py-1"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSearchQuery(''); }}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Items list */}
              <div className="overflow-y-auto divide-y divide-slate-800/40 flex-1">
                {filteredItems.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 italic">
                    No matching {labelType.toLowerCase()}s found.
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item.id)}
                      className="p-3 hover:bg-slate-800/50 cursor-pointer transition-all flex items-center justify-between text-left"
                    >
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <div className="font-semibold text-slate-200 truncate">
                          {item.displayName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">@{item.username}</span>
                          <span>•</span>
                          <span>ID: <strong className="text-blue-400 font-bold">{item.id}</strong></span>
                          {item.phoneNumber && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 truncate">
                                <Phone size={9} className="text-slate-500" />
                                {item.phoneNumber}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-mono font-bold text-cyan-400">
                          ${item.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono uppercase">
                          Balance
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
