'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Trophy,
  Activity,
  Zap,
} from 'lucide-react';

// Types
interface Trade {
  id: string;
  symbol: string;
  type: 'LONG' | 'SHORT';
  signalType: 'scalp' | 'swing';
  signalStrength: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  currentPrice: number;
  status: 'ACTIVE' | 'TP_HIT' | 'SL_HIT' | 'CANCELLED';
  pnl: number;
  pnlPercent: number;
  reasons: string[];
  timeframe: string;
  createdAt: Date;
  closedAt?: Date;
}

interface TradeHistory {
  id: string;
  symbol: string;
  type: 'LONG' | 'SHORT';
  signalType: 'scalp' | 'swing';
  signalStrength: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  result: 'TP_HIT' | 'SL_HIT' | 'CANCELLED';
  pnl: number;
  pnlPercent: number;
  reasons: string[];
  duration: number;
  openedAt: Date;
  closedAt: Date;
}

interface Stats {
  overview: {
    totalTrades: number;
    activeTrades: number;
    tpHits: number;
    slHits: number;
    cancelled: number;
    winRate: string;
  };
  pnl: {
    total: string;
    totalProfit: string;
    totalLoss: string;
    avgPnl: string;
    avgWin: string;
    avgLoss: string;
    profitFactor: string;
  };
  bestAndWorst: {
    best: { symbol: string; pnl: string; pnlPercent: string } | null;
    worst: { symbol: string; pnl: string; pnlPercent: string } | null;
  };
  recent: {
    trades: number;
    pnl: string;
    wins: number;
    winRate: string;
  };
}

interface TradeSystemProps {
  userId: string;
  marketData: Array<{ symbol: string; price: number }>;
  onTradeUpdate?: () => void;
}

// Format helpers
const formatPrice = (price: number) => {
  if (price >= 1000) return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString('tr-TR', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return price.toLocaleString('tr-TR', { minimumFractionDigits: 6, maximumFractionDigits: 6 });
};

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} dk`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} sa ${minutes % 60} dk`;
  return `${Math.floor(minutes / 1440)} gün ${Math.floor((minutes % 1440) / 60)} sa`;
};

const formatTimeAgo = (date: Date) => {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 60000);
  return formatDuration(diff);
};

export default function TradeSystem({ userId, marketData, onTradeUpdate }: TradeSystemProps) {
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'active' | 'history' | 'stats'>('active');

  // Fetch active trades
  const fetchActiveTrades = useCallback(async () => {
    try {
      const response = await fetch(`/api/trades?userId=${userId}&status=ACTIVE`);
      const data = await response.json();
      if (data.success) {
        setActiveTrades(data.data);
      }
    } catch (error) {
      console.error('Active trades fetch error:', error);
    }
  }, [userId]);

  // Fetch trade history
  const fetchTradeHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/trades/history?userId=${userId}&limit=50`);
      const data = await response.json();
      if (data.success) {
        setTradeHistory(data.data);
      }
    } catch (error) {
      console.error('History fetch error:', error);
    }
  }, [userId]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/trades/stats?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Stats fetch error:', error);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchActiveTrades(), fetchTradeHistory(), fetchStats()]);
      setLoading(false);
    };
    if (userId) load();
  }, [userId, fetchActiveTrades, fetchTradeHistory, fetchStats]);

  // Update trades with current prices & check TP/SL
  useEffect(() => {
    if (activeTrades.length === 0 || marketData.length === 0) return;

    const updateTrades = async () => {
      const updates = activeTrades.map(trade => {
        const market = marketData.find(m => m.symbol === trade.symbol);
        return {
          tradeId: trade.id,
          currentPrice: market?.price || trade.currentPrice,
        };
      });

      // Check TP/SL
      const response = await fetch('/api/trades/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trades: updates }),
      });

      const data = await response.json();
      if (data.success && data.updates.length > 0) {
        // Refresh all data
        await Promise.all([fetchActiveTrades(), fetchTradeHistory(), fetchStats()]);
        onTradeUpdate?.();
      }
    };

    const interval = setInterval(updateTrades, 30000); // Her 30 saniyede kontrol et
    return () => clearInterval(interval);
  }, [activeTrades, marketData, fetchActiveTrades, fetchTradeHistory, fetchStats, onTradeUpdate]);

  // Cancel trade
  const cancelTrade = async (tradeId: string) => {
    try {
      await fetch(`/api/trades?tradeId=${tradeId}`, { method: 'DELETE' });
      await Promise.all([fetchActiveTrades(), fetchTradeHistory(), fetchStats()]);
      onTradeUpdate?.();
    } catch (error) {
      console.error('Cancel trade error:', error);
    }
  };

  // Calculate totals
  const totalPnL = useMemo(() => {
    return activeTrades.reduce((sum, t) => sum + t.pnl, 0);
  }, [activeTrades]);

  if (!userId) {
    return (
      <Card className="bg-card">
        <CardContent className="py-8">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">İşlemleri görmek için giriş yapın</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('active')}
            className={view === 'active' ? 'btn-binance' : ''}
          >
            <Activity className="w-4 h-4 mr-1" />
            Aktif ({activeTrades.length})
          </Button>
          <Button
            variant={view === 'history' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('history')}
            className={view === 'history' ? 'btn-binance' : ''}
          >
            <Clock className="w-4 h-4 mr-1" />
            Geçmiş
          </Button>
          <Button
            variant={view === 'stats' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('stats')}
            className={view === 'stats' ? 'btn-binance' : ''}
          >
            <Trophy className="w-4 h-4 mr-1" />
            İstatistik
          </Button>
        </div>
        {activeTrades.length > 0 && (
          <div className={`text-sm font-medium ${totalPnL >= 0 ? 'text-buy' : 'text-sell'}`}>
            Toplam P&L: {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)}$
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* Active Trades */}
          {view === 'active' && (
            <>
              {activeTrades.length === 0 ? (
                <Card className="bg-card">
                  <CardContent className="py-8">
                    <div className="text-center">
                      <Target className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Aktif işlem yok</p>
                      <p className="text-xs text-muted-foreground mt-1">Sinyal geldiğinde otomatik işlem açılacak</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {activeTrades.map(trade => (
                    <Card key={trade.id} className="bg-card border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${trade.type === 'LONG' ? 'bg-buy/20' : 'bg-sell/20'}`}>
                              {trade.type === 'LONG' ? (
                                <TrendingUp className="w-5 h-5 text-buy" />
                              ) : (
                                <TrendingDown className="w-5 h-5 text-sell" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{trade.symbol.replace('USDT', '')}</span>
                                <Badge variant="outline" className="text-xs">
                                  {trade.type}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  <Zap className="w-3 h-3 mr-1" />
                                  {trade.signalType}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {trade.timeframe} • Güç: %{trade.signalStrength}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-sell hover:text-sell"
                            onClick={() => cancelTrade(trade.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            İptal
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground">Entry</div>
                            <div className="font-medium">${formatPrice(trade.entryPrice)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">SL</div>
                            <div className="font-medium text-sell">${formatPrice(trade.stopLoss)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">TP</div>
                            <div className="font-medium text-buy">${formatPrice(trade.takeProfit)}</div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Anlık:</span>
                            <span className="font-medium">${formatPrice(trade.currentPrice)}</span>
                            <Separator orientation="vertical" className="h-4" />
                            <span className={`text-sm font-medium ${trade.pnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                              {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}$ ({trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%)
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {formatTimeAgo(trade.createdAt)}
                          </div>
                        </div>

                        {trade.reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border">
                            {trade.reasons.slice(0, 3).map((reason, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {/* History */}
          {view === 'history' && (
            <>
              {tradeHistory.length === 0 ? (
                <Card className="bg-card">
                  <CardContent className="py-8">
                    <div className="text-center">
                      <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-muted-foreground">Henüz işlem geçmişi yok</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card">
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      <div className="divide-y divide-border">
                        {tradeHistory.map(trade => (
                          <div key={trade.id} className="p-3 hover:bg-secondary/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {trade.result === 'TP_HIT' ? (
                                  <CheckCircle className="w-4 h-4 text-buy" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-sell" />
                                )}
                                <span className="font-medium">{trade.symbol.replace('USDT', '')}</span>
                                <Badge variant="outline" className="text-xs">{trade.type}</Badge>
                                <Badge 
                                  className={trade.result === 'TP_HIT' ? 'bg-buy text-buy-foreground' : 'bg-sell text-sell-foreground'}
                                >
                                  {trade.result === 'TP_HIT' ? 'TP OLDU' : 'SL OLDU'}
                                </Badge>
                              </div>
                              <div className={`font-medium ${trade.pnl >= 0 ? 'text-buy' : 'text-sell'}`}>
                                {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}$
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                              <span>Entry: ${formatPrice(trade.entryPrice)}</span>
                              <span>Exit: ${formatPrice(trade.exitPrice)}</span>
                              <span>Süre: {formatDuration(trade.duration)}</span>
                              <span>{new Date(trade.closedAt).toLocaleDateString('tr-TR')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Stats */}
          {view === 'stats' && stats && (
            <div className="space-y-4">
              {/* Overview */}
              <Card className="bg-card">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Genel Bakış
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{stats.overview.totalTrades}</div>
                      <div className="text-xs text-muted-foreground">Toplam</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-buy">{stats.overview.tpHits}</div>
                      <div className="text-xs text-muted-foreground">TP</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-sell">{stats.overview.slHits}</div>
                      <div className="text-xs text-muted-foreground">SL</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${parseFloat(stats.overview.winRate) >= 50 ? 'text-buy' : 'text-sell'}`}>
                        {stats.overview.winRate}%
                      </div>
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                    </div>
                  </div>

                  {/* Win Rate Progress */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Kazanma Oranı</span>
                      <span>{stats.overview.winRate}%</span>
                    </div>
                    <Progress value={parseFloat(stats.overview.winRate)} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* PnL */}
              <Card className="bg-card">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Kar/Zarar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Toplam Kar</div>
                      <div className="text-xl font-bold text-buy">+{stats.pnl.totalProfit}$</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Toplam Zarar</div>
                      <div className="text-xl font-bold text-sell">-{stats.pnl.totalLoss}$</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Net Kar</div>
                      <div className={`text-xl font-bold ${parseFloat(stats.pnl.total) >= 0 ? 'text-buy' : 'text-sell'}`}>
                        {parseFloat(stats.pnl.total) >= 0 ? '+' : ''}{stats.pnl.total}$
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Profit Factor</div>
                      <div className="text-xl font-bold">{stats.pnl.profitFactor}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Performance */}
              <Card className="bg-card">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Son 7 Gün</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold">{stats.recent.trades}</div>
                      <div className="text-xs text-muted-foreground">İşlem</div>
                    </div>
                    <div>
                      <div className={`text-lg font-bold ${parseFloat(stats.recent.pnl) >= 0 ? 'text-buy' : 'text-sell'}`}>
                        {parseFloat(stats.recent.pnl) >= 0 ? '+' : ''}{stats.recent.pnl}$
                      </div>
                      <div className="text-xs text-muted-foreground">PnL</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{stats.recent.winRate}%</div>
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Best & Worst */}
              {stats.bestAndWorst.best && stats.bestAndWorst.worst && (
                <Card className="bg-card">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">En İyi & En Kötü</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-buy/10">
                        <div className="text-xs text-muted-foreground mb-1">En İyi İşlem</div>
                        <div className="font-medium">{stats.bestAndWorst.best?.symbol.replace('USDT', '')}</div>
                        <div className="text-buy font-bold">+{stats.bestAndWorst.best?.pnl}$</div>
                      </div>
                      <div className="p-3 rounded-lg bg-sell/10">
                        <div className="text-xs text-muted-foreground mb-1">En Kötü İşlem</div>
                        <div className="font-medium">{stats.bestAndWorst.worst?.symbol.replace('USDT', '')}</div>
                        <div className="text-sell font-bold">{stats.bestAndWorst.worst?.pnl}$</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
