import React, { useState, useEffect, useRef } from 'react';
import { SystemState, Game, Provider, BetLog } from '../types';
import { processBet, getSystemState, saveSystemState, submitCashRequest, updatePlayerPaymentDetails } from '../utils/db';
import { INITIAL_GAMES } from '../data/mockGames';
import { 
  Gamepad2, Search, Filter, Play, Award, DollarSign,
  AlertCircle, CheckCircle2, RefreshCw, X, ArrowRight, Zap, Trophy, Coins,
  ArrowDownLeft, ArrowUpRight, Wallet, Clock, CreditCard, Check, XCircle
} from 'lucide-react';

interface PlayerLobbyProps {
  state: SystemState;
  playerId: string;
  onStateUpdate: (newState: SystemState) => void;
}

export interface SportsMatch {
  id: string;
  sport: 'Football' | 'Basketball' | 'Tennis';
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeOdds: number;
  drawOdds: number;
  awayOdds: number;
  isThisWeek: boolean;
  scheduleInfo: string;
}

export const SPORTS_MATCHES: SportsMatch[] = [
  { id: 'm1', sport: 'Football', league: 'English Premier League', homeTeam: 'Chelsea FC', awayTeam: 'Manchester City', homeOdds: 1.95, drawOdds: 3.40, awayOdds: 2.10, isThisWeek: true, scheduleInfo: 'Today, 20:00' },
  { id: 'm2', sport: 'Football', league: 'Spanish La Liga', homeTeam: 'Real Madrid', awayTeam: 'FC Barcelona', homeOdds: 1.85, drawOdds: 3.60, awayOdds: 2.30, isThisWeek: true, scheduleInfo: 'Tomorrow, 21:00' },
  { id: 'm3', sport: 'Basketball', league: 'NBA Finals', homeTeam: 'Los Angeles Lakers', awayTeam: 'Golden State Warriors', homeOdds: 1.70, drawOdds: 8.50, awayOdds: 2.40, isThisWeek: true, scheduleInfo: 'Friday, 03:30' },
  { id: 'm4', sport: 'Football', league: 'UEFA Champions League', homeTeam: 'Liverpool FC', awayTeam: 'Arsenal FC', homeOdds: 2.05, drawOdds: 3.30, awayOdds: 2.25, isThisWeek: true, scheduleInfo: 'Saturday, 15:30' },
  { id: 'm5', sport: 'Basketball', league: 'NBA Eastern Conference', homeTeam: 'Boston Celtics', awayTeam: 'Miami Heat', homeOdds: 1.45, drawOdds: 9.00, awayOdds: 3.10, isThisWeek: true, scheduleInfo: 'Sunday, 19:00' },
  { id: 'm6', sport: 'Football', league: 'English Premier League', homeTeam: 'Manchester United', awayTeam: 'Tottenham Hotspur', homeOdds: 2.10, drawOdds: 3.50, awayOdds: 2.60, isThisWeek: false, scheduleInfo: 'Next Tuesday, 20:00' },
  { id: 'm7', sport: 'Football', league: 'German Bundesliga', homeTeam: 'Bayern Munich', awayTeam: 'Borussia Dortmund', homeOdds: 1.55, drawOdds: 4.20, awayOdds: 4.50, isThisWeek: false, scheduleInfo: 'Next Friday, 19:30' }
];

export default function PlayerLobby({ state, playerId, onStateUpdate }: PlayerLobbyProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedProvider, setSelectedProvider] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active game session
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [gameMode, setGameMode] = useState<'free' | 'simulated'>('simulated');
  const [ssoStep, setSsoStep] = useState<number>(0); // 0: closed, 1-3 SSO process, 4: ready
  const [betLogDetails, setBetLogDetails] = useState<BetLog | null>(null);

  // Mini-game states: slots
  const [slotBet, setSlotBet] = useState<number>(50);
  const [reels, setReels] = useState<string[]>(['🍒', '💎', '🔔']);
  const [slotSpinning, setSlotSpinning] = useState<boolean>(false);
  const [slotResult, setSlotResult] = useState<string>('');

  // Mini-game states: crash
  const [crashBet, setCrashBet] = useState<number>(50);
  const [crashMultiplier, setCrashMultiplier] = useState<number>(1.0);
  const [crashState, setCrashState] = useState<'idle' | 'running' | 'cashed_out' | 'crashed'>('idle');
  const crashPointRef = useRef<number>(1.0);
  const multiplierIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mini-game states: sports
  const [sportsBet, setSportsBet] = useState<number>(100);
  const [sportsMatches, setSportsMatches] = useState<SportsMatch[]>(SPORTS_MATCHES);
  const [isLoadingMatches, setIsLoadingMatches] = useState<boolean>(false);
  const [selectedMatch, setSelectedMatch] = useState<SportsMatch>(SPORTS_MATCHES[0]);
  const [selectedTeam, setSelectedTeam] = useState<'Home' | 'Draw' | 'Away'>('Home');
  const [sportsState, setSportsState] = useState<'idle' | 'simulating' | 'finished'>('idle');
  const [sportsTicker, setSportsTicker] = useState<string>('');
  const [sportsTab, setSportsTab] = useState<'this-week' | 'future'>('this-week');

  useEffect(() => {
    let active = true;
    setIsLoadingMatches(true);
    fetch('/api/realtime-games')
      .then(res => res.json())
      .then(data => {
        if (active && data.success && Array.isArray(data.games) && data.games.length > 0) {
          setSportsMatches(data.games);
          const thisWeekGames = data.games.filter((m: SportsMatch) => m.isThisWeek);
          if (thisWeekGames.length > 0) {
            setSelectedMatch(thisWeekGames[0]);
          } else {
            setSelectedMatch(data.games[0]);
          }
        }
      })
      .catch(err => {
        console.error("Failed to load realtime sports matches:", err);
      })
      .finally(() => {
        if (active) {
          setIsLoadingMatches(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // Mini-game states: Mines
  const [minesBet, setMinesBet] = useState<number>(50);
  const [minesGrid, setMinesGrid] = useState<('mine' | 'star' | null)[]>(Array(25).fill(null));
  const [minesRevealed, setMinesRevealed] = useState<boolean[]>(Array(25).fill(false));
  const [minesMultiplier, setMinesMultiplier] = useState<number>(1.0);
  const [minesActive, setMinesActive] = useState<boolean>(false);
  const [minesGameOver, setMinesGameOver] = useState<boolean>(false);
  const [minesWinState, setMinesWinState] = useState<'idle' | 'playing' | 'cashed_out' | 'exploded'>('idle');
  const [minesBombPositions, setMinesBombPositions] = useState<number[]>([]);
  const [minesCount, setMinesCount] = useState<number>(3);

  // Mini-game states: Blackjack
  const [bjBet, setBjBet] = useState<number>(50);
  const [bjState, setBjState] = useState<'idle' | 'player_turn' | 'dealer_turn' | 'finished'>('idle');
  const [bjPlayerHand, setBjPlayerHand] = useState<{name: string, suit: string, value: number}[]>([]);
  const [bjDealerHand, setBjDealerHand] = useState<{name: string, suit: string, value: number}[]>([]);
  const [bjResult, setBjResult] = useState<string>('');

  // Mini-game states: Roulette
  const [rouletteBet, setRouletteBet] = useState<number>(50);
  const [rouletteChoice, setRouletteChoice] = useState<string>('Red'); // Red, Black, Green, Even, Odd
  const [rouletteState, setRouletteState] = useState<'idle' | 'spinning' | 'finished'>('idle');
  const [rouletteNum, setRouletteNum] = useState<number | null>(null);
  const [rouletteColor, setRouletteColor] = useState<string | null>(null);
  const [rouletteChat, setRouletteChat] = useState<{user: string, text: string}[]>([
    { user: 'Elena (Evolution Dealer)', text: 'Welcome to the live lobby! Bets are open.' },
    { user: 'VIP_Slots_99', text: 'Red is hot right now guys!' },
    { user: 'James_R', text: 'Testing the gateway, latency looks solid.' }
  ]);
  const [newChatText, setNewChatText] = useState<string>('');

  const currentPlayer = state.accounts.find(a => a.id === playerId)!;
  const currentAgent = state.accounts.find(a => a.id === currentPlayer.parentId)!;

  // Cashier form states
  const [isCashierOpen, setIsCashierOpen] = useState<boolean>(false);
  const [requestType, setRequestType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [requestAmount, setRequestAmount] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>(currentAgent?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<string>('CBE');
  const [paymentDetails, setPaymentDetails] = useState<string>('');
  const [requestNotes, setRequestNotes] = useState<string>('');
  const [cashierSuccess, setCashierSuccess] = useState<string>('');
  const [cashierError, setCashierError] = useState<string>('');
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingRefValue, setEditingRefValue] = useState<string>('');

  const categories = ['All', 'Slots', 'Live Casino', 'Sportsbook', 'Crash Games', 'Table Games'];
  const providers = ['All', ...state.providers.filter(p => p.status === 'active').map(p => p.id)];

  // Filter games database
  const filteredGames = state.bets ? state.bets : []; // wait, no, INITIAL_GAMES

  const availableGames: Game[] = INITIAL_GAMES.filter((g: Game) => {
    // Check provider status in state
    const providerObj = state.providers.find(p => p.id === g.providerId);
    if (!providerObj || providerObj.status !== 'active') return false;

    const matchesCategory = selectedCategory === 'All' || g.category === selectedCategory;
    const matchesProvider = selectedProvider === 'All' || g.providerId === selectedProvider;
    const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          g.providerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesProvider && matchesSearch;
  });

  // Handler: Launch Game & SSO simulation
  const handleLaunchGame = (game: Game) => {
    setActiveGame(game);
    setGameMode('simulated');
    setSsoStep(1);
    setBetLogDetails(null);
    setSlotResult('');
    setCrashState('idle');
    setCrashMultiplier(1.0);
    setSportsState('idle');
    setSportsTicker('');

    // Simulate unified Single-API sign-on launch flow
    setTimeout(() => setSsoStep(2), 500);
    setTimeout(() => setSsoStep(3), 1000);
    setTimeout(() => setSsoStep(4), 1500);
  };

  const handleCloseGame = () => {
    setActiveGame(null);
    setSsoStep(0);
    // clean intervals
    if (multiplierIntervalRef.current) {
      clearInterval(multiplierIntervalRef.current);
    }
  };

  // MINI-GAME 1: SLOTS SPIN
  const handleSlotsSpin = () => {
    if (slotSpinning) return;
    if (currentPlayer.balance < slotBet) {
      alert('Insufficient wallet balance to place bet!');
      return;
    }

    setSlotSpinning(true);
    setSlotResult('');
    setBetLogDetails(null);

    const slotItems = ['🍒', '🍋', '🍇', '💎', '🔔', '7️⃣'];
    let ticks = 0;

    const spinInterval = setInterval(() => {
      setReels([
        slotItems[Math.floor(Math.random() * slotItems.length)],
        slotItems[Math.floor(Math.random() * slotItems.length)],
        slotItems[Math.floor(Math.random() * slotItems.length)],
      ]);
      ticks++;
      if (ticks >= 12) {
        clearInterval(spinInterval);
        
        // Compute final results
        const finalReels = [
          slotItems[Math.floor(Math.random() * slotItems.length)],
          slotItems[Math.floor(Math.random() * slotItems.length)],
          slotItems[Math.floor(Math.random() * slotItems.length)],
        ];
        
        // Ensure some win triggers for fun
        if (Math.random() < 0.40) {
          // Force a win combination
          const winIcon = slotItems[Math.floor(Math.random() * slotItems.length)];
          if (Math.random() < 0.15) {
            finalReels[0] = finalReels[1] = finalReels[2] = '7️⃣'; // jackpot!
          } else if (Math.random() < 0.3) {
            finalReels[0] = finalReels[1] = finalReels[2] = '💎';
          } else {
            const common = slotItems[Math.floor(Math.random() * 3)];
            finalReels[0] = finalReels[1] = finalReels[2] = common;
          }
        }

        setReels(finalReels);
        evaluateSlots(finalReels);
      }
    }, 100);
  };

  const evaluateSlots = (finalReels: string[]) => {
    const r1 = finalReels[0];
    const r2 = finalReels[1];
    const r3 = finalReels[2];

    let outcome: 'win' | 'lose' = 'lose';

    if (r1 === r2 && r2 === r3) {
      outcome = 'win';
      if (r1 === '7️⃣') {
        setSlotResult('777 JACKPOT! 50x Payout!');
      } else if (r1 === '💎') {
        setSlotResult('Mega Diamond Win! 15x Payout!');
      } else {
        setSlotResult(`Three of a Kind! 5x Payout!`);
      }
    } else if (r1 === r2 || r2 === r3 || r1 === r3) {
      outcome = 'win';
      setSlotResult('Double Match! 2x Payout!');
    } else {
      setSlotResult('No matches. Try spinning again!');
    }

    // Call background ledger database to process GGR and split override commissions
    const result = processBet(currentPlayer.id, activeGame!, slotBet, outcome);
    if (result.success && result.bet && result.state) {
      setBetLogDetails(result.bet);
      onStateUpdate(result.state);
    }
    setSlotSpinning(false);
  };

  // MINI-GAME 2: CRASH ROCKET
  const handleStartCrash = () => {
    if (currentPlayer.balance < crashBet) {
      alert('Insufficient wallet balance!');
      return;
    }
    setCrashState('running');
    setCrashMultiplier(1.0);
    setBetLogDetails(null);

    // Generate random crash point (1.05x to 7.0x GGR limits)
    const prob = Math.random();
    if (prob < 0.15) {
      crashPointRef.current = 1.05 + Math.random() * 0.1; // Instant crash
    } else if (prob < 0.6) {
      crashPointRef.current = 1.2 + Math.random() * 1.5;
    } else if (prob < 0.9) {
      crashPointRef.current = 2.5 + Math.random() * 2.5;
    } else {
      crashPointRef.current = 5.0 + Math.random() * 4.0; // High flight!
    }

    let currentMult = 1.0;
    multiplierIntervalRef.current = setInterval(() => {
      currentMult += 0.03 + (currentMult * 0.012); // accelerates over time
      currentMult = Math.round(currentMult * 100) / 100;

      if (currentMult >= crashPointRef.current) {
        // CRASHED!
        clearInterval(multiplierIntervalRef.current!);
        setCrashState('crashed');
        
        // Process lose bet on database
        const result = processBet(currentPlayer.id, activeGame!, crashBet, 'lose');
        if (result.success && result.bet && result.state) {
          setBetLogDetails(result.bet);
          onStateUpdate(result.state);
        }
      } else {
        setCrashMultiplier(currentMult);
      }
    }, 120);
  };

  const handleCrashCashout = () => {
    if (crashState !== 'running') return;
    clearInterval(multiplierIntervalRef.current!);
    setCrashState('cashed_out');

    // Force win processing on database with calculated payout multiplier
    const rawState = getSystemState();
    const playerObj = rawState.accounts.find((a: any) => a.id === currentPlayer.id);
    
    // Deduct bet and credit payout
    const result = processBet(currentPlayer.id, activeGame!, crashBet, 'win');
    if (result.success && result.bet && result.state) {
      // Manually overwrite payoutAmount in the logged bet record for visual consistency
      const payoutAmount = Math.round(crashBet * crashMultiplier * 100) / 100;
      const netGGR = crashBet - payoutAmount;

      // Adjust the actual player balance based on custom multiplier
      const stateCopy = { ...result.state };
      const playerIndex = stateCopy.accounts.findIndex(a => a.id === currentPlayer.id);
      
      // Since processBet did a standard slot multiplier, let's recalibrate the balances for accuracy!
      const playerAc = stateCopy.accounts[playerIndex];
      // Undo standard slot payout, add exact crash payout
      playerAc.balance = Math.round((playerAc.balance - result.bet.payoutAmount + payoutAmount) * 100) / 100;

      // Recalculate override shares for other nodes
      const agentAc = stateCopy.accounts.find(a => a.id === playerAc.parentId)!;
      const superAgentAc = stateCopy.accounts.find(a => a.id === agentAc.parentId)!;
      const adminAc = stateCopy.accounts.find(a => a.role === 'ADMIN')!;

      const agentPct = agentAc.commissionRate / 100;
      const superAgentPct = (superAgentAc.commissionRate - agentAc.commissionRate) / 100;
      const adminPct = (100 - superAgentAc.commissionRate) / 100;

      const agentShare = Math.round(netGGR * agentPct * 100) / 100;
      const superAgentShare = Math.round(netGGR * superAgentPct * 100) / 100;
      const adminShare = Math.round(netGGR * adminPct * 100) / 100;

      // Reset the balances
      agentAc.balance = Math.round((agentAc.balance - result.bet.agentShare + agentShare) * 100) / 100;
      superAgentAc.balance = Math.round((superAgentAc.balance - result.bet.superAgentShare + superAgentShare) * 100) / 100;
      adminAc.balance = Math.round((adminAc.balance - result.bet.adminShare + adminShare) * 100) / 100;

      // Adjust the logged bet
      const targetBet = stateCopy.bets.find(b => b.id === result.bet!.id)!;
      targetBet.payoutAmount = payoutAmount;
      targetBet.outcome = 'win';
      targetBet.adminShare = adminShare;
      targetBet.superAgentShare = superAgentShare;
      targetBet.agentShare = agentShare;

      saveSystemState(stateCopy);
      setBetLogDetails(targetBet);
      onStateUpdate(stateCopy);
    }
  };

  // MINI-GAME 3: SPORTS BOOK MATCH evaluation
  const handlePlaceSportsBet = () => {
    if (currentPlayer.balance < sportsBet) {
      alert('Insufficient wallet balance!');
      return;
    }
    setSportsState('simulating');
    setBetLogDetails(null);

    const footballUpdates = [
      `10' Stadium roaring! Pitch is wet, heavy tackling underway in ${selectedMatch.homeTeam} vs ${selectedMatch.awayTeam}.`,
      "32' Yellow Card for hard tackling in the penalty box!",
      "55' SPECTACULAR header attempt! Ball deflected off the crossbar!",
      "78' Rapid counter attack! Strikers racing down the left wing!",
      `90' FULL TIME! Referee blows the whistle for ${selectedMatch.homeTeam} vs ${selectedMatch.awayTeam}!`
    ];

    const basketballUpdates = [
      `1st Qtr: Fast-paced transition offense! Slam dunk in traffic in ${selectedMatch.homeTeam} vs ${selectedMatch.awayTeam}.`,
      "2nd Qtr: Steal and a fastbreak three-pointer! Arena is electrified!",
      "3rd Qtr: Technical foul called on the head coach! Momentum shifting!",
      "4th Qtr: Double-team on the star player! Clutch free throws locked in!",
      `BUZZER BEATER! Ball bounces off the rim and drops in! Game over for ${selectedMatch.homeTeam} vs ${selectedMatch.awayTeam}!`
    ];

    const matchUpdates = selectedMatch.sport === 'Football' ? footballUpdates : basketballUpdates;

    let i = 0;
    setSportsTicker(matchUpdates[0]);

    const tickerInterval = setInterval(() => {
      i++;
      if (i < matchUpdates.length) {
        setSportsTicker(matchUpdates[i]);
      } else {
        clearInterval(tickerInterval);
        
        // Resolve bet
        const winProbability = selectedTeam === 'Draw' 
          ? (selectedMatch.sport === 'Basketball' ? 0.05 : 0.22) 
          : 0.45;
        const outcome: 'win' | 'lose' = Math.random() < winProbability ? 'win' : 'lose';

        // Call database
        const result = processBet(currentPlayer.id, activeGame!, sportsBet, outcome);
        if (result.success && result.bet && result.state) {
          // Adjust GGR sports odds payout representation
          const stateCopy = { ...result.state };
          const targetBet = stateCopy.bets.find(b => b.id === result.bet!.id)!;
          
          if (outcome === 'win') {
            const odds = selectedTeam === 'Home' 
              ? selectedMatch.homeOdds 
              : selectedTeam === 'Draw' 
                ? selectedMatch.drawOdds 
                : selectedMatch.awayOdds;
            const customPayout = Math.round(sportsBet * odds * 100) / 100;
            const netGGR = sportsBet - customPayout;

            // Adjust balances
            const playerAc = stateCopy.accounts.find(a => a.id === currentPlayer.id)!;
            playerAc.balance = Math.round((playerAc.balance - targetBet.payoutAmount + customPayout) * 100) / 100;

            const agentAc = stateCopy.accounts.find(a => a.id === playerAc.parentId)!;
            const superAgentAc = stateCopy.accounts.find(a => a.id === agentAc.parentId)!;
            const adminAc = stateCopy.accounts.find(a => a.role === 'ADMIN')!;

            const agentPct = agentAc.commissionRate / 100;
            const superAgentPct = (superAgentAc.commissionRate - agentAc.commissionRate) / 100;
            const adminPct = (100 - superAgentAc.commissionRate) / 100;

            const agentShare = Math.round(netGGR * agentPct * 100) / 100;
            const superAgentShare = Math.round(netGGR * superAgentPct * 100) / 100;
            const adminShare = Math.round(netGGR * adminPct * 100) / 100;

            agentAc.balance = Math.round((agentAc.balance - targetBet.agentShare + agentShare) * 100) / 100;
            superAgentAc.balance = Math.round((superAgentAc.balance - targetBet.superAgentShare + superAgentShare) * 100) / 100;
            adminAc.balance = Math.round((adminAc.balance - targetBet.adminShare + adminShare) * 100) / 100;

            targetBet.payoutAmount = customPayout;
            targetBet.adminShare = adminShare;
            targetBet.superAgentShare = superAgentShare;
            targetBet.agentShare = agentShare;

            saveSystemState(stateCopy);
            setBetLogDetails(targetBet);
            onStateUpdate(stateCopy);
          } else {
            setBetLogDetails(targetBet);
            onStateUpdate(stateCopy);
          }

          setSportsState('finished');
        }
      }
    }, 900);
  };
  
  // ==========================================
  // MINI-GAME: MINES (CRASH SUBTYPE)
  // ==========================================
  const handleStartMines = () => {
    if (currentPlayer.balance < minesBet) {
      alert('Insufficient wallet balance!');
      return;
    }
    setMinesActive(true);
    setMinesGameOver(false);
    setMinesWinState('playing');
    setMinesMultiplier(1.0);
    setBetLogDetails(null);

    // Pick 3 random unique index locations for bombs out of 25
    const bombIndexes: number[] = [];
    while (bombIndexes.length < minesCount) {
      const rand = Math.floor(Math.random() * 25);
      if (!bombIndexes.includes(rand)) {
        bombIndexes.push(rand);
      }
    }
    setMinesBombPositions(bombIndexes);

    // Initialize grid
    setMinesGrid(Array(25).fill(null));
    setMinesRevealed(Array(25).fill(false));
  };

  const handleRevealMinesCell = (index: number) => {
    if (!minesActive || minesGameOver || minesRevealed[index]) return;

    const isBomb = minesBombPositions.includes(index);
    const newRevealed = [...minesRevealed];
    newRevealed[index] = true;
    setMinesRevealed(newRevealed);

    if (isBomb) {
      // Exploded!
      setMinesGameOver(true);
      setMinesActive(false);
      setMinesWinState('exploded');

      // Reveal all cells
      const explodedGrid = [...minesGrid];
      for (let i = 0; i < 25; i++) {
        if (minesBombPositions.includes(i)) {
          explodedGrid[i] = 'mine';
        } else {
          explodedGrid[i] = 'star';
        }
      }
      setMinesGrid(explodedGrid);
      setMinesRevealed(Array(25).fill(true));

      // Call database - standard loss
      const result = processBet(currentPlayer.id, activeGame!, minesBet, 'lose');
      if (result.success && result.bet && result.state) {
        setBetLogDetails(result.bet);
        onStateUpdate(result.state);
      }
    } else {
      // Star found!
      const updatedGrid = [...minesGrid];
      updatedGrid[index] = 'star';
      setMinesGrid(updatedGrid);

      const starsCount = newRevealed.filter((r, i) => r && !minesBombPositions.includes(i)).length;
      
      // Calculate multiplier
      const calculatedMult = parseFloat((1.0 + starsCount * 0.28 * (1.0 + (minesCount - 1) * 0.12)).toFixed(2));
      setMinesMultiplier(calculatedMult);

      // If all stars found, automatic cashout
      if (starsCount === (25 - minesCount)) {
        handleMinesCashoutWithMult(calculatedMult);
      }
    }
  };

  const handleMinesCashout = () => {
    if (!minesActive || minesGameOver || minesWinState !== 'playing') return;
    handleMinesCashoutWithMult(minesMultiplier);
  };

  const handleMinesCashoutWithMult = (finalMult: number) => {
    setMinesActive(false);
    setMinesGameOver(true);
    setMinesWinState('cashed_out');

    // Reveal all remaining cells safely
    const finalGrid = [...minesGrid];
    for (let i = 0; i < 25; i++) {
      if (minesBombPositions.includes(i)) {
        finalGrid[i] = 'mine';
      } else {
        finalGrid[i] = 'star';
      }
    }
    setMinesGrid(finalGrid);
    setMinesRevealed(Array(25).fill(true));

    // Process on database
    const result = processBet(currentPlayer.id, activeGame!, minesBet, 'win');
    if (result.success && result.bet && result.state) {
      const customPayout = Math.round(minesBet * finalMult * 100) / 100;
      const netGGR = minesBet - customPayout;

      const stateCopy = { ...result.state };
      const playerIndex = stateCopy.accounts.findIndex(a => a.id === currentPlayer.id);
      const playerAc = stateCopy.accounts[playerIndex];

      playerAc.balance = Math.round((playerAc.balance - result.bet.payoutAmount + customPayout) * 100) / 100;

      const agentAc = stateCopy.accounts.find(a => a.id === playerAc.parentId)!;
      const superAgentAc = stateCopy.accounts.find(a => a.id === agentAc.parentId)!;
      const adminAc = stateCopy.accounts.find(a => a.role === 'ADMIN')!;

      const agentPct = agentAc.commissionRate / 100;
      const superAgentPct = (superAgentAc.commissionRate - agentAc.commissionRate) / 100;
      const adminPct = (100 - superAgentAc.commissionRate) / 100;

      const agentShare = Math.round(netGGR * agentPct * 100) / 100;
      const superAgentShare = Math.round(netGGR * superAgentPct * 100) / 100;
      const adminShare = Math.round(netGGR * adminPct * 100) / 100;

      agentAc.balance = Math.round((agentAc.balance - result.bet.agentShare + agentShare) * 100) / 100;
      superAgentAc.balance = Math.round((superAgentAc.balance - result.bet.superAgentShare + superAgentShare) * 100) / 100;
      adminAc.balance = Math.round((adminAc.balance - result.bet.adminShare + adminShare) * 100) / 100;

      const targetBet = stateCopy.bets.find(b => b.id === result.bet!.id)!;
      targetBet.payoutAmount = customPayout;
      targetBet.outcome = 'win';
      targetBet.adminShare = adminShare;
      targetBet.superAgentShare = superAgentShare;
      targetBet.agentShare = agentShare;

      saveSystemState(stateCopy);
      setBetLogDetails(targetBet);
      onStateUpdate(stateCopy);
    }
  };

  // ==========================================
  // MINI-GAME: BLACKJACK (TABLE GAMES)
  // ==========================================
  const drawCard = () => {
    const suits = ['♠', '♥', '♦', '♣'];
    const cards = [
      { name: 'A', value: 11 },
      { name: '2', value: 2 },
      { name: '3', value: 3 },
      { name: '4', value: 4 },
      { name: '5', value: 5 },
      { name: '6', value: 6 },
      { name: '7', value: 7 },
      { name: '8', value: 8 },
      { name: '9', value: 9 },
      { name: '10', value: 10 },
      { name: 'J', value: 10 },
      { name: 'Q', value: 10 },
      { name: 'K', value: 10 }
    ];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const card = cards[Math.floor(Math.random() * cards.length)];
    return { name: card.name, suit, value: card.value };
  };

  const calculateScore = (hand: { name: string, suit: string, value: number }[]) => {
    let score = hand.reduce((acc, c) => acc + c.value, 0);
    let aces = hand.filter(c => c.name === 'A').length;
    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }
    return score;
  };

  const handleStartBJ = () => {
    if (currentPlayer.balance < bjBet) {
      alert('Insufficient wallet balance!');
      return;
    }
    setBetLogDetails(null);
    setBjResult('');

    const p1 = drawCard();
    const p2 = drawCard();
    const d1 = drawCard();
    const d2 = drawCard();

    const initialPlayerHand = [p1, p2];
    const initialDealerHand = [d1, d2];

    setBjPlayerHand(initialPlayerHand);
    setBjDealerHand(initialDealerHand);

    const pScore = calculateScore(initialPlayerHand);

    if (pScore === 21) {
      // Natural Blackjack win!
      setBjState('finished');
      setBjResult('BLACKJACK! Payout 2.5x!');
      resolveBJ('win', 2.5);
    } else {
      setBjState('player_turn');
    }
  };

  const handleBJHit = () => {
    if (bjState !== 'player_turn') return;

    const newCard = drawCard();
    const updatedHand = [...bjPlayerHand, newCard];
    setBjPlayerHand(updatedHand);

    const pScore = calculateScore(updatedHand);
    if (pScore > 21) {
      setBjState('finished');
      setBjResult('Bust! Dealer Wins.');
      resolveBJ('lose', 0);
    }
  };

  const handleBJStand = () => {
    if (bjState !== 'player_turn') return;

    setBjState('dealer_turn');
    let currentDealerHand = [...bjDealerHand];
    let dScore = calculateScore(currentDealerHand);

    // Dealer hits until 17
    while (dScore < 17) {
      currentDealerHand.push(drawCard());
      dScore = calculateScore(currentDealerHand);
    }

    setBjDealerHand(currentDealerHand);

    const pScore = calculateScore(bjPlayerHand);

    if (dScore > 21) {
      setBjResult('Dealer Bust! You Win! 2x Payout.');
      resolveBJ('win', 2.0);
    } else if (pScore > dScore) {
      setBjResult(`You Win! ${pScore} vs ${dScore}. 2x Payout.`);
      resolveBJ('win', 2.0);
    } else if (pScore < dScore) {
      setBjResult(`Dealer Wins. ${dScore} vs ${pScore}.`);
      resolveBJ('lose', 0);
    } else {
      setBjResult(`Push! Score is tied at ${pScore}. Bet refunded.`);
      resolveBJ('push', 1.0);
    }
    setBjState('finished');
  };

  const resolveBJ = (outcome: 'win' | 'lose' | 'push', customMult: number) => {
    const result = processBet(currentPlayer.id, activeGame!, bjBet, outcome === 'push' ? 'win' : outcome);
    if (result.success && result.bet && result.state) {
      const customPayout = Math.round(bjBet * customMult * 100) / 100;
      const netGGR = bjBet - customPayout;

      const stateCopy = { ...result.state };
      const playerIndex = stateCopy.accounts.findIndex(a => a.id === currentPlayer.id);
      const playerAc = stateCopy.accounts[playerIndex];

      playerAc.balance = Math.round((playerAc.balance - result.bet.payoutAmount + customPayout) * 100) / 100;

      const agentAc = stateCopy.accounts.find(a => a.id === playerAc.parentId)!;
      const superAgentAc = stateCopy.accounts.find(a => a.id === agentAc.parentId)!;
      const adminAc = stateCopy.accounts.find(a => a.role === 'ADMIN')!;

      const agentPct = agentAc.commissionRate / 100;
      const superAgentPct = (superAgentAc.commissionRate - agentAc.commissionRate) / 100;
      const adminPct = (100 - superAgentAc.commissionRate) / 100;

      const agentShare = Math.round(netGGR * agentPct * 100) / 100;
      const superAgentShare = Math.round(netGGR * superAgentPct * 100) / 100;
      const adminShare = Math.round(netGGR * adminPct * 100) / 100;

      agentAc.balance = Math.round((agentAc.balance - result.bet.agentShare + agentShare) * 100) / 100;
      superAgentAc.balance = Math.round((superAgentAc.balance - result.bet.superAgentShare + superAgentShare) * 100) / 100;
      adminAc.balance = Math.round((adminAc.balance - result.bet.adminShare + adminShare) * 100) / 100;

      const targetBet = stateCopy.bets.find(b => b.id === result.bet!.id)!;
      targetBet.payoutAmount = customPayout;
      targetBet.outcome = outcome === 'push' ? 'win' : outcome;
      targetBet.adminShare = adminShare;
      targetBet.superAgentShare = superAgentShare;
      targetBet.agentShare = agentShare;

      saveSystemState(stateCopy);
      setBetLogDetails(targetBet);
      onStateUpdate(stateCopy);
    }
  };

  // ==========================================
  // MINI-GAME: ROULETTE (LIVE CASINO)
  // ==========================================
  const handleSpinRoulette = () => {
    if (currentPlayer.balance < rouletteBet) {
      alert('Insufficient wallet balance!');
      return;
    }
    setRouletteState('spinning');
    setBetLogDetails(null);
    setRouletteNum(null);
    setRouletteColor(null);

    setTimeout(() => {
      setRouletteChat(prev => [...prev, { user: 'System', text: "Dealer is rolling the ivory ball..." }]);
    }, 600);

    setTimeout(() => {
      const winningNumber = Math.floor(Math.random() * 37); // 0-36
      const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
      const color = winningNumber === 0 ? 'green' : redNumbers.includes(winningNumber) ? 'red' : 'black';

      setRouletteNum(winningNumber);
      setRouletteColor(color);

      // Check win outcome
      let win = false;
      let multiplier = 0;

      if (rouletteChoice === 'Red' && color === 'red') {
        win = true;
        multiplier = 2.0;
      } else if (rouletteChoice === 'Black' && color === 'black') {
        win = true;
        multiplier = 2.0;
      } else if (rouletteChoice === 'Green' && color === 'green') {
        win = true;
        multiplier = 35.0;
      } else if (rouletteChoice === 'Even' && winningNumber !== 0 && winningNumber % 2 === 0) {
        win = true;
        multiplier = 2.0;
      } else if (rouletteChoice === 'Odd' && winningNumber % 2 !== 0) {
        win = true;
        multiplier = 2.0;
      }

      const outcome: 'win' | 'lose' = win ? 'win' : 'lose';
      setRouletteState('finished');

      const result = processBet(currentPlayer.id, activeGame!, rouletteBet, outcome);
      if (result.success && result.bet && result.state) {
        const customPayout = Math.round(rouletteBet * multiplier * 100) / 100;
        const netGGR = rouletteBet - customPayout;

        const stateCopy = { ...result.state };
        const playerIndex = stateCopy.accounts.findIndex(a => a.id === currentPlayer.id);
        const playerAc = stateCopy.accounts[playerIndex];

        playerAc.balance = Math.round((playerAc.balance - result.bet.payoutAmount + customPayout) * 100) / 100;

        const agentAc = stateCopy.accounts.find(a => a.id === playerAc.parentId)!;
        const superAgentAc = stateCopy.accounts.find(a => a.id === agentAc.parentId)!;
        const adminAc = stateCopy.accounts.find(a => a.role === 'ADMIN')!;

        const agentPct = agentAc.commissionRate / 100;
        const superAgentPct = (superAgentAc.commissionRate - agentAc.commissionRate) / 100;
        const adminPct = (100 - superAgentAc.commissionRate) / 100;

        const agentShare = Math.round(netGGR * agentPct * 100) / 100;
        const superAgentShare = Math.round(netGGR * superAgentPct * 100) / 100;
        const adminShare = Math.round(netGGR * adminPct * 100) / 100;

        agentAc.balance = Math.round((agentAc.balance - result.bet.agentShare + agentShare) * 100) / 100;
        superAgentAc.balance = Math.round((superAgentAc.balance - result.bet.superAgentShare + superAgentShare) * 100) / 100;
        adminAc.balance = Math.round((adminAc.balance - result.bet.adminShare + adminShare) * 100) / 100;

        const targetBet = stateCopy.bets.find(b => b.id === result.bet!.id)!;
        targetBet.payoutAmount = customPayout;
        targetBet.outcome = outcome;
        targetBet.adminShare = adminShare;
        targetBet.superAgentShare = superAgentShare;
        targetBet.agentShare = agentShare;

        saveSystemState(stateCopy);
        setBetLogDetails(targetBet);
        onStateUpdate(stateCopy);

        // Dealer feedback chat message
        const dealerCongs = outcome === 'win' 
          ? `Nice! Number ${winningNumber} (${color.toUpperCase()}) was rolled. You won $${customPayout}!` 
          : `Result is ${winningNumber} (${color.toUpperCase()}). Best of luck on the next spin!`;
        setRouletteChat(prev => [...prev, { user: 'Elena (Evolution Dealer)', text: dealerCongs }]);
      }
    }, 2000);
  };

  const handleSendRouletteChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatText.trim()) return;

    setRouletteChat(prev => [...prev, { user: currentPlayer.displayName + ' (You)', text: newChatText }]);
    const userMsg = newChatText;
    setNewChatText('');

    setTimeout(() => {
      const answers = [
        "Elena (Evolution Dealer): Interesting choice! Rolling next soon.",
        "Elena (Evolution Dealer): Good luck on this bet!",
        "VIP_Slots_99: Let's win together!"
      ];
      const randomAns = answers[Math.floor(Math.random() * answers.length)];
      const [usr, text] = randomAns.split(': ');
      setRouletteChat(prev => [...prev, { user: usr, text }]);
    }, 1200);
  };

  const handleSubmitCashRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setCashierError('');
    setCashierSuccess('');

    const amt = parseFloat(requestAmount);
    if (isNaN(amt) || amt <= 0) {
      setCashierError('Please enter a valid positive amount.');
      return;
    }

    if (requestType === 'withdrawal') {
      if (currentPlayer.balance < amt) {
        setCashierError(`Insufficient balance to request withdrawal. Available: $${currentPlayer.balance.toLocaleString()}`);
        return;
      }
      if (!paymentDetails.trim()) {
        setCashierError('Please provide your payout account details so the agent knows where to send your funds.');
        return;
      }
    }

    const finalPaymentDetails = requestType === 'deposit' ? '(Awaiting Transfer Reference)' : paymentDetails;

    try {
      const updatedState = submitCashRequest(
        currentPlayer.id,
        amt,
        requestType,
        paymentMethod,
        finalPaymentDetails,
        requestNotes
      );
      onStateUpdate(updatedState);
      setCashierSuccess(`Your ${requestType} request was submitted to the open pool! Any active agent can now accept/claim your transaction.`);
      // Reset form
      setRequestAmount('');
      setPaymentDetails('');
      setRequestNotes('');
    } catch (err: any) {
      setCashierError(err.message || 'Failed to submit request.');
    }
  };

  const handleSaveReference = (requestId: string) => {
    if (!editingRefValue.trim()) return;
    const result = updatePlayerPaymentDetails(requestId, editingRefValue, currentPlayer.id);
    if (result.success) {
      onStateUpdate(result.state);
      setEditingRequestId(null);
      setEditingRefValue('');
    } else {
      setCashierError(result.error || 'Failed to update transaction reference.');
    }
  };

  return (
    <div className="bg-slate-950 min-h-screen text-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Lobby Top Navigation Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Coins size={14} className="animate-bounce" />
              Unified API Player Terminal
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mt-1">
              Welcome, {currentPlayer.displayName}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Your seamless wallet is connected via Agent Club: <strong className="text-emerald-400">{currentAgent.displayName}</strong>
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-6 justify-between sm:justify-end">
            <div className="text-xs font-mono">
              <span className="text-slate-500 block uppercase font-bold text-[9px]">Seamless Casino Balance</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">
                ${currentPlayer.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-xs font-mono text-right">
              <span className="text-slate-500 block uppercase font-bold text-[9px]">API Session Route</span>
              <span className="text-slate-300 font-bold block truncate max-w-[150px]">
                {currentAgent.username} → Player
              </span>
            </div>
          </div>
        </div>

        {/* Unified Player Cashier Widget */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Wallet size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Unified Player Cashier
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  REQUEST DEPOSIT OR WITHDRAWAL FROM ANY CLUB AGENT
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setIsCashierOpen(!isCashierOpen)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Clock size={12} />
              {isCashierOpen ? 'Hide Cashier Form' : 'Open Cashier / View Requests'}
            </button>
          </div>

          {isCashierOpen && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4 border-t border-slate-800/60">
              
              {/* Form Column */}
              <div className="lg:col-span-1 bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
                  Create New Request
                </h4>

                {cashierError && (
                  <div className="bg-rose-950/40 border border-rose-900/40 text-rose-400 text-xs p-2.5 rounded-lg flex items-start gap-2">
                    <XCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{cashierError}</span>
                  </div>
                )}

                {cashierSuccess && (
                  <div className="bg-emerald-950/40 border border-emerald-900/40 text-emerald-400 text-xs p-2.5 rounded-lg flex items-start gap-2">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                    <span>{cashierSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitCashRequest} className="space-y-3.5 text-xs">
                  {/* Request Type Toggle */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Request Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setRequestType('deposit'); setCashierError(''); setCashierSuccess(''); }}
                        className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                          requestType === 'deposit'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <ArrowDownLeft size={13} />
                        Deposit
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRequestType('withdrawal'); setCashierError(''); setCashierSuccess(''); }}
                        className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all ${
                          requestType === 'withdrawal'
                            ? 'bg-rose-500 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <ArrowUpRight size={13} />
                        Withdrawal
                      </button>
                    </div>
                  </div>

                  {/* Select Agent Dropdown */}
                  {/* Shared Agent Pool Explanation */}
                  <div className="bg-slate-900 border border-slate-850 p-3 rounded-lg space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-amber-500 flex items-center gap-1 font-mono">
                      🌐 Shared Agent Pool Queue
                    </span>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Your request enters the shared agent network pool. The first available agent to accept/claim your request will process it. Once claimed, the agent's CBE account and contact phone number will be displayed below instantly!
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Amount ($)</label>
                    <div className="relative">
                      <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="number"
                        placeholder="0.00"
                        value={requestAmount}
                        onChange={(e) => setRequestAmount(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Payment Channel</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="CBE">Commercial Bank of Ethiopia (CBE)</option>
                      <option value="Telebirr">Telebirr Wallet</option>
                      <option value="Cash">In-Person Cash Handshake</option>
                      <option value="Bank">Other Bank Transfer</option>
                    </select>
                  </div>

                  {/* Payment Details */}
                  {requestType === 'withdrawal' ? (
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Your Account Details / Payout Destination</label>
                      <input
                        type="text"
                        placeholder={
                          paymentMethod === 'CBE' ? 'Enter CBE Bank Account number' :
                          paymentMethod === 'Telebirr' ? 'Enter Telebirr phone number' :
                          'Enter payment details or location...'
                        }
                        value={paymentDetails}
                        onChange={(e) => setPaymentDetails(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ) : (
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 space-y-1.5">
                      <span className="text-[9px] uppercase font-bold text-amber-500 font-mono block">
                        📝 Deposit Account & Info Flow
                      </span>
                      <p className="text-[10px] text-slate-400 leading-normal">
                        Submit the request amount first. Once any network agent accepts your request, their **CBE account details and phone number** will unlock in your list. You will then transfer the funds to them and enter your transfer reference code to complete the deposit!
                      </p>
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Internal Notes / Tx Receipt (Optional)</label>
                    <textarea
                      placeholder="Specify transaction hash or meeting notes..."
                      value={requestNotes}
                      onChange={(e) => setRequestNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      requestType === 'deposit'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    Submit {requestType.toUpperCase()} Request
                  </button>
                </form>
              </div>

              {/* Request Log History Column */}
              <div className="lg:col-span-2 bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
                    Request Log & Live Audit Status
                  </h4>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 font-mono">
                          <th className="py-2">Type</th>
                          <th className="py-2">Assigned Agent & Details</th>
                          <th className="py-2">Amount</th>
                          <th className="py-2">Method</th>
                          <th className="py-2">Your Details</th>
                          <th className="py-2">Status</th>
                          <th className="py-2 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {(!state.cashRequests || state.cashRequests.filter(r => r.playerId === currentPlayer.id).length === 0) ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-500 italic font-mono">
                              No cashier requests logged yet. Use the form to submit one.
                            </td>
                          </tr>
                        ) : (
                          state.cashRequests
                            .filter(r => r.playerId === currentPlayer.id)
                            .map((req) => (
                              <tr key={req.id} className="hover:bg-slate-900/40">
                                <td className="py-2.5 font-semibold">
                                  <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold ${
                                    req.type === 'deposit' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                                    'bg-rose-950 text-rose-400 border border-rose-900/30'
                                  }`}>
                                    {req.type.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-2.5 text-slate-300">
                                  {req.status === 'pending' ? (
                                    <span className="text-amber-400 font-mono text-[10px] bg-amber-950/25 px-2 py-0.5 rounded border border-amber-900/20 inline-block animate-pulse">
                                      ⌛ Open / Shared Pool
                                    </span>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className="font-semibold text-blue-400 flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                        {req.agentName}
                                      </div>
                                      {(req.status === 'claimed' || req.status === 'approved') && (
                                        <div className="text-[10px] bg-slate-900 p-1.5 rounded border border-slate-800/60 font-mono text-slate-400 space-y-0.5 max-w-[170px]">
                                          <div className="truncate">📞 {req.claimedByAgentPhone || 'N/A'}</div>
                                          <div className="truncate">🏦 CBE: {req.claimedByAgentCbe || 'N/A'}</div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 font-mono text-cyan-400 font-bold">${req.amount.toLocaleString()}</td>
                                <td className="py-2.5 text-slate-400 font-mono text-[10px]">{req.paymentMethod}</td>
                                <td className="py-2.5 max-w-[200px]">
                                  {editingRequestId === req.id ? (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        value={editingRefValue}
                                        onChange={(e) => setEditingRefValue(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100 font-mono focus:outline-none focus:border-emerald-500 w-32"
                                        placeholder="Enter reference / Tx ID"
                                      />
                                      <button
                                        onClick={() => handleSaveReference(req.id)}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-slate-950 p-1 rounded font-bold cursor-pointer shrink-0"
                                        title="Save reference"
                                      >
                                        <Check size={11} />
                                      </button>
                                      <button
                                        onClick={() => { setEditingRequestId(null); setEditingRefValue(''); }}
                                        className="bg-slate-800 hover:bg-slate-700 text-slate-400 p-1 rounded cursor-pointer shrink-0"
                                        title="Cancel"
                                      >
                                        <X size={11} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-1 items-start">
                                      <span className="text-slate-300 font-mono text-[11px] break-all block" title={req.paymentDetails}>
                                        {req.paymentDetails}
                                      </span>
                                      {req.status === 'claimed' && req.type === 'deposit' && (
                                        <button
                                          onClick={() => {
                                            setEditingRequestId(req.id);
                                            setEditingRefValue(req.paymentDetails === '(Awaiting Transfer Reference)' ? '' : req.paymentDetails);
                                          }}
                                          className="text-[9px] text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 cursor-pointer transition-all mt-1 font-mono uppercase"
                                        >
                                          ⚡ Submit Reference / ID
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5">
                                  <span className={`px-1.5 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                                    req.status === 'pending' ? 'bg-amber-950 text-amber-400 border border-amber-900/30' :
                                    req.status === 'claimed' ? 'bg-blue-950 text-blue-400 border border-blue-900/30 animate-pulse' :
                                    req.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' :
                                    'bg-rose-950 text-rose-400 border border-rose-900/30'
                                  }`}>
                                    {req.status.toUpperCase()}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right font-mono text-slate-500 text-[10px]">
                                  {new Date(req.timestamp).toLocaleDateString()}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 font-mono leading-relaxed pt-4 border-t border-slate-800/60 mt-4">
                  💡 <strong>Agent-Intermediary Accounting:</strong> When you submit a request, the chosen Agent gets notified in real-time. Upon approval, their system ledger balance shifts to credit yours, and tiered commissions split instantly.
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Filters Controls Box */}
        <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl flex flex-wrap gap-4 items-center justify-between">
          {/* Category tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pr-2 max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar & Provider filter */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search slots, sports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 w-full sm:w-48"
              />
            </div>

            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-xs rounded-lg px-2 py-1.5 text-slate-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="All">All Providers</option>
              {providers.filter(p => p !== 'All').map(provId => (
                <option key={provId} value={provId}>
                  {state.providers.find(p => p.id === provId)?.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Available games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {availableGames.map((game) => (
            <div
              key={game.id}
              className="bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden group flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-300 relative shadow-lg hover:shadow-emerald-950/20"
            >
              <div className="space-y-3">
                {/* Visual Header with gradient background */}
                <div className={`h-28 bg-gradient-to-tr ${game.gradient} p-4 flex flex-col justify-between relative`}>
                  {/* Subtle noise effect */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.45)_100%)] opacity-70" />
                  
                  <span className="z-10 bg-slate-950/70 border border-slate-800/40 px-2.5 py-1 rounded-full text-[9px] uppercase font-bold tracking-wider text-slate-200 self-start font-mono">
                    {game.providerName}
                  </span>

                  <div className="z-10 text-white font-extrabold text-base tracking-tight leading-snug drop-shadow-sm font-sans truncate pr-4">
                    {game.title}
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-4 space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-800/50 pb-1.5 text-slate-400">
                    <span>Category:</span>
                    <strong className="text-slate-200 font-semibold">{game.category}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/50 pb-1.5 text-slate-400 font-mono text-[11px]">
                    <span>RTP Rating:</span>
                    <strong className="text-emerald-400">{game.rtp}% GGR</strong>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Volatility:</span>
                    <strong className={`font-bold ${
                      game.volatility === 'High' ? 'text-rose-400' :
                      game.volatility === 'Medium' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {game.volatility}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Launcher overlay panel */}
              <div className="p-4 pt-0">
                <button
                  id={`btn-launch-${game.id}`}
                  onClick={() => handleLaunchGame(game)}
                  className="w-full py-2 bg-slate-950 hover:bg-emerald-500 border border-slate-800 hover:border-emerald-400 text-slate-300 hover:text-slate-950 text-xs font-bold rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 group-hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  <Play size={12} className="fill-current" />
                  Launch Game
                </button>
              </div>
            </div>
          ))}

          {availableGames.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              <Gamepad2 size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">No aggregated game endpoints active</p>
              <p className="text-xs text-slate-600 mt-1">Configure active API routers or adjust your filters.</p>
            </div>
          )}
        </div>

        {/* Unified SSO Integration Side Guide Panel */}
        <div className="bg-slate-900/30 border border-slate-800 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1">
              <Zap size={13} className="text-emerald-400" />
              Unified Seamless Wallet API
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Our aggregator routes player balances in real-time. Instead of transfer-in and transfer-out wallets, our <strong>Seamless API</strong> queries the Agent Club node dynamically whenever a player clicks 'Spin' or places a 'Slip'.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1">
              <Trophy size={13} className="text-cyan-400" />
              Multi-Tier Accounting
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every bet immediately fires a secure backchannel webhook. The player net GGR is split based on commission margins (Admin 15% • Super Agent 15% • Agent 70%) adjusting down-line books on the fly.
            </p>
          </div>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Aggregator Endpoint Status</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 py-1.5 font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Secure Gateway Connected
            </div>
            <p className="text-[10px] text-slate-500 font-mono leading-none">
              Latency: ~42ms • Webhook response status: 200 OK
            </p>
          </div>
        </div>

        {/* ACTIVE GAME WINDOW / MODAL POP-UP */}
        {activeGame && (
          <div id="game-modal" className="fixed inset-0 bg-slate-950/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden max-w-4xl w-full max-h-[90vh] flex flex-col justify-between relative shadow-2xl">
              
              {/* Header */}
              <div className="bg-slate-950 px-5 py-4 border-b border-slate-800/80 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${ssoStep === 4 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <div>
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                      {activeGame.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Integrated API Stream • {activeGame.providerName}
                    </p>
                  </div>
                </div>

                <button
                  id="btn-close-game"
                  onClick={handleCloseGame}
                  className="text-slate-400 hover:text-slate-100 p-1.5 rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* SSO Loader Simulation */}
              {ssoStep < 4 && (
                <div className="p-16 flex flex-col items-center justify-center text-center space-y-4">
                  <RefreshCw size={36} className="text-emerald-400 animate-spin" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-200">
                      {ssoStep === 1 ? 'Authenticating single integration token...' :
                       ssoStep === 2 ? 'Verifying seamless player balance authorization...' :
                       'Routing game assets websocket handshakes...'}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      Callback parameters: playerId={currentPlayer.username} sessionId=nx_token_{currentPlayer.id.slice(-6)}
                    </p>
                  </div>
                </div>
              )}

              {/* Main Game Interface Container */}
              {ssoStep === 4 && (
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                  
                  {/* Left columns (Game canvas) */}
                  <div className="md:col-span-2 p-6 flex flex-col justify-between min-h-[400px]">
                    
                      <>
                        {/* SLOTS CATEGORY PLAYABLE */}
                        {activeGame.category === 'Slots' && (
                          <div className="space-y-6 flex-1 flex flex-col justify-between">
                            <div className="text-center space-y-1">
                              <span className="text-[10px] font-bold text-fuchsia-400 tracking-wider uppercase bg-fuchsia-500/10 px-2 py-0.5 rounded-full">
                                🎰 Premium High-RTP Seamless Slot
                              </span>
                              <h4 className="text-base font-black text-white tracking-tight">Mika Casino Fruits Slot</h4>
                              <p className="text-xs text-slate-400">Match 3 items or match any double to collect payout!</p>
                            </div>

                            {/* Elegant Slot Cabinet */}
                            <div className="bg-slate-950 p-6 rounded-3xl border-4 border-fuchsia-600/30 shadow-[0_0_25px_rgba(217,70,239,0.15)] relative max-w-md mx-auto w-full">
                              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-slate-950 px-4 py-1 text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg">
                                LUCKY SPIN
                              </div>

                              <div className="grid grid-cols-3 gap-4 py-4 px-2 bg-slate-900 rounded-2xl border border-slate-800">
                                {reels.map((icon, index) => (
                                  <div
                                    key={index}
                                    className={`h-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-2 rounded-2xl flex items-center justify-center text-4xl shadow-2xl transition-all duration-150 ${
                                      slotSpinning 
                                        ? 'border-fuchsia-500/80 animate-pulse scale-95' 
                                        : 'border-slate-800 hover:border-slate-700'
                                    }`}
                                  >
                                    <span className={slotSpinning ? 'blur-[1px] transform scale-110' : ''}>
                                      {icon}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {slotResult && (
                                <div className="mt-4 text-center py-2 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl animate-bounce">
                                  <span className={`text-xs font-black uppercase tracking-wider ${slotResult.includes('No matches') ? 'text-slate-400' : 'text-fuchsia-400'}`}>
                                    {slotResult}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Bet actions */}
                            <div className="space-y-4 pt-4 border-t border-slate-800/60">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-bold">Specify Bet Amount</span>
                                <div className="flex gap-1.5">
                                  {[10, 50, 100, 500].map((val) => (
                                    <button
                                      key={val}
                                      onClick={() => setSlotBet(val)}
                                      disabled={slotSpinning}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                                        slotBet === val 
                                          ? 'bg-fuchsia-600 text-white font-extrabold scale-105 shadow-md shadow-fuchsia-600/30' 
                                          : 'bg-slate-850 text-slate-300 hover:bg-slate-800'
                                      }`}
                                    >
                                      ${val}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <button
                                id="btn-spin-slots"
                                onClick={handleSlotsSpin}
                                disabled={slotSpinning}
                                className="w-full py-3 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-extrabold rounded-xl uppercase tracking-widest text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <RefreshCw size={14} className={slotSpinning ? 'animate-spin' : ''} />
                                {slotSpinning ? 'SPINNING REELS...' : 'PULL LEVER & SPIN'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* TABLE GAMES CATEGORY - INTERACTIVE BLACKJACK */}
                        {activeGame.category === 'Table Games' && (
                          <div className="space-y-6 flex-1 flex flex-col justify-between">
                            <div className="text-center space-y-1">
                              <span className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                🃏 Real-Time 3D Card Engine
                              </span>
                              <h4 className="text-base font-black text-white tracking-tight">Classic Blackjack Touch</h4>
                              <p className="text-xs text-slate-400">Aim for 21. Dealer stands on 17. Natural pays 2.5x!</p>
                            </div>

                            {/* Casino Green Felt Table */}
                            <div className="bg-gradient-to-b from-emerald-950 to-teal-950 p-5 rounded-3xl border-4 border-emerald-700/40 shadow-[0_0_30px_rgba(16,185,129,0.1)] relative max-w-md mx-auto w-full min-h-[200px] flex flex-col justify-between space-y-4">
                              {/* Dealer Hand */}
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] text-emerald-300 uppercase tracking-widest font-black">
                                  <span>Dealer Hand</span>
                                  <span className="font-mono bg-emerald-900/60 px-1.5 py-0.5 rounded text-white">
                                    Score: {bjState === 'player_turn' ? '?' : calculateScore(bjDealerHand)}
                                  </span>
                                </div>
                                <div className="flex gap-2.5 justify-center">
                                  {bjDealerHand.map((c, idx) => (
                                    <div
                                      key={idx}
                                      className={`w-12 h-16 rounded-lg bg-white text-slate-900 flex flex-col justify-between p-1 shadow-xl font-bold transition-transform ${
                                        bjState === 'player_turn' && idx === 1 ? 'bg-gradient-to-br from-indigo-800 to-indigo-950 border border-indigo-400' : ''
                                      }`}
                                    >
                                      {bjState === 'player_turn' && idx === 1 ? (
                                        <div className="flex-1 flex items-center justify-center text-white text-[10px] font-mono">♠</div>
                                      ) : (
                                        <>
                                          <span className={`text-[10px] leading-none ${c.suit === '♦' || c.suit === '♥' ? 'text-red-600' : 'text-slate-900'}`}>{c.name}</span>
                                          <span className={`text-xl text-center self-center -mt-1 ${c.suit === '♦' || c.suit === '♥' ? 'text-red-600' : 'text-slate-900'}`}>{c.suit}</span>
                                          <span className={`text-[10px] leading-none text-right self-end ${c.suit === '♦' || c.suit === '♥' ? 'text-red-600' : 'text-slate-900'}`}>{c.name}</span>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                  {bjDealerHand.length === 0 && (
                                    <div className="text-xs text-emerald-400 font-mono italic">Waiting for bets...</div>
                                  )}
                                </div>
                              </div>

                              {/* Player Hand */}
                              <div className="space-y-1.5 border-t border-emerald-800/30 pt-3">
                                <div className="flex justify-between items-center text-[10px] text-emerald-300 uppercase tracking-widest font-black">
                                  <span>Your Hand</span>
                                  <span className="font-mono bg-emerald-900/60 px-1.5 py-0.5 rounded text-white font-bold">
                                    Score: {calculateScore(bjPlayerHand)}
                                  </span>
                                </div>
                                <div className="flex gap-2.5 justify-center">
                                  {bjPlayerHand.map((c, idx) => (
                                    <div
                                      key={idx}
                                      className="w-12 h-16 rounded-lg bg-white text-slate-900 flex flex-col justify-between p-1 shadow-xl font-bold animate-bounce"
                                    >
                                      <span className={`text-[10px] leading-none ${c.suit === '♦' || c.suit === '♥' ? 'text-red-600' : 'text-slate-900'}`}>{c.name}</span>
                                      <span className={`text-xl text-center self-center -mt-1 ${c.suit === '♦' || c.suit === '♥' ? 'text-red-600' : 'text-slate-900'}`}>{c.suit}</span>
                                      <span className={`text-[10px] leading-none text-right self-end ${c.suit === '♦' || c.suit === '♥' ? 'text-red-600' : 'text-slate-900'}`}>{c.name}</span>
                                    </div>
                                  ))}
                                  {bjPlayerHand.length === 0 && (
                                    <div className="text-xs text-emerald-400 font-mono italic">Place bet to deal cards!</div>
                                  )}
                                </div>
                              </div>

                              {bjResult && (
                                <div className="bg-slate-950/95 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-center text-xs font-bold text-emerald-300">
                                  {bjResult}
                                </div>
                              )}
                            </div>

                            {/* Bet actions */}
                            <div className="space-y-4 pt-4 border-t border-slate-800/60">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-bold">Specify Bet Amount</span>
                                <div className="flex gap-1.5">
                                  {[10, 50, 100, 500].map((val) => (
                                    <button
                                      key={val}
                                      onClick={() => setBjBet(val)}
                                      disabled={bjState === 'player_turn'}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                                        bjBet === val 
                                          ? 'bg-emerald-600 text-white font-extrabold scale-105 shadow-md shadow-emerald-600/30' 
                                          : 'bg-slate-850 text-slate-300 hover:bg-slate-800'
                                      }`}
                                    >
                                      ${val}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {bjState === 'player_turn' ? (
                                <div className="grid grid-cols-2 gap-3">
                                  <button
                                    onClick={handleBJHit}
                                    className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl uppercase tracking-wider text-xs transition-all cursor-pointer"
                                  >
                                    Hit Card
                                  </button>
                                  <button
                                    onClick={handleBJStand}
                                    className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl uppercase tracking-wider text-xs transition-all cursor-pointer"
                                  >
                                    Stand
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={handleStartBJ}
                                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl uppercase tracking-widest text-xs shadow-lg transition-all cursor-pointer"
                                >
                                  Deal Blackjack Hand
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* CRASH CATEGORY PLAYABLE */}
                        {activeGame.category === 'Crash Games' && (
                          <div className="space-y-6 flex-1 flex flex-col justify-between">
                            {activeGame.id.includes('mines') ? (
                              <>
                                <div className="text-center space-y-1">
                                  <span className="text-[10px] font-bold text-blue-400 tracking-wider uppercase bg-blue-500/10 px-2 py-0.5 rounded-full">
                                    💣 Mines Interactive Field
                                  </span>
                                  <h4 className="text-base font-black text-white tracking-tight">Mika Mines Gold Miner</h4>
                                  <p className="text-xs text-slate-400">Avoid the {minesCount} hidden bombs. Cash out with any star!</p>
                                </div>

                                {/* Mines board */}
                                <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800/80 max-w-xs mx-auto w-full">
                                  <div className="grid grid-cols-5 gap-2">
                                    {minesGrid.map((cell, idx) => {
                                      const isRevealed = minesRevealed[idx];
                                      return (
                                        <button
                                          key={idx}
                                          onClick={() => handleRevealMinesCell(idx)}
                                          disabled={!minesActive || minesGameOver || isRevealed}
                                          className={`h-11 w-full rounded-xl flex items-center justify-center text-lg font-bold transition-all transform hover:scale-105 active:scale-95 cursor-pointer border ${
                                            isRevealed
                                              ? cell === 'mine'
                                                ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse'
                                                : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                                              : minesActive
                                                ? 'bg-slate-900 border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-500'
                                                : 'bg-slate-900/60 border-slate-900 text-slate-700 cursor-not-allowed'
                                          }`}
                                        >
                                          {isRevealed ? (
                                            cell === 'mine' ? '💣' : '⭐'
                                          ) : (
                                            '?'
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>

                                  {minesWinState !== 'idle' && (
                                    <div className="mt-3 text-center">
                                      {minesWinState === 'playing' && (
                                        <span className="text-xs text-blue-400 font-black tracking-widest animate-pulse font-mono block">
                                          MULTIPLIER: {minesMultiplier.toFixed(2)}x
                                        </span>
                                      )}
                                      {minesWinState === 'exploded' && (
                                        <span className="text-xs text-rose-500 font-black tracking-widest font-mono block animate-bounce">
                                          💥 BOOM! BOMB TRIGGERED!
                                        </span>
                                      )}
                                      {minesWinState === 'cashed_out' && (
                                        <span className="text-xs text-emerald-400 font-black tracking-widest font-mono block animate-bounce">
                                          💰 SECURED CASH OUT! {minesMultiplier.toFixed(2)}x
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Action Controls */}
                                <div className="space-y-4 pt-4 border-t border-slate-800/60">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-bold">Specify Mines Bet</span>
                                    <div className="flex gap-1.5">
                                      {[10, 50, 100].map((val) => (
                                        <button
                                          key={val}
                                          onClick={() => setMinesBet(val)}
                                          disabled={minesActive && !minesGameOver}
                                          className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                                            minesBet === val 
                                              ? 'bg-blue-500 text-slate-950 font-extrabold scale-105' 
                                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                          }`}
                                        >
                                          ${val}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {minesActive && !minesGameOver ? (
                                    <button
                                      onClick={handleMinesCashout}
                                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black rounded-xl uppercase tracking-widest text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                    >
                                      CASH OUT • ${(minesBet * minesMultiplier).toFixed(2)}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={handleStartMines}
                                      className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold rounded-xl uppercase tracking-widest text-xs shadow-lg transition-all cursor-pointer"
                                    >
                                      Start Mines Game
                                    </button>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-center space-y-1">
                                  <span className="text-[10px] font-bold text-amber-400 tracking-wider uppercase bg-amber-500/10 px-2 py-0.5 rounded-full">
                                    ✈️ Spribe Instant Aviator API
                                  </span>
                                  <h4 className="text-base font-black text-white tracking-tight">Aviator Multiplier Jet</h4>
                                  <p className="text-xs text-slate-400">Cash out before the jet takes off to lock in multiplier!</p>
                                </div>

                                {/* Interactive Flight Box with Curved Path */}
                                <div className="bg-slate-950 rounded-3xl h-44 border border-slate-800/80 flex items-center justify-center relative overflow-hidden p-4 shadow-inner">
                                  <div className="absolute inset-0 bg-[linear-gradient(rgba(245,158,11,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(245,158,11,0.05)_1px,transparent_1px)] bg-[size:16px_16px]" />

                                  {crashState === 'idle' && (
                                    <div className="text-center space-y-2 z-10 animate-pulse">
                                      <span className="text-5xl block">✈️</span>
                                      <span className="text-xs text-amber-400/80 font-mono uppercase tracking-widest font-black">READY FOR TAKEOFF</span>
                                    </div>
                                  )}

                                  {crashState === 'running' && (
                                    <div className="absolute inset-0 flex flex-col justify-between p-4 z-10">
                                      <div className="text-right text-[9px] font-mono text-slate-500 bg-slate-900/60 self-end px-2 py-0.5 rounded-full">
                                        ALTITUDE SPEED ACCELERATION ACTIVE
                                      </div>
                                      
                                      <div className="absolute inset-x-4 bottom-8 top-12">
                                        <svg className="w-full h-full overflow-visible">
                                          <path
                                            d={`M 0,100 Q 120,80 ${Math.min(200 + crashMultiplier * 15, 300)},${Math.max(100 - crashMultiplier * 12, 15)}`}
                                            fill="none"
                                            stroke="rgba(245, 158, 11, 0.6)"
                                            strokeWidth="3"
                                            strokeDasharray="4 2"
                                            className="animate-pulse"
                                          />
                                          <g transform={`translate(${Math.min(190 + crashMultiplier * 15, 290)}, ${Math.max(100 - crashMultiplier * 12, 15)}) rotate(-20)`}>
                                            <text fontSize="24">✈️</text>
                                          </g>
                                        </svg>
                                      </div>

                                      <div className="text-center mx-auto space-y-1">
                                        <div className="text-5xl font-black text-amber-400 font-mono tracking-tighter animate-pulse drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                                          {crashMultiplier.toFixed(2)}x
                                        </div>
                                        <span className="text-[10px] font-mono text-amber-500/80 block uppercase tracking-widest font-bold">Jet ascending...</span>
                                      </div>
                                    </div>
                                  )}

                                  {crashState === 'cashed_out' && (
                                    <div className="text-center z-10 space-y-2">
                                      <span className="text-5xl block animate-bounce">💰</span>
                                      <div className="text-lg font-black text-emerald-400 uppercase tracking-wider">
                                        CASHED OUT AT <strong className="font-mono text-2xl text-emerald-300">{crashMultiplier.toFixed(2)}x</strong>
                                      </div>
                                      <span className="text-[10px] font-mono text-slate-500 block">Payout processed instantly</span>
                                    </div>
                                  )}

                                  {crashState === 'crashed' && (
                                    <div className="text-center z-10 space-y-2">
                                      <span className="text-5xl block">💥</span>
                                      <div className="text-xl font-black text-rose-500 tracking-wider uppercase">
                                        FLEW AWAY AT {crashMultiplier.toFixed(2)}x
                                      </div>
                                      <span className="text-[10px] font-mono text-slate-500 block">Round concluded</span>
                                    </div>
                                  )}
                                </div>

                                {/* Action Controls */}
                                <div className="space-y-4 pt-4 border-t border-slate-800/60">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400 font-bold">Specify Bet Amount</span>
                                    <div className="flex gap-1.5">
                                      {[10, 50, 100].map((val) => (
                                        <button
                                          key={val}
                                          onClick={() => setCrashBet(val)}
                                          disabled={crashState === 'running'}
                                          className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                                            crashBet === val ? 'bg-amber-400 text-slate-950 font-extrabold scale-105' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                          }`}
                                        >
                                          ${val}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {crashState !== 'running' ? (
                                    <button
                                      id="btn-start-crash"
                                      onClick={handleStartCrash}
                                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold rounded-xl uppercase tracking-widest text-xs shadow-lg transition-all cursor-pointer"
                                    >
                                      Place Bet & Take Off
                                    </button>
                                  ) : (
                                    <button
                                      id="btn-cashout-crash"
                                      onClick={handleCrashCashout}
                                      className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black rounded-xl uppercase tracking-widest text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                    >
                                      CASH OUT • ${(crashBet * crashMultiplier).toFixed(2)}
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}

                        {/* LIVE CASINO CATEGORY - WHEEL & CHAT BOARD */}
                        {activeGame.category === 'Live Casino' && (
                          <div className="space-y-6 flex-1 flex flex-col justify-between">
                            <div className="text-center space-y-1">
                              <span className="text-[10px] font-bold text-rose-400 tracking-wider uppercase bg-rose-500/10 px-2 py-0.5 rounded-full">
                                🎥 Evolution HD Live Dealer Stream
                              </span>
                              <h4 className="text-base font-black text-white tracking-tight">Lightning Roulette Live</h4>
                              <p className="text-xs text-slate-400">Place your chips on any color or odd/even lines!</p>
                            </div>

                            {/* Live Wheel & Interactive Chat Room Splits */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* 1. Roulette Wheel Canvas representation */}
                              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col items-center justify-between min-h-[170px]">
                                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">LIVE WHEEL SPIN</div>
                                
                                {rouletteState === 'spinning' ? (
                                  <div className="text-center py-4">
                                    <div className="w-12 h-12 rounded-full border-4 border-dashed border-rose-500 animate-spin mx-auto mb-2" />
                                    <span className="text-xs text-rose-400 font-black tracking-widest animate-pulse font-mono uppercase">SPINNING...</span>
                                  </div>
                                ) : (
                                  <div className="text-center space-y-2 py-2">
                                    {rouletteNum !== null ? (
                                      <div className="flex flex-col items-center gap-1">
                                        <span className="text-[10px] text-slate-400">Winning Ball Stopped:</span>
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black shadow-lg text-white border-2 border-slate-700 animate-bounce ${
                                          rouletteColor === 'red' ? 'bg-red-600' : rouletteColor === 'black' ? 'bg-slate-900' : 'bg-emerald-600'
                                        }`}>
                                          {rouletteNum}
                                        </div>
                                        <span className="text-[10px] font-bold uppercase font-mono text-slate-400">{rouletteColor} Win</span>
                                      </div>
                                    ) : (
                                      <div className="flex flex-col items-center gap-2">
                                        <span className="text-3xl">🎡</span>
                                        <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">WHEEL IS READY</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="text-center text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  GGR API STATUS: SEAMLESS LIVE FEED
                                </div>
                              </div>

                              {/* 2. Interactive Chat Room representation */}
                              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col justify-between h-[170px]">
                                <div className="text-[9px] text-slate-400 border-b border-slate-900 pb-1.5 flex justify-between items-center font-mono">
                                  <span>Lobby Chat Feed</span>
                                  <span className="text-emerald-400 flex items-center gap-1 font-bold">
                                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
                                    4.2k active
                                  </span>
                                </div>

                                {/* Chats list */}
                                <div className="flex-1 overflow-y-auto space-y-1.5 py-1.5 pr-1 text-[10px] scrollbar-none max-h-[90px]">
                                  {rouletteChat.map((chat, idx) => (
                                    <div key={idx} className="leading-relaxed">
                                      <strong className={`font-bold ${
                                        chat.user.includes('Elena') 
                                          ? 'text-rose-400' 
                                          : chat.user.includes('You') 
                                            ? 'text-cyan-400' 
                                            : 'text-amber-400'
                                      }`}>
                                        {chat.user}:
                                      </strong>{' '}
                                      <span className="text-slate-300">{chat.text}</span>
                                    </div>
                                  ))}
                                </div>

                                {/* Chat sender */}
                                <div className="flex gap-1.5 border-t border-slate-900 pt-1.5">
                                  <input
                                    type="text"
                                    placeholder="Type message..."
                                    value={newChatText}
                                    onChange={(e) => setNewChatText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendRouletteChat(e as any)}
                                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-200 focus:outline-none focus:border-rose-500"
                                  />
                                  <button
                                    onClick={(e) => handleSendRouletteChat(e as any)}
                                    className="px-2 bg-rose-600 hover:bg-rose-500 text-slate-950 font-bold rounded-lg text-[9px] uppercase transition-all cursor-pointer"
                                  >
                                    Send
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Bet board choices and spin */}
                            <div className="space-y-4 pt-4 border-t border-slate-800/60">
                              <div className="grid grid-cols-2 gap-4">
                                {/* Choice select */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Select Bet Line</label>
                                  <div className="grid grid-cols-5 gap-1">
                                    {['Red', 'Black', 'Green', 'Even', 'Odd'].map((choice) => (
                                      <button
                                        key={choice}
                                        onClick={() => setRouletteChoice(choice)}
                                        disabled={rouletteState === 'spinning'}
                                        className={`py-1 text-[9px] font-extrabold rounded border transition-all ${
                                          rouletteChoice === choice 
                                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/40' 
                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                        }`}
                                      >
                                        {choice === 'Green' ? '0' : choice}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Stake selection */}
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Specify Stake</label>
                                  <div className="flex gap-1">
                                    {[10, 50, 100].map((val) => (
                                      <button
                                        key={val}
                                        onClick={() => setRouletteBet(val)}
                                        disabled={rouletteState === 'spinning'}
                                        className={`flex-1 py-1 text-[10px] font-mono font-black border rounded transition-all ${
                                          rouletteBet === val 
                                            ? 'bg-rose-600 border-rose-500 text-white font-black' 
                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                                        }`}
                                      >
                                        ${val}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <button
                                id="btn-spin-roulette"
                                onClick={handleSpinRoulette}
                                disabled={rouletteState === 'spinning'}
                                className="w-full py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-slate-950 font-black rounded-xl uppercase tracking-widest text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <RefreshCw size={14} className={rouletteState === 'spinning' ? 'animate-spin' : ''} />
                                {rouletteState === 'spinning' ? 'SPINNING IVORY BALL...' : 'Place Bet & Spin Roulette'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* SPORTSBOOK PLAYABLE */}
                        {activeGame.category === 'Sportsbook' && (
                          <div className="space-y-6 flex-1 flex flex-col justify-between">
                            <div className="text-center space-y-1">
                              <span className="text-[10px] font-bold text-cyan-400 tracking-wider uppercase bg-cyan-500/10 px-2 py-0.5 rounded-full">
                                ⚽ Sportradar Live Stream Tracker
                              </span>
                              <h4 className="text-base font-black text-white tracking-tight">EPL / NBA Live Sportsbook</h4>
                              <p className="text-xs text-slate-400">Match lines update continuously. Placing bet settling immediately!</p>
                            </div>

                            {/* Mini Sport Visualizer Radar */}
                            <div className="bg-slate-950 rounded-3xl p-5 border border-slate-800/80 space-y-4">
                              {sportsState === 'idle' && (
                                <div className="space-y-4">
                                  {/* Sports Duration Tabs */}
                                  <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 gap-1">
                                    <button
                                      onClick={() => setSportsTab('this-week')}
                                      className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                        sportsTab === 'this-week'
                                          ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.1)]'
                                          : 'text-slate-500 hover:text-slate-300 border border-transparent'
                                      }`}
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                      This Week's Live
                                    </button>
                                    <button
                                      onClick={() => setSportsTab('future')}
                                      className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                        sportsTab === 'future'
                                          ? 'bg-slate-900 text-slate-300 border border-slate-800'
                                          : 'text-slate-500 hover:text-slate-400 border border-transparent'
                                      }`}
                                    >
                                      🔒 Future Fixtures
                                    </button>
                                  </div>

                                  {/* Dynamic Production Match Selector */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                                        {sportsTab === 'this-week' ? "Choose Live Production Event" : "Upcoming Scheduled Events"}
                                      </label>
                                      {sportsTab === 'this-week' ? (
                                        <span className="text-[9px] bg-emerald-950/50 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">
                                          AVAILABLE FOR BETTING
                                        </span>
                                      ) : (
                                        <span className="text-[9px] bg-red-950/40 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded font-mono font-bold">
                                          LOCKED
                                        </span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                                      {isLoadingMatches ? (
                                        <div className="flex flex-col items-center justify-center py-6 space-y-2 bg-slate-900/40 rounded-xl border border-slate-800/80">
                                          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                          <span className="text-[10px] font-mono text-slate-400">Syncing live sport feeds...</span>
                                        </div>
                                      ) : (
                                        sportsMatches.filter(m => sportsTab === 'this-week' ? m.isThisWeek : !m.isThisWeek).map((match) => (
                                          <button
                                            key={match.id}
                                            disabled={!match.isThisWeek}
                                            onClick={() => {
                                              setSelectedMatch(match);
                                              setSelectedTeam('Home');
                                            }}
                                            className={`px-3 py-2 text-left rounded-xl border text-xs flex justify-between items-center transition-all ${
                                              !match.isThisWeek
                                                ? 'bg-slate-950/40 border-slate-900/60 text-slate-600 cursor-not-allowed opacity-50'
                                                : selectedMatch && selectedMatch.id === match.id
                                                  ? 'bg-cyan-950/40 border-cyan-500 text-white font-bold shadow-[0_0_10px_rgba(6,182,212,0.15)] cursor-pointer'
                                                  : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700 cursor-pointer'
                                            }`}
                                          >
                                          <div className="flex flex-col">
                                            <div className="flex items-center gap-1">
                                              <span className="text-[9px] uppercase font-mono tracking-wide text-cyan-400">{match.league}</span>
                                              {match.isThisWeek && (
                                                <span className="text-[8px] bg-cyan-950/80 text-cyan-400 px-1 rounded font-bold uppercase">This Week</span>
                                              )}
                                            </div>
                                            <span className="font-bold text-slate-200 mt-0.5">{match.homeTeam} vs {match.awayTeam}</span>
                                            <span className="text-[9px] text-slate-500 mt-0.5 font-mono">{match.scheduleInfo}</span>
                                          </div>
                                          <span className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded font-mono text-slate-500">
                                            {match.sport === 'Football' ? '⚽' : '🏀'}
                                          </span>
                                        </button>
                                      )))}
                                    </div>
                                  </div>

                                  {/* Odds Betting Lines block */}
                                  <div className="space-y-3 pt-2.5 border-t border-slate-900">
                                    <div className="text-xs font-black text-slate-300 uppercase tracking-wider text-center">
                                      {selectedMatch.homeTeam} <span className="text-slate-500 font-normal">vs</span> {selectedMatch.awayTeam}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                      {(['Home', 'Draw', 'Away'] as const).map((team) => {
                                        const label = team === 'Home' ? selectedMatch.homeTeam : team === 'Away' ? selectedMatch.awayTeam : 'Draw';
                                        const odds = team === 'Home' ? selectedMatch.homeOdds : team === 'Away' ? selectedMatch.awayOdds : selectedMatch.drawOdds;
                                        return (
                                          <button
                                            key={team}
                                            onClick={() => setSelectedTeam(team)}
                                            className={`py-2 px-1 text-[11px] font-black rounded-lg border transition-all text-center flex flex-col justify-center items-center gap-0.5 cursor-pointer ${
                                              selectedTeam === team 
                                                ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/40 scale-102 font-extrabold shadow-sm' 
                                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                            }`}
                                          >
                                            <span className="truncate max-w-[80px] text-[9px] uppercase font-medium">{label}</span>
                                            <span className="font-mono text-cyan-400">({odds.toFixed(2)})</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {sportsState === 'simulating' && (
                                <div className="space-y-4 text-center py-4">
                                  <div className="relative h-20 bg-slate-900 rounded-xl border border-slate-800 flex flex-col justify-center items-center overflow-hidden px-4">
                                    <div className="absolute left-0 top-0 bottom-0 bg-cyan-500/10 animate-pulse w-[40%]" />
                                    <RefreshCw size={20} className="text-cyan-400 animate-spin mb-1.5" />
                                    <div className="text-xs font-mono text-cyan-400 font-bold animate-pulse text-center leading-normal max-w-sm">
                                      {sportsTicker}
                                    </div>
                                  </div>
                                  <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500 block">Live Sportradar feed handshake</span>
                                </div>
                              )}

                              {sportsState === 'finished' && (
                                <div className="text-center py-6 space-y-3">
                                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
                                    <CheckCircle2 size={20} className="text-emerald-400" />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-xs font-black text-slate-100">
                                      MATCHDAY RESOLVED SUCCESSFULLY
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-relaxed">GGR settlement parsed through secure Single-API callback nodes.</p>
                                  </div>
                                  <button
                                    onClick={() => setSportsState('idle')}
                                    className="px-4 py-1.5 bg-slate-900 hover:bg-slate-850 text-[10px] text-cyan-400 uppercase font-black tracking-wider border border-slate-800 rounded-lg transition-all"
                                  >
                                    Place New Slip
                                  </button>
                                </div>
                              )}

                              <div className="flex justify-between items-center pt-2 border-t border-slate-900 text-[9px] font-mono text-slate-500">
                                <span>Risk: Automated Live Settlement</span>
                                <span>Callback Status: Secure</span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-4 pt-4 border-t border-slate-800/60">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-400 font-bold">Specify Slip Stake</span>
                                <div className="flex gap-1.5">
                                  {[50, 100, 500].map((val) => (
                                    <button
                                      key={val}
                                      onClick={() => setSportsBet(val)}
                                      disabled={sportsState === 'simulating'}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                                        sportsBet === val 
                                          ? 'bg-cyan-500 text-slate-950 font-black scale-105 shadow-md shadow-cyan-500/30' 
                                          : 'bg-slate-850 text-slate-300 hover:bg-slate-800'
                                      }`}
                                    >
                                      ${val}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <button
                                id="btn-place-sports"
                                onClick={handlePlaceSportsBet}
                                disabled={sportsState === 'simulating'}
                                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-extrabold rounded-xl uppercase tracking-widest text-xs shadow-lg transition-all cursor-pointer"
                              >
                                Place Sports Slip Bet
                              </button>
                            </div>
                          </div>
                        )}
                      </>

                  </div>

                  {/* Right Column: Webhook Log Console */}
                  <div className="p-5 bg-slate-950/60 flex flex-col justify-between min-h-[350px]">
                    <div className="space-y-4 flex-1">
                      <div className="border-b border-slate-800 pb-2.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider block">Realtime Debug Console</span>
                        <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mt-0.5">
                          Single-API Webhook Auditor
                        </h4>
                      </div>

                      {/* Display outcomes */}
                      {betLogDetails ? (
                        <div className="space-y-3 text-xs">
                          <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex justify-between font-mono text-[10px]">
                              <span className="text-slate-500">Transaction ID:</span>
                              <span className="text-slate-400">{betLogDetails.id.slice(0, 15)}...</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Bet Placed:</span>
                              <strong className="text-slate-200 font-mono">${betLogDetails.betAmount}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Payout Claim:</span>
                              <strong className="text-emerald-400 font-mono">${betLogDetails.payoutAmount}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Outcome Code:</span>
                              <span className={`font-mono font-bold uppercase ${
                                betLogDetails.outcome === 'win' ? 'text-emerald-400' : 'text-rose-400'
                              }`}>
                                {betLogDetails.outcome}
                              </span>
                            </div>
                          </div>

                          {/* Commission split details representation */}
                          <div className="space-y-1.5 p-3 bg-slate-900/40 rounded-xl border border-slate-800/60">
                            <div className="text-[9px] font-mono text-slate-500 uppercase font-bold block mb-1">Downstream Royalty Splits</div>
                            <div className="flex justify-between text-[11px] font-mono border-b border-slate-900 pb-1">
                              <span className="text-slate-400">Club Agent Share (70%):</span>
                              <strong className={betLogDetails.agentShare >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                ${betLogDetails.agentShare.toFixed(2)}
                              </strong>
                            </div>
                            <div className="flex justify-between text-[11px] font-mono border-b border-slate-900 pb-1">
                              <span className="text-slate-400">Super Agent (15%):</span>
                              <strong className={betLogDetails.superAgentShare >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                ${betLogDetails.superAgentShare.toFixed(2)}
                              </strong>
                            </div>
                            <div className="flex justify-between text-[11px] font-mono">
                              <span className="text-slate-400">Admin Fee (15%):</span>
                              <strong className={betLogDetails.adminShare >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                ${betLogDetails.adminShare.toFixed(2)}
                              </strong>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-10 text-slate-600 text-xs">
                          <AlertCircle size={24} className="mx-auto opacity-30 mb-2" />
                          Place a bet to trigger a real-time signed webhook packet.
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 font-mono leading-relaxed space-y-1">
                      <p>• Seamless Webhook signed with HMAC-SHA256.</p>
                      <p>• Player wallet updated instantly inside database.</p>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
