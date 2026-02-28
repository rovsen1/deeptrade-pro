'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  Line,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  RefreshCw,
  Star,
  Settings,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  User,
  Bell,
  Send,
  Bot,
  BookOpen,
  BarChart3,
  Zap,
  AlertTriangle,
  CheckCircle,
  LogIn,
  LogOut,
  MessageSquare,
  Calculator,
  Target,
  Wallet,
  Percent,
  DollarSign,
  Layers,
  Flame,
  Trophy,
  Play,
} from 'lucide-react';
import TradeSystem from '@/components/TradeSystem';
import BacktestSystem from '@/components/BacktestSystem';

// Types
interface MarketData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  quoteVolume: number;
  highPrice: number;
  lowPrice: number;
  openPrice: number;
}

interface Signal {
  symbol: string;
  timeframe: string;
  type: 'scalp' | 'swing';
  signal: 'AL' | 'SAT' | 'BEKLE';
  strength: number;
  reasons: string[];
  price: number;
  indicators: Record<string, number | string | boolean>;
}

interface OrderBookEntry {
  price: number;
  quantity: number;
  total: number;
}

interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: { value: number; percent: string };
  imbalance: string;
}

interface FundingData {
  fundingRate: string;
  openInterest: string;
  openInterestValue: string;
  sentiment: string;
  sentimentEmoji: string;
  interpretation: { fundingRate: string; recommendation: string };
  fundingHistory: { time: number; rate: number }[];
}

interface Dominance {
  btcDominance: string;
  btcPrice: number;
  btcChange24h: string;
  dominanceTrend: string;
}

interface PriceAlarm {
  symbol: string;
  targetPrice: number;
  direction: 'above' | 'below';
  triggered: boolean;
  createdAt: number;
}

interface PortfolioEntry {
  symbol: string;
  amount: number;
  buyPrice: number;
  buyDate: number;
}

interface UserProfile {
  id?: string;
  username: string;
  telegramBotToken: string;
  telegramChatId: string;
  notificationsEnabled: boolean;
  watchlist: string[];
  alarms: PriceAlarm[];
  portfolio: PortfolioEntry[];
}

// Helper functions
function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return defaultValue;
    const parsed = JSON.parse(saved);
    // Default değerler ile birleştir - eksik alanları tamamla
    if (typeof defaultValue === 'object' && defaultValue !== null) {
      return { ...defaultValue, ...parsed };
    }
    return parsed;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

const defaultProfile: UserProfile = {
  username: '',
  telegramBotToken: '',
  telegramChatId: '',
  notificationsEnabled: false,
  watchlist: [],
  alarms: [],
  portfolio: [],
};

// Main Component
export default function CryptoDashboard() {
  // User State
  const [profile, setProfile] = useState<UserProfile>(() => loadFromStorage('cryptoProfile', defaultProfile));
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!loadFromStorage('cryptoProfile', defaultProfile).username);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');

  // Data State
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [scalpSignals, setScalpSignals] = useState<Signal[]>([]);
  const [swingSignals, setSwingSignals] = useState<Signal[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [fundingData, setFundingData] = useState<FundingData | null>(null);
  const [dominance, setDominance] = useState<Dominance | null>(null);
  const [coinKlines, setCoinKlines] = useState<{ open: number; high: number; low: number; close: number; volume: number; time: number }[]>([]);

  // UI State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('scalp');
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [showSettings, setShowSettings] = useState(false);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [autoTradingEnabled, setAutoTradingEnabled] = useState(true); // Otomatik iş açma
  
  // Alarm State
  const [alarmPrice, setAlarmPrice] = useState('');
  const [alarmDirection, setAlarmDirection] = useState<'above' | 'below'>('above');
  
  // Calculator State
  const [calcEntryPrice, setCalcEntryPrice] = useState('');
  const [calcAmount, setCalcAmount] = useState('');
  const [calcExitPrice, setCalcExitPrice] = useState('');
  
  // Telegram State
  const [tempBotToken, setTempBotToken] = useState('');
  const [tempChatId, setTempChatId] = useState('');
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Save profile
  useEffect(() => {
    saveToStorage('cryptoProfile', profile);
  }, [profile]);

  // Sayfa yüklendiğinde - username var ama id yoksa database'den al
  useEffect(() => {
    const fetchUserId = async () => {
      if (profile.username && !profile.id) {
        try {
          const response = await fetch(`/api/user?username=${profile.username}`);
          const data = await response.json();
          if (data.success && data.data?.id) {
            setProfile(prev => ({ ...prev, id: data.data.id }));
          }
        } catch (error) {
          console.error('User ID fetch error:', error);
        }
      }
    };
    fetchUserId();
  }, []); // Sadece bir kez çalışsın

  // Check alarms
  useEffect(() => {
    if (marketData.length === 0 || !profile.alarms?.length) return;
    
    profile.alarms.forEach(alarm => {
      if (alarm.triggered) return;
      const market = marketData.find(m => m.symbol === alarm.symbol);
      if (!market) return;
      
      if ((alarm.direction === 'above' && market.price >= alarm.targetPrice) ||
          (alarm.direction === 'below' && market.price <= alarm.targetPrice)) {
        // Trigger alarm
        setProfile(prev => ({
          ...prev,
          alarms: (prev.alarms || []).map(a => 
            a.symbol === alarm.symbol && a.targetPrice === alarm.targetPrice
              ? { ...a, triggered: true }
              : a
          ),
        }));
        
        // Send notification if enabled
        if (profile.notificationsEnabled && profile.telegramBotToken && profile.telegramChatId) {
          fetch('/api/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              botToken: profile.telegramBotToken,
              chatId: profile.telegramChatId,
              message: `🔔 <b>FİYAT ALARMI</b>\n\n${alarm.symbol}\nHedef: $${alarm.targetPrice}\nMevcut: $${market.price}\n\n✅ Alarm tetiklendi!`,
            }),
          });
        }
      }
    });
  }, [marketData, profile.alarms, profile.notificationsEnabled, profile.telegramBotToken, profile.telegramChatId]);

  // Fetch functions
  const fetchMarketData = useCallback(async () => {
    try {
      const response = await fetch('/api/crypto/market');
      const data = await response.json();
      if (data.success) {
        setMarketData(data.data);
        setError(null);
      }
    } catch {
      setError('Piyasa verileri alınamadı');
    }
  }, []);

  const fetchDominance = useCallback(async () => {
    try {
      const response = await fetch('/api/crypto/dominance');
      const data = await response.json();
      if (data.success) setDominance(data);
    } catch {}
  }, []);

  const fetchSignalsForCoin = useCallback(async (symbol: string) => {
    try {
      const response = await fetch(`/api/crypto/signals?symbol=${symbol}`);
      const data = await response.json();
      if (data.success) {
        return {
          scalp: data.signals.filter((s: Signal) => s.type === 'scalp'),
          swing: data.signals.filter((s: Signal) => s.type === 'swing'),
        };
      }
      return { scalp: [], swing: [] };
    } catch {
      return { scalp: [], swing: [] };
    }
  }, []);

  const fetchAllSignals = useCallback(async (coins: MarketData[]) => {
    if (coins.length === 0) return;
    setRefreshing(true);
    
    const allScalp: Signal[] = [];
    const allSwing: Signal[] = [];
    const topCoins = coins.slice(0, 20);
    
    for (const coin of topCoins) {
      const { scalp, swing } = await fetchSignalsForCoin(coin.symbol);
      allScalp.push(...scalp);
      allSwing.push(...swing);
    }

    const sortSignals = (signals: Signal[]) => [...signals].sort((a, b) => {
      if (a.signal !== 'BEKLE' && b.signal === 'BEKLE') return -1;
      if (a.signal === 'BEKLE' && b.signal !== 'BEKLE') return 1;
      return b.strength - a.strength;
    });

    setScalpSignals(sortSignals(allScalp));
    setSwingSignals(sortSignals(allSwing));
    setLastUpdate(new Date());
    setRefreshing(false);
    setLoading(false);
  }, [fetchSignalsForCoin]);

  const fetchOrderBook = useCallback(async (symbol: string) => {
    try {
      const response = await fetch(`/api/crypto/orderbook?symbol=${symbol}&limit=15`);
      const data = await response.json();
      if (data.success) setOrderBook(data);
    } catch {}
  }, []);

  const fetchFundingData = useCallback(async (symbol: string) => {
    try {
      const response = await fetch(`/api/crypto/funding?symbol=${symbol}`);
      const data = await response.json();
      if (data.success) setFundingData(data);
    } catch {}
  }, []);

  // Otomatik iş açma
  const openAutoTrade = useCallback(async (signal: Signal) => {
    if (!profile.id || !autoTradingEnabled) return;
    if (signal.signal === 'BEKLE') return;
    if (signal.strength < 60) return; // Minimum güç %60

    try {
      // Klines verisini al (TP/SL hesaplaması için)
      const klinesRes = await fetch(`/api/crypto/klines?symbol=${signal.symbol}&interval=${signal.timeframe}&limit=50`);
      let klines = [];
      if (klinesRes.ok) {
        const klinesData = await klinesRes.json();
        if (klinesData.success) {
          klines = klinesData.data.map((k: { openTime: number; open: number; high: number; low: number; close: number; volume: number }) => ({
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
            time: k.openTime,
          }));
        }
      }

      // İşlem aç
      const response = await fetch('/api/trades/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          symbol: signal.symbol,
          type: signal.signal === 'AL' ? 'LONG' : 'SHORT',
          signalType: signal.type,
          signalStrength: signal.strength,
          entryPrice: signal.price,
          reasons: signal.reasons,
          timeframe: signal.timeframe,
          klines,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Otomatik işlem açıldı: ${signal.symbol} ${signal.signal === 'AL' ? 'LONG' : 'SHORT'}`);
        
        // Telegram bildirimi
        if (profile.notificationsEnabled && profile.telegramBotToken && profile.telegramChatId) {
          const tradeType = signal.signal === 'AL' ? 'LONG' : 'SHORT';
          const emoji = tradeType === 'LONG' ? '🔵' : '🔴';
          await fetch('/api/telegram', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              botToken: profile.telegramBotToken,
              chatId: profile.telegramChatId,
              message: `🔔 <b>YENİ İŞLEM AÇILDI</b>\n\n${emoji} <b>${signal.symbol}</b> ${tradeType}\nEntry: $${signal.price}\nSL: $${data.data.stopLoss}\nTP: $${data.data.takeProfit}\nGüç: %${signal.strength}\n\n📌 ${signal.reasons.slice(0, 2).join(', ')}`,
            }),
          });
        }
      } else if (data.error?.includes('zaten aktif')) {
        // Zaten aktif işlem var, sessizce geç
        console.log(`⚠️ ${signal.symbol} için zaten aktif işlem var`);
      }
    } catch (error) {
      console.error('Auto trade error:', error);
    }
  }, [profile.id, profile.notificationsEnabled, profile.telegramBotToken, profile.telegramChatId, autoTradingEnabled]);

  // Sinyaller yüklendikten sonra otomatik iş aç
  useEffect(() => {
    if (!profile.id || !autoTradingEnabled) return;
    if (scalpSignals.length === 0 && swingSignals.length === 0) return;

    // En güçlü sinyaller için otomatik iş aç (her seferinde sadece 1 tane)
    const allSignals = [...scalpSignals, ...swingSignals]
      .filter(s => s.signal !== 'BEKLE' && s.strength >= 65)
      .sort((a, b) => b.strength - a.strength);

    if (allSignals.length > 0) {
      // Sadece en güçlü sinyali işle
      openAutoTrade(allSignals[0]);
    }
  }, [scalpSignals.length, swingSignals.length, profile.id, autoTradingEnabled, openAutoTrade]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchMarketData(), fetchDominance()]);
    };
    init();
  }, [fetchMarketData, fetchDominance]);

  // Fetch signals after market data
  useEffect(() => {
    if (marketData.length > 0 && !refreshing) {
      let isMounted = true;
      const loadSignals = async () => {
        if (isMounted) {
          await fetchAllSignals(marketData);
        }
      };
      loadSignals();
      return () => { isMounted = false; };
    }
  }, [marketData.length, refreshing]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMarketData();
      fetchDominance();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMarketData, fetchDominance]);

  // Fetch coin details
  useEffect(() => {
    if (!selectedCoin) return;
    
    const fetchDetails = async () => {
      const klinesRes = await fetch(`/api/crypto/klines?symbol=${selectedCoin}&interval=1h&limit=100`);
      if (klinesRes.ok) {
        const klinesData = await klinesRes.json();
        if (klinesData.success) {
          setCoinKlines(klinesData.data.map((k: { openTime: number; open: number; high: number; low: number; close: number; volume: number }) => ({
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volume,
            time: k.openTime,
          })));
        }
      }
      fetchOrderBook(selectedCoin);
      fetchFundingData(selectedCoin.replace('USDT', 'USDT'));
    };
    
    fetchDetails();
  }, [selectedCoin, fetchOrderBook, fetchFundingData]);

  // Handlers
  const handleLogin = useCallback(async () => {
    if (loginUsername.trim()) {
      try {
        // Database'e kayıt ol / giriş yap
        const response = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: loginUsername.trim() }),
        });
        const data = await response.json();
        
        if (data.success) {
          setProfile(prev => ({ 
            ...prev, 
            username: loginUsername.trim(),
            id: data.data.id,
          }));
          setIsLoggedIn(true);
          setShowLoginModal(false);
          setLoginUsername('');
        } else {
          // API returned error
          console.error('Login error:', data.error);
          // Yine de giriş yap ama ID olmadan
          setProfile(prev => ({ ...prev, username: loginUsername.trim() }));
          setIsLoggedIn(true);
          setShowLoginModal(false);
          setLoginUsername('');
        }
      } catch (error) {
        console.error('Login error:', error);
        // Fallback to localStorage only - yine de giriş yap
        setProfile(prev => ({ ...prev, username: loginUsername.trim() }));
        setIsLoggedIn(true);
        setShowLoginModal(false);
        setLoginUsername('');
      }
    }
  }, [loginUsername]);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setProfile(defaultProfile);
  }, []);

  const toggleWatchlist = useCallback((symbol: string) => {
    setProfile(prev => ({
      ...prev,
      watchlist: (prev.watchlist || []).includes(symbol)
        ? (prev.watchlist || []).filter(s => s !== symbol)
        : [...(prev.watchlist || []), symbol],
    }));
  }, []);

  const addAlarm = useCallback(() => {
    if (!selectedCoin || !alarmPrice) return;
    const targetPrice = parseFloat(alarmPrice);
    if (isNaN(targetPrice)) return;
    
    setProfile(prev => ({
      ...prev,
      alarms: [...(prev.alarms || []), {
        symbol: selectedCoin,
        targetPrice,
        direction: alarmDirection,
        triggered: false,
        createdAt: Date.now(),
      }],
    }));
    setShowAlarmModal(false);
    setAlarmPrice('');
  }, [selectedCoin, alarmPrice, alarmDirection]);

  const testTelegramConnection = useCallback(async () => {
    if (!tempBotToken || !tempChatId) return;
    setTestingTelegram(true);
    try {
      const response = await fetch(`/api/telegram?botToken=${tempBotToken}&chatId=${tempChatId}`);
      const data = await response.json();
      if (data.success) {
        setTelegramStatus('success');
        setProfile(prev => ({
          ...prev,
          telegramBotToken: tempBotToken,
          telegramChatId: tempChatId,
          notificationsEnabled: true,
        }));
      } else {
        setTelegramStatus('error');
      }
    } catch {
      setTelegramStatus('error');
    }
    setTestingTelegram(false);
  }, [tempBotToken, tempChatId]);

  // Format helpers
  const formatPrice = useCallback((price: number) => {
    if (price >= 1000) return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    return price.toLocaleString('tr-TR', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  }, []);

  const getSignalColor = useCallback((signal: string) => {
    if (signal === 'AL') return 'bg-buy text-buy-foreground';
    if (signal === 'SAT') return 'bg-sell text-sell-foreground';
    return 'bg-muted text-muted-foreground';
  }, []);

  const getSignalBorder = useCallback((signal: string) => {
    if (signal === 'AL') return 'border-buy/50';
    if (signal === 'SAT') return 'border-sell/50';
    return 'border-border';
  }, []);

  // Chart data
  const chartData = useMemo(() => {
    return coinKlines.map((k, i) => ({
      time: new Date(k.time).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
      price: k.close,
      volume: k.volume,
      high: k.high,
      low: k.low,
      open: k.open,
      index: i,
    }));
  }, [coinKlines]);

  // Depth chart data
  const depthChartData = useMemo(() => {
    if (!orderBook) return [];
    const data: { price: number; bidVolume: number; askVolume: number }[] = [];
    const maxLevels = Math.min(orderBook.bids.length, orderBook.asks.length);
    
    for (let i = maxLevels - 1; i >= 0; i--) {
      data.push({
        price: orderBook.bids[i].price,
        bidVolume: orderBook.bids.slice(0, i + 1).reduce((sum, b) => sum + b.quantity, 0),
        askVolume: 0,
      });
    }
    for (let i = 0; i < maxLevels; i++) {
      data.push({
        price: orderBook.asks[i].price,
        bidVolume: data[data.length - 1]?.bidVolume || 0,
        askVolume: orderBook.asks.slice(0, i + 1).reduce((sum, a) => sum + a.quantity, 0),
      });
    }
    return data;
  }, [orderBook]);

  // Candlestick data for display
  const candleData = useMemo(() => {
    return chartData.slice(-30).map(d => ({
      ...d,
      color: d.open <= d.price ? '#0ecb81' : '#f6465d',
    }));
  }, [chartData]);

  // Calculator result
  const calcResult = useMemo(() => {
    const entry = parseFloat(calcEntryPrice);
    const amount = parseFloat(calcAmount);
    const exit = parseFloat(calcExitPrice);
    
    if (isNaN(entry) || isNaN(amount) || isNaN(exit)) return null;
    
    const pnl = (exit - entry) * amount;
    const pnlPercent = ((exit - entry) / entry) * 100;
    const investment = entry * amount;
    
    return {
      investment: investment.toFixed(2),
      pnl: pnl.toFixed(2),
      pnlPercent: pnlPercent.toFixed(2),
      currentValue: (amount * exit).toFixed(2),
      isProfit: pnl > 0,
    };
  }, [calcEntryPrice, calcAmount, calcExitPrice]);

  // Order book max volume
  const maxVolume = useMemo(() => {
    if (!orderBook) return 1;
    const bidMax = Math.max(...orderBook.bids.map(b => b.quantity));
    const askMax = Math.max(...orderBook.asks.map(a => a.quantity));
    return Math.max(bidMax, askMax);
  }, [orderBook]);

  const handleRefresh = useCallback(() => {
    fetchMarketData();
    fetchDominance();
    if (marketData.length > 0) fetchAllSignals(marketData);
  }, [fetchMarketData, fetchDominance, fetchAllSignals, marketData]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="DeepTrade Pro Logo" className="w-10 h-10 rounded-lg shadow-lg ring-1 ring-primary/30" />
                <div>
                  <h1 className="text-xl font-bold gradient-text">DeepTrade Pro</h1>
                  <p className="text-[10px] text-muted-foreground hidden sm:block tracking-widest uppercase">Wall Street Grade Analytics</p>
                </div>
              </div>
              
              {dominance && (
                <div className="hidden md:flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">BTC Dom</span>
                    <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${dominance.btcDominance}%` }} />
                    </div>
                    <span className="text-xs font-medium">{dominance.btcDominance}%</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-secondary text-xs">
                  <div className="w-2 h-2 rounded-full bg-buy pulse-live" />
                  <span className="text-muted-foreground hidden sm:inline">Canlı</span>
                </div>
                <span className="text-xs text-muted-foreground hidden lg:block">{lastUpdate.toLocaleTimeString('tr-TR')}</span>
                <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                  <Settings className="w-4 h-4" />
                </Button>
                {isLoggedIn ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium hidden sm:block">{profile.username}</span>
                    <Button variant="ghost" size="icon" onClick={handleLogout}>
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button variant="default" size="sm" onClick={() => setShowLoginModal(true)} className="btn-binance">
                    <LogIn className="w-4 h-4 mr-1" />Giriş
                  </Button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-4">
          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => setShowCalculatorModal(true)}>
              <Calculator className="w-4 h-4 mr-1" />Hesaplayıcı
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAlarmModal(true)} disabled={!selectedCoin}>
              <Bell className="w-4 h-4 mr-1" />Alarm
              {(profile.alarms || []).filter(a => !a.triggered).length > 0 && (
                <Badge variant="secondary" className="ml-1">{(profile.alarms || []).filter(a => !a.triggered).length}</Badge>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPortfolioModal(true)}>
              <Wallet className="w-4 h-4 mr-1" />Portföy
            </Button>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 bg-card border border-border">
              <TabsTrigger value="scalp" className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-sell" /><span className="hidden sm:inline">Scalp</span>
              </TabsTrigger>
              <TabsTrigger value="swing" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /><span className="hidden sm:inline">Swing</span>
              </TabsTrigger>
              <TabsTrigger value="trades" className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" /><span className="hidden sm:inline">İşlemler</span>
              </TabsTrigger>
              <TabsTrigger value="backtest" className="flex items-center gap-2">
                <Play className="w-4 h-4 text-accent" /><span className="hidden sm:inline">Backtest</span>
              </TabsTrigger>
              <TabsTrigger value="watchlist" className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                {(profile.watchlist || []).length > 0 && <Badge variant="secondary">{profile.watchlist.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            {/* Scalp Signals */}
            <TabsContent value="scalp">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Card key={i} className="bg-card"><CardContent className="p-4"><Skeleton className="h-24" /></CardContent></Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {scalpSignals.filter(s => s.signal !== 'BEKLE').slice(0, 12).map((signal, index) => (
                    <Card
                      key={`${signal.symbol}-${signal.timeframe}-${index}`}
                      className={`crypto-card bg-card border ${getSignalBorder(signal.signal)} cursor-pointer`}
                      onClick={() => setSelectedCoin(signal.symbol)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{signal.symbol.replace('USDT', '')}</span>
                            <Badge variant="outline" className="text-[10px]">{signal.timeframe}</Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); toggleWatchlist(signal.symbol); }}>
                              <Star className={`w-3 h-3 ${(profile.watchlist || []).includes(signal.symbol) ? 'fill-primary text-primary' : ''}`} />
                            </Button>
                            <Badge className={getSignalColor(signal.signal)}>{signal.signal}</Badge>
                          </div>
                        </div>
                        <div className="text-xl font-bold mb-2">${formatPrice(signal.price)}</div>
                        <div className="mb-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Güç</span>
                            <span>{signal.strength}%</span>
                          </div>
                          <Progress value={signal.strength} className="h-1.5" />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {signal.reasons.slice(0, 2).map((reason, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">{reason}</Badge>
                          ))}
                        </div>
                        {/* New indicators display */}
                        <div className="grid grid-cols-2 gap-1 text-[10px] mt-2 pt-2 border-t border-border">
                          <div className="text-muted-foreground">SuperTrend: <span className={signal.indicators.superTrend === 'yükseliş' ? 'text-buy' : 'text-sell'}>{String(signal.indicators.superTrend)}</span></div>
                          <div className="text-muted-foreground">OBV: <span className={signal.indicators.obvTrend === 'yükseliş' ? 'text-buy' : ''}>{String(signal.indicators.obvTrend)}</span></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Swing Signals */}
            <TabsContent value="swing">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {swingSignals.filter(s => s.signal !== 'BEKLE').slice(0, 12).map((signal, index) => (
                  <Card
                    key={`${signal.symbol}-${signal.timeframe}-${index}`}
                    className={`crypto-card bg-card border ${getSignalBorder(signal.signal)} cursor-pointer`}
                    onClick={() => setSelectedCoin(signal.symbol)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{signal.symbol.replace('USDT', '')}</span>
                          <Badge variant="outline" className="text-[10px]">{signal.timeframe}</Badge>
                        </div>
                        <Badge className={getSignalColor(signal.signal)}>{signal.signal}</Badge>
                      </div>
                      <div className="text-xl font-bold mb-2">${formatPrice(signal.price)}</div>
                      <div className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Güç</span>
                          <span>{signal.strength}%</span>
                        </div>
                        <Progress value={signal.strength} className="h-1.5" />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {signal.reasons.slice(0, 2).map((reason, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">{reason}</Badge>
                        ))}
                      </div>
                      {/* Ichimoku & ADX display */}
                      <div className="grid grid-cols-2 gap-1 text-[10px] mt-2 pt-2 border-t border-border">
                        <div className="text-muted-foreground">Cloud: <span className={signal.indicators.ichimokuCloud === 'üstünde' ? 'text-buy' : 'text-sell'}>{String(signal.indicators.ichimokuCloud)}</span></div>
                        <div className="text-muted-foreground">ADX: <span>{String(signal.indicators.adx)}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Trades - İşlem Takip */}
            <TabsContent value="trades">
              <TradeSystem 
                userId={profile.id || ''} 
                marketData={marketData}
              />
            </TabsContent>

            {/* Backtest & Patterns */}
            <TabsContent value="backtest">
              <BacktestSystem userId={profile.id || ''} />
            </TabsContent>

            {/* Watchlist */}
            <TabsContent value="watchlist">
              <Card className="bg-card">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">İzleme Listem ({(profile.watchlist || []).length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {(profile.watchlist || []).length === 0 ? (
                    <div className="text-center py-8">
                      <Star className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">İzleme listeniz boş</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {(profile.watchlist || []).map(symbol => {
                        const market = marketData.find(m => m.symbol === symbol);
                        return (
                          <Card key={symbol} className="crypto-card bg-card cursor-pointer" onClick={() => setSelectedCoin(symbol)}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-bold">{symbol.replace('USDT', '')}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); toggleWatchlist(symbol); }}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                              {market && (
                                <>
                                  <div className="text-lg font-bold mb-1">${formatPrice(market.price)}</div>
                                  <div className={`text-xs mb-2 ${market.priceChangePercent >= 0 ? 'text-buy' : 'text-sell'}`}>
                                    {market.priceChangePercent >= 0 ? '+' : ''}{market.priceChangePercent.toFixed(2)}%
                                  </div>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        {/* Coin Detail Dialog */}
        <Dialog open={!!selectedCoin} onOpenChange={() => setSelectedCoin(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                {selectedCoin?.replace('USDT', '')}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left - Charts */}
              <div className="lg:col-span-2 space-y-4">
                {/* Price Chart */}
                <Card className="bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Fiyat Grafiği</span>
                      <Badge variant="outline">1h</Badge>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <ComposedChart data={chartData.slice(-50)}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f0b90b" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#f0b90b" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2b3139" />
                        <XAxis dataKey="time" stroke="#848e9c" fontSize={10} />
                        <YAxis stroke="#848e9c" fontSize={10} domain={['auto', 'auto']} />
                        <ChartTooltip contentStyle={{ backgroundColor: '#1e2329', border: '1px solid #2b3139' }} />
                        <Area type="monotone" dataKey="price" stroke="#f0b90b" fillOpacity={1} fill="url(#colorPrice)" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Depth Chart */}
                {orderBook && depthChartData.length > 0 && (
                  <Card className="bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Layers className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Depth Chart</span>
                      </div>
                      <ResponsiveContainer width="100%" height={150}>
                        <AreaChart data={depthChartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#2b3139" />
                          <XAxis dataKey="price" stroke="#848e9c" fontSize={10} tickFormatter={(v) => formatPrice(v)} />
                          <YAxis stroke="#848e9c" fontSize={10} />
                          <ChartTooltip contentStyle={{ backgroundColor: '#1e2329', border: '1px solid #2b3139' }} />
                          <Area type="stepAfter" dataKey="bidVolume" stroke="#0ecb81" fill="#0ecb81" fillOpacity={0.3} />
                          <Area type="stepAfter" dataKey="askVolume" stroke="#f6465d" fill="#f6465d" fillOpacity={0.3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Order Book */}
                {orderBook && (
                  <Card className="bg-card">
                    <CardHeader className="py-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Emir Defteri
                        </CardTitle>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Spread:</span>
                          <span>${orderBook.spread.value.toFixed(4)}</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="grid grid-cols-2 text-xs text-muted-foreground mb-1 px-1">
                            <span>Fiyat</span>
                            <span className="text-right">Miktar</span>
                          </div>
                          {orderBook.bids.slice(0, 8).map((bid, i) => (
                            <div key={i} className="grid grid-cols-2 text-xs py-0.5 px-1 relative">
                              <div className="absolute inset-0 bg-buy/10" style={{ width: `${(bid.quantity / maxVolume) * 100}%`, right: 0, left: 'auto' }} />
                              <span className="relative text-buy">{formatPrice(bid.price)}</span>
                              <span className="relative text-right">{bid.quantity.toFixed(4)}</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="grid grid-cols-2 text-xs text-muted-foreground mb-1 px-1">
                            <span>Fiyat</span>
                            <span className="text-right">Miktar</span>
                          </div>
                          {orderBook.asks.slice(0, 8).map((ask, i) => (
                            <div key={i} className="grid grid-cols-2 text-xs py-0.5 px-1 relative">
                              <div className="absolute inset-0 bg-sell/10" style={{ width: `${(ask.quantity / maxVolume) * 100}%` }} />
                              <span className="relative text-sell">{formatPrice(ask.price)}</span>
                              <span className="relative text-right">{ask.quantity.toFixed(4)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Funding Rate */}
                {fundingData && (
                  <Card className="bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Funding Rate</span>
                        </div>
                        <Badge className={parseFloat(fundingData.fundingRate) >= 0 ? 'bg-buy text-buy-foreground' : 'bg-sell text-sell-foreground'}>
                          {parseFloat(fundingData.fundingRate) >= 0 ? '+' : ''}{fundingData.fundingRate}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Open Interest:</span>
                          <span className="ml-2 font-medium">${parseFloat(fundingData.openInterestValue).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sentiment:</span>
                          <span className="ml-2">{fundingData.sentimentEmoji} {fundingData.sentiment}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {fundingData.interpretation.recommendation}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right - Quick Actions */}
              <div className="space-y-3">
                <Button className="w-full btn-binance" onClick={() => setShowAlarmModal(true)}>
                  <Bell className="w-4 h-4 mr-2" />Fiyat Alarmı Kur
                </Button>
                <Button variant="outline" className="w-full" onClick={() => toggleWatchlist(selectedCoin!)}>
                  <Star className={`w-4 h-4 mr-2 ${(profile.watchlist || []).includes(selectedCoin!) ? 'fill-primary' : ''}`} />
                  {(profile.watchlist || []).includes(selectedCoin!) ? 'İzlemeden Çıkar' : 'İzleme Listesine Ekle'}
                </Button>

                {/* Active Alarms */}
                {(profile.alarms || []).filter(a => a.symbol === selectedCoin && !a.triggered).length > 0 && (
                  <Card className="bg-card">
                    <CardHeader className="py-2">
                      <CardTitle className="text-sm">Aktif Alarmlar</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2">
                      {(profile.alarms || []).filter(a => a.symbol === selectedCoin && !a.triggered).map((alarm, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1">
                          <span>{alarm.direction === 'above' ? '↑ Üstü' : '↓ Altı'} ${alarm.targetPrice}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => {
                            setProfile(prev => ({
                              ...prev,
                              alarms: (prev.alarms || []).filter(a => a !== alarm),
                            }));
                          }}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Calculator Modal */}
        <Dialog open={showCalculatorModal} onOpenChange={setShowCalculatorModal}>
          <DialogContent className="bg-card max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="w-5 h-5" />Pozisyon Hesaplayıcı
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Giriş Fiyatı ($)</Label>
                <Input type="number" value={calcEntryPrice} onChange={(e) => setCalcEntryPrice(e.target.value)} placeholder="50000" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Miktar</Label>
                <Input type="number" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} placeholder="0.5" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Çıkış Fiyatı ($)</Label>
                <Input type="number" value={calcExitPrice} onChange={(e) => setCalcExitPrice(e.target.value)} placeholder="55000" />
              </div>
              {calcResult && (
                <Card className="bg-secondary p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Yatırım:</span>
                      <span>${calcResult.investment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Güncel Değer:</span>
                      <span>${calcResult.currentValue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kar/Zarar:</span>
                      <span className={calcResult.isProfit ? 'text-buy' : 'text-sell'}>
                        ${calcResult.pnl} ({calcResult.pnlPercent}%)
                      </span>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Alarm Modal */}
        <Dialog open={showAlarmModal} onOpenChange={setShowAlarmModal}>
          <DialogContent className="bg-card max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />Fiyat Alarmı
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Coin:</span>
                <Badge variant="outline">{selectedCoin}</Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Hedef Fiyat ($)</Label>
                <Input type="number" value={alarmPrice} onChange={(e) => setAlarmPrice(e.target.value)} placeholder="70000" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Yön</Label>
                <Select value={alarmDirection} onValueChange={(v) => setAlarmDirection(v as 'above' | 'below')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">↑ Fiyat yukarı geçince</SelectItem>
                    <SelectItem value="below">↓ Fiyat aşağı düşünce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full btn-binance" onClick={addAlarm} disabled={!alarmPrice}>Alarm Kur</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Portfolio Modal */}
        <Dialog open={showPortfolioModal} onOpenChange={setShowPortfolioModal}>
          <DialogContent className="bg-card max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />Portföy Yönetimi
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {(profile.portfolio || []).length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">Portföyünüz boş</p>
                  <p className="text-xs text-muted-foreground mt-1">Yakında ekleme özelliği gelecek!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(profile.portfolio || []).map((entry, i) => {
                    const market = marketData.find(m => m.symbol === entry.symbol);
                    const pnl = market ? ((market.price - entry.buyPrice) * entry.amount) : 0;
                    const pnlPercent = market ? ((market.price - entry.buyPrice) / entry.buyPrice * 100) : 0;
                    
                    return (
                      <Card key={i} className="bg-secondary p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{entry.symbol.replace('USDT', '')}</span>
                            <div className="text-xs text-muted-foreground">{entry.amount} adet @ ${entry.buyPrice}</div>
                          </div>
                          {market && (
                            <div className="text-right">
                              <div className="text-sm">${formatPrice(market.price)}</div>
                              <div className={`text-xs ${pnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPercent.toFixed(2)}%)
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Login Modal */}
        <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
          <DialogContent className="bg-card max-w-sm">
            <DialogHeader>
              <DialogTitle>Giriş Yap</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Kullanıcı adı" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
              <Button onClick={handleLogin} className="w-full btn-binance">Giriş Yap</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Settings Modal */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="bg-card max-w-md">
            <DialogHeader>
              <DialogTitle>Ayarlar</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Otomatik Yenileme</Label>
                <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              </div>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="font-medium">Telegram Bildirimleri</span>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Bot Token</Label>
                  <Input type="password" placeholder="123456:ABC-DEF..." value={tempBotToken} onChange={(e) => setTempBotToken(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Chat ID</Label>
                  <Input placeholder="123456789" value={tempChatId} onChange={(e) => setTempChatId(e.target.value)} />
                </div>
                <Button onClick={testTelegramConnection} disabled={testingTelegram || !tempBotToken || !tempChatId} variant="outline" className="w-full">
                  {testingTelegram ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  Test Et
                </Button>
                {telegramStatus === 'success' && (
                  <div className="flex items-center gap-2 text-buy text-sm"><CheckCircle className="w-4 h-4" />Bağlantı başarılı!</div>
                )}
                {telegramStatus === 'error' && (
                  <div className="flex items-center gap-2 text-sell text-sm"><AlertTriangle className="w-4 h-4" />Bağlantı başarısız!</div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
