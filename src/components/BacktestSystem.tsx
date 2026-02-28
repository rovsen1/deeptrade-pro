'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  Play,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Zap,
  Settings,
  ChevronDown,
  ChevronUp,
  Activity,
  Sparkles,
  Trophy,
  Medal,
} from 'lucide-react';

interface BacktestMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  avgWin: number;
  avgLoss: number;
  maxWin: number;
  maxLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number | string;
  avgTradeDuration: number;
  equityCurve: number[];
}

interface Trade {
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  entryDate: string;
  exitDate: string;
  pnl: number;
  pnlPercent: number;
  reason: string;
  duration: number;
}

interface BacktestResult {
  symbol: string;
  strategy: string;
  timeframe: string;
  metrics: BacktestMetrics;
  trades: Trade[];
  period: {
    start: string;
    end: string;
    candles: number;
  };
}

interface PatternResult {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  patterns: Array<{
    type: string;
    bullish: boolean;
    confidence: number;
    entryPrice: number;
    targetPrice: number;
    stopLoss: number;
    entryPricePercent: string;
    targetPricePercent: string;
    stopLossPercent: string;
    riskReward: string;
  }>;
  supportResistance: {
    support: Array<{ price: number; distance: string }>;
    resistance: Array<{ price: number; distance: string }>;
  };
  marketStructure: {
    trend: string;
    highOfDay: number;
    lowOfDay: number;
  };
}

// Strategy Optimization Result
interface StrategyRanking {
  strategy: string;
  description: string;
  avgWinRate: number;
  avgProfitFactor: number;
  avgPnl: number;
  totalTrades: number;
  avgDrawdown: number;
  tests: number;
  consistency: number;
}

interface OptimizerResult {
  bestStrategy: StrategyRanking;
  bestConfig: {
    strategy: string;
    description: string;
    symbol: string;
    timeframe: string;
    winRate: number;
    profitFactor: number;
    totalPnlPercent: number;
    totalTrades: number;
    maxDrawdown: number;
  };
  strategyRankings: StrategyRanking[];
  allResults: any[];
  testedAt: string;
  totalTests: number;
  settings: {
    commission: string;
    slippage: string;
    dataSource: string;
  };
}

interface BacktestSystemProps {
  userId: string;
}

const STRATEGIES = [
  { id: 'SmartTrendFollower', name: '🎯 Smart Trend', type: 'trend', risk: 'low', desc: '58.3% Winrate!', isPro: true },
  { id: 'StochRSIMeanReversion', name: '📊 Stoch+BB', type: 'reversal', risk: 'medium', desc: '53.9% Winrate!', isPro: true },
  { id: 'TrendFollower', name: 'Trend Follower', type: 'trend', risk: 'low', desc: 'SuperTrend + EMA' },
  { id: 'MeanReversion', name: 'Mean Reversion', type: 'reversal', risk: 'medium', desc: 'Bollinger + RSI' },
  { id: 'EMACross', name: 'EMA Cross', type: 'trend', risk: 'low', desc: 'EMA 9/21 Cross' },
  { id: 'Breakout', name: 'Breakout', type: 'momentum', risk: 'high', desc: 'Support/Resistance' },
];

const TIMEFRAMES = [
  { id: '5m', name: '5 Dakika' },
  { id: '15m', name: '15 Dakika' },
  { id: '1h', name: '1 Saat' },
  { id: '4h', name: '4 Saat' },
  { id: '1d', name: '1 Gün' },
];

const POPULAR_COINS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
];

export default function BacktestSystem({ userId }: BacktestSystemProps) {
  // State
  const [activeView, setActiveView] = useState<'backtest' | 'patterns' | 'optimizer'>('backtest');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [patternResult, setPatternResult] = useState<PatternResult | null>(null);
  const [optimizerResult, setOptimizerResult] = useState<OptimizerResult | null>(null);

  // Backtest params
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [strategy, setStrategy] = useState('SmartTrendFollower');
  const [timeframe, setTimeframe] = useState('1h');
  const [customSymbol, setCustomSymbol] = useState('');
  
  // Run backtest
  const runBacktest = useCallback(async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Smart Trend Follower için özel endpoint
      if (strategy === 'SmartTrendFollower') {
        const response = await fetch('/api/backtest/smart-trend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            symbol: customSymbol || symbol,
            timeframe,
            parameters: {
              emaPeriod: 50,
              rsiEntryMax: 55,  // Optimize edilmiş
              volumeMultiplier: 1.0,
              tpATRMultiplier: 2,  // Optimize edilmiş
              slATRMultiplier: 1,  // Optimize edilmiş
              trailingStopPercent: 1.5,
              useTrailingStop: true,
            },
          }),
        });
        
        const data = await response.json();
        if (data.success) {
          setResult(data.data);
        }
      } else {
        // Diğer stratejiler
        const response = await fetch('/api/backtest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            symbol: customSymbol || symbol,
            strategy,
            timeframe,
            parameters: {
              rsiPeriod: 14,
              rsiOversold: 30,
              rsiOverbought: 70,
              slPercent: 2,
              tpPercent: 4,
            },
          }),
        });
        
        const data = await response.json();
        if (data.success) {
          setResult(data.data);
        }
      }
    } catch (error) {
      console.error('Backtest error:', error);
    }
    
    setLoading(false);
  }, [userId, symbol, customSymbol, strategy, timeframe]);
  
  // Detect patterns
  const detectPatterns = useCallback(async () => {
    setLoading(true);
    setPatternResult(null);

    try {
      const response = await fetch(`/api/patterns?symbol=${customSymbol || symbol}&timeframe=${timeframe}&userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setPatternResult(data.data);
      }
    } catch (error) {
      console.error('Pattern detection error:', error);
    }

    setLoading(false);
  }, [userId, symbol, customSymbol, timeframe]);

  // Run Strategy Optimizer - Tüm stratejileri test eder
  const runOptimizer = useCallback(async () => {
    setLoading(true);
    setOptimizerResult(null);

    try {
      const response = await fetch('/api/backtest/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT'],
          timeframes: ['1h', '4h'],
        }),
      });

      const data = await response.json();
      if (data.success) {
        setOptimizerResult(data.data);
      }
    } catch (error) {
      console.error('Optimizer error:', error);
    }

    setLoading(false);
  }, []);
  
  // Format helpers
  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    return price.toLocaleString('tr-TR', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  };

  // Misafir modunda da çalışabilir - userId opsiyonel
  const isGuest = !userId;

  return (
    <div className="space-y-4">
      {/* Guest Mode Notice */}
      {isGuest && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="py-2 px-3">
            <p className="text-xs text-yellow-500">
              💡 <strong>Misafir Modu:</strong> Backtest sonuçları kaydedilmeyecek. Sonuçları kaydetmek için giriş yapın.
            </p>
          </CardContent>
        </Card>
      )}

      {/* View Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={activeView === 'backtest' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('backtest')}
          className={activeView === 'backtest' ? 'btn-binance' : ''}
        >
          <Play className="w-4 h-4 mr-1" />
          Backtest
        </Button>
        <Button
          variant={activeView === 'patterns' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('patterns')}
          className={activeView === 'patterns' ? 'btn-binance' : ''}
        >
          <Activity className="w-4 h-4 mr-1" />
          Patterns
        </Button>
        <Button
          variant={activeView === 'optimizer' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveView('optimizer')}
          className={activeView === 'optimizer' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' : ''}
        >
          <Sparkles className="w-4 h-4 mr-1" />
          AI Optimizer
        </Button>
      </div>

      {/* Controls */}
      <Card className="bg-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Symbol */}
            <div>
              <Label className="text-xs text-muted-foreground">Coin</Label>
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_COINS.map(coin => (
                    <SelectItem key={coin} value={coin}>{coin.replace('USDT', '')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Veya yazın..."
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value.toUpperCase())}
                className="mt-1 h-8 text-sm"
              />
            </div>

            {/* Strategy (Backtest only) */}
            {activeView === 'backtest' && (
              <div>
                <Label className="text-xs text-muted-foreground">Strateji</Label>
                <Select value={strategy} onValueChange={setStrategy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STRATEGIES.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <span>{s.name}</span>
                          <span className="text-[10px] text-muted-foreground">({s.desc})</span>
                          <Badge variant="outline" className="text-[10px]">
                            {s.risk}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Timeframe */}
            <div>
              <Label className="text-xs text-muted-foreground">Zaman Dilimi</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map(tf => (
                    <SelectItem key={tf.id} value={tf.id}>{tf.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Run Button */}
            <div className="flex items-end">
              <Button
                className="w-full btn-binance"
                onClick={activeView === 'backtest' ? runBacktest : detectPatterns}
                disabled={loading}
              >
                {loading ? (
                  <RotateCcw className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-1" />
                )}
                {loading ? 'Çalışıyor...' : 'Başlat'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backtest Results */}
      {activeView === 'backtest' && result && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <Card className="bg-card">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Sonuçlar</CardTitle>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">{result.strategy}</Badge>
                  <Badge variant="outline">{result.timeframe}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stat-card p-3">
                  <div className="text-xs text-muted-foreground">Toplam İşlem</div>
                  <div className="text-xl font-bold">{result.metrics.totalTrades}</div>
                </div>
                <div className="stat-card p-3">
                  <div className="text-xs text-muted-foreground">Win Rate</div>
                  <div className={`text-xl font-bold ${result.metrics.winRate >= 50 ? 'text-buy' : 'text-sell'}`}>
                    {result.metrics.winRate.toFixed(1)}%
                  </div>
                </div>
                <div className="stat-card p-3">
                  <div className="text-xs text-muted-foreground">Toplam P&L</div>
                  <div className={`text-xl font-bold ${result.metrics.totalPnlPercent >= 0 ? 'text-buy' : 'text-sell'}`}>
                    {result.metrics.totalPnlPercent >= 0 ? '+' : ''}{result.metrics.totalPnlPercent.toFixed(2)}%
                  </div>
                </div>
                <div className="stat-card p-3">
                  <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                  <div className={`text-xl font-bold ${result.metrics.sharpeRatio >= 1 ? 'text-buy' : 'text-sell'}`}>
                    {result.metrics.sharpeRatio}
                  </div>
                </div>
              </div>

              {/* Win/Loss Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div>
                  <div className="text-xs text-muted-foreground">Kazanan</div>
                  <div className="text-lg font-bold text-buy">{result.metrics.winningTrades}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Kaybeden</div>
                  <div className="text-lg font-bold text-sell">{result.metrics.losingTrades}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Ort. Kazanç</div>
                  <div className="text-lg font-bold text-buy">+{result.metrics.avgWin.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Ort. Kayıp</div>
                  <div className="text-lg font-bold text-sell">-{result.metrics.avgLoss.toFixed(2)}%</div>
                </div>
              </div>

              {/* Risk Metrics */}
              <div className="mt-4 p-3 rounded-lg bg-secondary/50">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Max Drawdown: </span>
                    <span className="text-sell font-medium">-{result.metrics.maxDrawdown.toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Profit Factor: </span>
                    <span className="font-medium">{result.metrics.profitFactor}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Ort. Süre: </span>
                    <span className="font-medium">{result.metrics.avgTradeDuration} bar</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equity Curve */}
          {result.metrics.equityCurve.length > 0 && (
            <Card className="bg-card">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Equity Curve</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={result.metrics.equityCurve.map((v, i) => ({ trade: i, equity: v }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a3a5c" />
                    <XAxis dataKey="trade" stroke="#5a7494" fontSize={10} />
                    <YAxis stroke="#5a7494" fontSize={10} domain={['auto', 'auto']} />
                    <ChartTooltip contentStyle={{ backgroundColor: '#0a1628', border: '1px solid #1a3a5c' }} />
                    <defs>
                      <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffd700" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ffd700" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="equity" stroke="#ffd700" fillOpacity={1} fill="url(#equityGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Trade List */}
          <Card className="bg-card">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">İşlem Listesi ({result.trades.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                <div className="divide-y divide-border">
                  {result.trades.slice(0, 50).map((trade, i) => (
                    <div key={i} className="p-3 hover:bg-secondary/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {trade.type === 'LONG' ? (
                            <TrendingUp className="w-4 h-4 text-buy" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-sell" />
                          )}
                          <span className="font-medium text-sm">{trade.type}</span>
                          <Badge variant="outline" className="text-[10px]">{trade.reason}</Badge>
                        </div>
                        <span className={`font-medium ${trade.pnlPercent >= 0 ? 'text-buy' : 'text-sell'}`}>
                          {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground grid grid-cols-3 gap-2">
                        <span>Entry: ${formatPrice(trade.entryPrice)}</span>
                        <span>Exit: {formatPrice(trade.exitPrice)}</span>
                        <span>Süre: {trade.duration} bar</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pattern Results */}
      {activeView === 'patterns' && patternResult && (
        <div className="space-y-4">
          {/* Detected Patterns */}
          <Card className="bg-card">
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Tespit Edilen Formasyonlar</CardTitle>
                <Badge variant="outline">{patternResult.patterns.length} adet</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {patternResult.patterns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Formasyon bulunamadı</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patternResult.patterns.map((pattern, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${
                        pattern.bullish
                          ? 'border-buy/30 bg-buy/5'
                          : 'border-sell/30 bg-sell/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {pattern.bullish ? (
                            <TrendingUp className="w-5 h-5 text-buy" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-sell" />
                          )}
                          <span className="font-medium">{pattern.type.replace(/_/g, ' ')}</span>
                          <Badge className={pattern.bullish ? 'bg-buy' : 'bg-sell'}>
                            {pattern.bullish ? 'BULLISH' : 'BEARISH'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">Güven:</span>
                          <span className={`font-bold ${pattern.confidence >= 70 ? 'text-buy' : 'text-yellow-500'}`}>
                            {pattern.confidence}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Entry: </span>
                          <span className="font-medium">${formatPrice(pattern.entryPrice)}</span>
                          <span className="text-muted-foreground"> ({pattern.entryPricePercent}%)</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Target: </span>
                          <span className="font-medium text-buy">${formatPrice(pattern.targetPrice)}</span>
                          <span className="text-muted-foreground"> ({pattern.targetPricePercent}%)</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">SL: </span>
                          <span className="font-medium text-sell">{formatPrice(pattern.stopLoss)}</span>
                          <span className="text-muted-foreground"> ({pattern.stopLossPercent}%)</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-xs">
                        <span className="text-muted-foreground">Risk/Reward: </span>
                        <span className="font-medium">{pattern.riskReward}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Support/Resistance */}
          <Card className="bg-card">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Destek & Direnç</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-buy font-medium mb-2">Destek Seviyeleri</div>
                  {patternResult.supportResistance.support.slice(0, 3).map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1">
                      <span>${formatPrice(s.price)}</span>
                      <span className="text-muted-foreground">{s.distance}%</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs text-sell font-medium mb-2">Direnç Seviyeleri</div>
                  {patternResult.supportResistance.resistance.slice(0, 3).map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1">
                      <span>${formatPrice(r.price)}</span>
                      <span className="text-muted-foreground">+{r.distance}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Market Structure */}
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">Trend</div>
                  <Badge className={patternResult.marketStructure.trend === 'UPTREND' ? 'bg-buy' : 'bg-sell'}>
                    {patternResult.marketStructure.trend}
                  </Badge>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">24h High</div>
                  <div className="font-medium text-buy">${formatPrice(patternResult.marketStructure.highOfDay)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">24h Low</div>
                  <div className="font-medium text-sell">{formatPrice(patternResult.marketStructure.lowOfDay)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Strategy Optimizer Results */}
      {activeView === 'optimizer' && (
        <div className="space-y-4">
          {/* Optimizer Button */}
          <Card className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    AI Strateji Optimizer
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    7 farklı stratejiyi 4 coin ve 2 timeframe'da test eder, en yüksek winrate'li stratejiyi bulur.
                  </p>
                </div>
                <Button
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                  onClick={runOptimizer}
                  disabled={loading}
                >
                  {loading ? (
                    <RotateCcw className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-1" />
                  )}
                  {loading ? 'Analiz Ediliyor...' : 'Tüm Stratejileri Test Et'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {optimizerResult && (
            <>
              {/* Best Strategy Highlight */}
              <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    <CardTitle className="text-lg">En Güçlü Strateji</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="col-span-2">
                      <div className="text-xs text-muted-foreground">Strateji</div>
                      <div className="text-xl font-bold text-yellow-500">{optimizerResult.bestStrategy.strategy}</div>
                      <div className="text-xs text-muted-foreground mt-1">{optimizerResult.bestStrategy.description}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Ort. Win Rate</div>
                      <div className={`text-2xl font-bold ${optimizerResult.bestStrategy.avgWinRate >= 50 ? 'text-buy' : 'text-sell'}`}>
                        {optimizerResult.bestStrategy.avgWinRate.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Profit Factor</div>
                      <div className="text-2xl font-bold text-yellow-500">
                        {optimizerResult.bestStrategy.avgProfitFactor}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Tutarlılık</div>
                      <div className="text-2xl font-bold text-buy">
                        {optimizerResult.bestStrategy.consistency}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-secondary/50">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Toplam Test: </span>
                        <span className="font-medium">{optimizerResult.bestStrategy.tests}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Toplam İşlem: </span>
                        <span className="font-medium">{optimizerResult.bestStrategy.totalTrades}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Ort. Drawdown: </span>
                        <span className="font-medium text-sell">-{optimizerResult.bestStrategy.avgDrawdown}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Best Configuration */}
              <Card className="bg-card">
                <CardHeader className="py-3">
                  <div className="flex items-center gap-2">
                    <Medal className="w-5 h-5 text-orange-500" />
                    <CardTitle className="text-sm">En İyi Konfigürasyon</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="p-2 rounded bg-secondary/50">
                      <div className="text-xs text-muted-foreground">Coin</div>
                      <div className="font-bold">{optimizerResult.bestConfig.symbol}</div>
                    </div>
                    <div className="p-2 rounded bg-secondary/50">
                      <div className="text-xs text-muted-foreground">Timeframe</div>
                      <div className="font-bold">{optimizerResult.bestConfig.timeframe}</div>
                    </div>
                    <div className="p-2 rounded bg-secondary/50">
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                      <div className={`font-bold ${optimizerResult.bestConfig.winRate >= 50 ? 'text-buy' : 'text-sell'}`}>
                        {optimizerResult.bestConfig.winRate.toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-2 rounded bg-secondary/50">
                      <div className="text-xs text-muted-foreground">Profit Factor</div>
                      <div className="font-bold text-yellow-500">{optimizerResult.bestConfig.profitFactor}</div>
                    </div>
                    <div className="p-2 rounded bg-secondary/50">
                      <div className="text-xs text-muted-foreground">Toplam P&L</div>
                      <div className={`font-bold ${optimizerResult.bestConfig.totalPnlPercent >= 0 ? 'text-buy' : 'text-sell'}`}>
                        {optimizerResult.bestConfig.totalPnlPercent >= 0 ? '+' : ''}{optimizerResult.bestConfig.totalPnlPercent}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Strategy Rankings Chart */}
              <Card className="bg-card">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Strateji Sıralaması (Win Rate)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={optimizerResult.strategyRankings} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a3a5c" />
                      <XAxis type="number" domain={[0, 100]} stroke="#5a7494" fontSize={10} />
                      <YAxis type="category" dataKey="strategy" stroke="#5a7494" fontSize={10} width={120} />
                      <ChartTooltip
                        contentStyle={{ backgroundColor: '#0a1628', border: '1px solid #1a3a5c' }}
                        formatter={(value: any) => [`${value.toFixed(1)}%`, 'Win Rate']}
                      />
                      <Bar dataKey="avgWinRate" radius={[0, 4, 4, 0]}>
                        {optimizerResult.strategyRankings.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.avgWinRate >= 50 ? '#00c853' : entry.avgWinRate >= 40 ? '#ffd700' : '#ff5252'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* All Rankings Table */}
              <Card className="bg-card">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Tüm Stratejiler</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[300px]">
                    <div className="divide-y divide-border">
                      {optimizerResult.strategyRankings.map((s, i) => (
                        <div key={i} className={`p-3 ${i === 0 ? 'bg-yellow-500/10' : ''}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                i === 0 ? 'bg-yellow-500 text-black' :
                                i === 1 ? 'bg-gray-400 text-black' :
                                i === 2 ? 'bg-orange-600 text-white' :
                                'bg-secondary text-muted-foreground'
                              }`}>
                                {i + 1}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{s.strategy}</div>
                                <div className="text-xs text-muted-foreground">{s.description}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold ${s.avgWinRate >= 50 ? 'text-buy' : 'text-sell'}`}>
                                {s.avgWinRate.toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                PF: {s.avgProfitFactor} | DD: {s.avgDrawdown}%
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Test Info */}
              <div className="text-xs text-muted-foreground text-center">
                <span>Toplam {optimizerResult.totalTests} test yapıldı • </span>
                <span>Commission: {optimizerResult.settings.commission} • </span>
                <span>Slippage: {optimizerResult.settings.slippage} • </span>
                <span>Veri: {optimizerResult.settings.dataSource}</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
    </div>
  );
}
