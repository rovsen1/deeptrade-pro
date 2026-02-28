import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - İstatistikleri getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId gerekli' }, { status: 400 });
    }

    // Tüm geçmiş işlemleri al
    const history = await db.tradeHistory.findMany({
      where: { userId },
    });

    // Aktif işlemleri al
    const activeTrades = await db.trade.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    // İstatistik hesapla
    const totalTrades = history.length;
    const tpHits = history.filter(t => t.result === 'TP_HIT').length;
    const slHits = history.filter(t => t.result === 'SL_HIT').length;
    const cancelled = history.filter(t => t.result === 'CANCELLED').length;
    
    const winRate = totalTrades > 0 ? (tpHits / totalTrades) * 100 : 0;
    
    const totalPnl = history.reduce((sum, t) => sum + t.pnl, 0);
    const totalProfit = history
      .filter(t => t.pnl > 0)
      .reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(
      history
        .filter(t => t.pnl < 0)
        .reduce((sum, t) => sum + t.pnl, 0)
    );
    
    const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;
    const avgWin = tpHits > 0 ? totalProfit / tpHits : 0;
    const avgLoss = slHits > 0 ? totalLoss / slHits : 0;
    
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
    
    // En iyi ve en kötü işlem
    const bestTrade = history.length > 0 
      ? history.reduce((best, t) => t.pnl > best.pnl ? t : best, history[0])
      : null;
    const worstTrade = history.length > 0 
      ? history.reduce((worst, t) => t.pnl < worst.pnl ? t : worst, history[0])
      : null;

    // Coin bazında performans
    const coinPerformance: Record<string, { trades: number; wins: number; pnl: number }> = {};
    for (const trade of history) {
      if (!coinPerformance[trade.symbol]) {
        coinPerformance[trade.symbol] = { trades: 0, wins: 0, pnl: 0 };
      }
      coinPerformance[trade.symbol].trades++;
      if (trade.result === 'TP_HIT') coinPerformance[trade.symbol].wins++;
      coinPerformance[trade.symbol].pnl += trade.pnl;
    }

    // Son 7 günlük performans
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentTrades = history.filter(t => t.closedAt >= sevenDaysAgo);
    const recentPnl = recentTrades.reduce((sum, t) => sum + t.pnl, 0);
    const recentWins = recentTrades.filter(t => t.result === 'TP_HIT').length;

    return NextResponse.json({ 
      success: true, 
      data: {
        overview: {
          totalTrades,
          activeTrades: activeTrades.length,
          tpHits,
          slHits,
          cancelled,
          winRate: winRate.toFixed(1),
        },
        pnl: {
          total: totalPnl.toFixed(2),
          totalProfit: totalProfit.toFixed(2),
          totalLoss: totalLoss.toFixed(2),
          avgPnl: avgPnl.toFixed(2),
          avgWin: avgWin.toFixed(2),
          avgLoss: avgLoss.toFixed(2),
          profitFactor: profitFactor === Infinity ? '∞' : profitFactor.toFixed(2),
        },
        bestAndWorst: {
          best: bestTrade ? {
            symbol: bestTrade.symbol,
            pnl: bestTrade.pnl.toFixed(2),
            pnlPercent: bestTrade.pnlPercent.toFixed(2),
          } : null,
          worst: worstTrade ? {
            symbol: worstTrade.symbol,
            pnl: worstTrade.pnl.toFixed(2),
            pnlPercent: worstTrade.pnlPercent.toFixed(2),
          } : null,
        },
        coinPerformance: Object.entries(coinPerformance)
          .map(([symbol, data]) => ({
            symbol,
            ...data,
            winRate: ((data.wins / data.trades) * 100).toFixed(1),
          }))
          .sort((a, b) => b.pnl - a.pnl)
          .slice(0, 10),
        recent: {
          trades: recentTrades.length,
          pnl: recentPnl.toFixed(2),
          wins: recentWins,
          winRate: recentTrades.length > 0 
            ? ((recentWins / recentTrades.length) * 100).toFixed(1) 
            : '0',
        },
      }
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'İstatistikler alınamadı' 
    }, { status: 500 });
  }
}
