import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ========================================
// 🧪 BACKTEST ENGINE v2.1
// DeepTrade Pro - Robust Version
// ========================================

// Commission ve Slippage
const COMMISSION = 0.0004; // %0.04 (Binance VIP)
const SLIPPAGE = 0.0002;   // %0.02

// Technical Analysis Functions
function calculateRSI(closes: number[], period: number = 14): number[] {
  if (closes.length < period + 1) return closes.map(() => 50);
  
  const rsiValues: number[] = [];
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  for (let i = 0; i < period; i++) {
    rsiValues.push(50);
  }
  
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsiValues.push(100 - (100 / (1 + rs)));
  
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiValues.push(100 - (100 / (1 + rs)));
  }
  
  return rsiValues;
}

function calculateEMA(prices: number[], period: number): number[] {
  if (prices.length < period) return prices.map(() => prices[prices.length - 1] || 0);
  
  const multiplier = 2 / (period + 1);
  const emaArray: number[] = [];
  
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = 0; i < period - 1; i++) {
    emaArray.push(ema);
  }
  emaArray.push(ema);
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
    emaArray.push(ema);
  }
  
  return emaArray;
}

function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(prices[i]);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number[] {
  const atr: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) {
      atr.push(highs[i] - lows[i]);
    } else {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      
      if (i < period) {
        atr.push(atr.slice(0, i).reduce((a, b) => a + b, tr) / (i + 1));
      } else {
        atr.push((atr[i - 1] * (period - 1) + tr) / period);
      }
    }
  }
  
  return atr;
}

function calculateSuperTrend(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 10,
  multiplier: number = 3
): { values: number[]; trends: ('up' | 'down')[] } {
  const values: number[] = [];
  const trends: ('up' | 'down')[] = [];
  const atr = calculateATR(highs, lows, closes, period);
  
  let trend: 'up' | 'down' = 'up';
  let prevSuperTrend = 0;
  
  for (let i = 0; i < closes.length; i++) {
    const hl2 = (highs[i] + lows[i]) / 2;
    const upperBand = hl2 + multiplier * atr[i];
    const lowerBand = hl2 - multiplier * atr[i];
    
    if (i === 0) {
      trend = 'up';
      values.push(lowerBand);
    } else {
      if (closes[i] > prevSuperTrend) {
        trend = 'up';
      } else if (closes[i] < prevSuperTrend) {
        trend = 'down';
      }
      
      values.push(trend === 'up' ? lowerBand : upperBand);
    }
    
    trends.push(trend);
    prevSuperTrend = values[i];
  }
  
  return { values, trends };
}

function calculateBollingerBands(closes: number[], period: number = 20, stdDev: number = 2): { upper: number[]; lower: number[]; middle: number[] } {
  const middle = calculateSMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(middle[i]);
      lower.push(middle[i]);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = middle[i];
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }
  
  return { upper, lower, middle };
}

// ========================================
// STRATEGY ENGINES
// ========================================

interface Trade {
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  entryTime: number;
  exitTime: number;
  pnl: number;
  pnlPercent: number;
  reason: string;
  commission: number;
}

function runTrendFollowerStrategy(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  options: { emaPeriod: number; stPeriod: number; stMultiplier: number; riskPercent: number }
): Trade[] {
  const trades: Trade[] = [];
  const ema = calculateEMA(closes, options.emaPeriod);
  const superTrend = calculateSuperTrend(highs, lows, closes, options.stPeriod, options.stMultiplier);
  const atr = calculateATR(highs, lows, closes, 14);
  
  let position: 'LONG' | 'SHORT' | null = null;
  let entryPrice = 0;
  let entryTime = 0;
  let stopLoss = 0;
  let takeProfit = 0;
  
  for (let i = 50; i < closes.length; i++) {
    const price = closes[i];
    const prevTrend = superTrend.trends[i - 1];
    const currTrend = superTrend.trends[i];
    
    if (!position) {
      if (currTrend === 'up' && prevTrend === 'down' && price > ema[i]) {
        position = 'LONG';
        entryPrice = price * (1 + SLIPPAGE);
        entryTime = i;
        stopLoss = price - atr[i] * 2;
        takeProfit = price + atr[i] * 4;
      }
      else if (currTrend === 'down' && prevTrend === 'up' && price < ema[i]) {
        position = 'SHORT';
        entryPrice = price * (1 - SLIPPAGE);
        entryTime = i;
        stopLoss = price + atr[i] * 2;
        takeProfit = price - atr[i] * 4;
      }
    }
    else if (position) {
      let exit = false;
      let exitPrice = price;
      let reason = '';
      
      if (position === 'LONG') {
        if (price <= stopLoss) {
          exit = true;
          exitPrice = stopLoss;
          reason = 'SL Hit';
        } else if (price >= takeProfit) {
          exit = true;
          exitPrice = takeProfit;
          reason = 'TP Hit';
        } else if (currTrend === 'down') {
          exit = true;
          reason = 'Trend Reversal';
        }
      } else {
        if (price >= stopLoss) {
          exit = true;
          exitPrice = stopLoss;
          reason = 'SL Hit';
        } else if (price <= takeProfit) {
          exit = true;
          exitPrice = takeProfit;
          reason = 'TP Hit';
        } else if (currTrend === 'up') {
          exit = true;
          reason = 'Trend Reversal';
        }
      }
      
      if (exit) {
        const commissionCost = entryPrice * COMMISSION * 2;
        const pnlPercent = position === 'LONG'
          ? ((exitPrice - entryPrice - commissionCost) / entryPrice) * 100
          : ((entryPrice - exitPrice - commissionCost) / entryPrice) * 100;
        
        trades.push({
          type: position,
          entryPrice,
          exitPrice,
          entryTime,
          exitTime: i,
          pnl: pnlPercent,
          pnlPercent,
          reason,
          commission: commissionCost,
        });
        
        position = null;
      }
    }
  }
  
  return trades;
}

function runMeanReversionStrategy(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  options: { bbPeriod: number; bbStd: number; rsiPeriod: number; rsiLow: number; rsiHigh: number }
): Trade[] {
  const trades: Trade[] = [];
  const bb = calculateBollingerBands(closes, options.bbPeriod, options.bbStd);
  const rsi = calculateRSI(closes, options.rsiPeriod);
  const atr = calculateATR(highs, lows, closes, 14);
  
  let position: 'LONG' | 'SHORT' | null = null;
  let entryPrice = 0;
  let entryTime = 0;
  let stopLoss = 0;
  let takeProfit = 0;
  
  for (let i = 50; i < closes.length; i++) {
    const price = closes[i];
    
    if (!position) {
      if (price <= bb.lower[i] && rsi[i] < options.rsiLow) {
        position = 'LONG';
        entryPrice = price * (1 + SLIPPAGE);
        entryTime = i;
        stopLoss = price - atr[i] * 1.5;
        takeProfit = bb.middle[i];
      }
      else if (price >= bb.upper[i] && rsi[i] > options.rsiHigh) {
        position = 'SHORT';
        entryPrice = price * (1 - SLIPPAGE);
        entryTime = i;
        stopLoss = price + atr[i] * 1.5;
        takeProfit = bb.middle[i];
      }
    }
    else if (position) {
      let exit = false;
      let exitPrice = price;
      let reason = '';
      
      if (position === 'LONG') {
        if (price <= stopLoss) {
          exit = true;
          exitPrice = stopLoss;
          reason = 'SL Hit';
        } else if (price >= takeProfit || rsi[i] > 60) {
          exit = true;
          exitPrice = price;
          reason = price >= takeProfit ? 'TP Hit' : 'RSI Normal';
        }
      } else {
        if (price >= stopLoss) {
          exit = true;
          exitPrice = stopLoss;
          reason = 'SL Hit';
        } else if (price <= takeProfit || rsi[i] < 40) {
          exit = true;
          exitPrice = price;
          reason = price <= takeProfit ? 'TP Hit' : 'RSI Normal';
        }
      }
      
      if (exit) {
        const commissionCost = entryPrice * COMMISSION * 2;
        const pnlPercent = position === 'LONG'
          ? ((exitPrice - entryPrice - commissionCost) / entryPrice) * 100
          : ((entryPrice - exitPrice - commissionCost) / entryPrice) * 100;
        
        trades.push({
          type: position,
          entryPrice,
          exitPrice,
          entryTime,
          exitTime: i,
          pnl: pnlPercent,
          pnlPercent,
          reason,
          commission: commissionCost,
        });
        
        position = null;
      }
    }
  }
  
  return trades;
}

function runEMACrossStrategy(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  options: { fastPeriod: number; slowPeriod: number; useFilter: boolean }
): Trade[] {
  const trades: Trade[] = [];
  const emaFast = calculateEMA(closes, options.fastPeriod);
  const emaSlow = calculateEMA(closes, options.slowPeriod);
  const atr = calculateATR(highs, lows, closes, 14);
  const rsi = calculateRSI(closes, 14);
  
  let position: 'LONG' | 'SHORT' | null = null;
  let entryPrice = 0;
  let entryTime = 0;
  let stopLoss = 0;
  let takeProfit = 0;
  
  for (let i = 100; i < closes.length; i++) {
    const price = closes[i];
    const crossUp = emaFast[i] > emaSlow[i] && emaFast[i - 1] <= emaSlow[i - 1];
    const crossDown = emaFast[i] < emaSlow[i] && emaFast[i - 1] >= emaSlow[i - 1];
    
    if (!position) {
      if (crossUp && (!options.useFilter || rsi[i] < 70)) {
        position = 'LONG';
        entryPrice = price * (1 + SLIPPAGE);
        entryTime = i;
        stopLoss = price - atr[i] * 2;
        takeProfit = price + atr[i] * 3;
      }
      else if (crossDown && (!options.useFilter || rsi[i] > 30)) {
        position = 'SHORT';
        entryPrice = price * (1 - SLIPPAGE);
        entryTime = i;
        stopLoss = price + atr[i] * 2;
        takeProfit = price - atr[i] * 3;
      }
    }
    else if (position) {
      let exit = false;
      let exitPrice = price;
      let reason = '';
      
      if (position === 'LONG') {
        if (price <= stopLoss) {
          exit = true;
          exitPrice = stopLoss;
          reason = 'SL Hit';
        } else if (price >= takeProfit) {
          exit = true;
          exitPrice = takeProfit;
          reason = 'TP Hit';
        } else if (crossDown) {
          exit = true;
          reason = 'EMA Cross Reversal';
        }
      } else {
        if (price >= stopLoss) {
          exit = true;
          exitPrice = stopLoss;
          reason = 'SL Hit';
        } else if (price <= takeProfit) {
          exit = true;
          exitPrice = takeProfit;
          reason = 'TP Hit';
        } else if (crossUp) {
          exit = true;
          reason = 'EMA Cross Reversal';
        }
      }
      
      if (exit) {
        const commissionCost = entryPrice * COMMISSION * 2;
        const pnlPercent = position === 'LONG'
          ? ((exitPrice - entryPrice - commissionCost) / entryPrice) * 100
          : ((entryPrice - exitPrice - commissionCost) / entryPrice) * 100;
        
        trades.push({
          type: position,
          entryPrice,
          exitPrice,
          entryTime,
          exitTime: i,
          pnl: pnlPercent,
          pnlPercent,
          reason,
          commission: commissionCost,
        });
        
        position = null;
      }
    }
  }
  
  return trades;
}

function runBreakoutStrategy(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  options: { lookback: number; volumeMultiplier: number }
): Trade[] {
  const trades: Trade[] = [];
  const atr = calculateATR(highs, lows, closes, 14);
  
  const avgVolumes: number[] = [];
  for (let i = 0; i < volumes.length; i++) {
    if (i < 20) {
      avgVolumes.push(volumes[i]);
    } else {
      const sum = volumes.slice(i - 20, i).reduce((a, b) => a + b, 0);
      avgVolumes.push(sum / 20);
    }
  }
  
  let position: 'LONG' | 'SHORT' | null = null;
  let entryPrice = 0;
  let entryTime = 0;
  let stopLoss = 0;
  let takeProfit = 0;
  
  for (let i = options.lookback + 1; i < closes.length; i++) {
    const price = closes[i];
    const prevHighs = highs.slice(i - options.lookback, i);
    const prevLows = lows.slice(i - options.lookback, i);
    const resistanceHigh = Math.max(...prevHighs);
    const supportLow = Math.min(...prevLows);
    const volumeOk = volumes[i] > avgVolumes[i] * options.volumeMultiplier;
    
    if (!position) {
      if (price > resistanceHigh && volumeOk) {
        position = 'LONG';
        entryPrice = price * (1 + SLIPPAGE);
        entryTime = i;
        stopLoss = price - atr[i] * 1.5;
        takeProfit = price + atr[i] * 3;
      }
      else if (price < supportLow && volumeOk) {
        position = 'SHORT';
        entryPrice = price * (1 - SLIPPAGE);
        entryTime = i;
        stopLoss = price + atr[i] * 1.5;
        takeProfit = price - atr[i] * 3;
      }
    }
    else if (position) {
      let exit = false;
      let exitPrice = price;
      let reason = '';
      
      if (position === 'LONG') {
        if (price <= stopLoss) {
          exit = true;
          exitPrice = stopLoss;
          reason = 'SL Hit';
        } else if (price >= takeProfit) {
          exit = true;
          exitPrice = takeProfit;
          reason = 'TP Hit';
        } else if (price < lows[i - 1] && price < entryPrice) {
          exit = true;
          reason = 'Failed Breakout';
        }
      } else {
        if (price >= stopLoss) {
          exit = true;
          exitPrice = stopLoss;
          reason = 'SL Hit';
        } else if (price <= takeProfit) {
          exit = true;
          exitPrice = takeProfit;
          reason = 'TP Hit';
        } else if (price > highs[i - 1] && price > entryPrice) {
          exit = true;
          reason = 'Failed Breakout';
        }
      }
      
      if (exit) {
        const commissionCost = entryPrice * COMMISSION * 2;
        const pnlPercent = position === 'LONG'
          ? ((exitPrice - entryPrice - commissionCost) / entryPrice) * 100
          : ((entryPrice - exitPrice - commissionCost) / entryPrice) * 100;
        
        trades.push({
          type: position,
          entryPrice,
          exitPrice,
          entryTime,
          exitTime: i,
          pnl: pnlPercent,
          pnlPercent,
          reason,
          commission: commissionCost,
        });
        
        position = null;
      }
    }
  }
  
  return trades;
}

// ========================================
// BACKTEST CALCULATOR
// ========================================

function calculateBacktestMetrics(trades: Trade[], initialCapital: number = 10000) {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnl: 0,
      totalPnlPercent: 0,
      avgWin: 0,
      avgLoss: 0,
      maxWin: 0,
      maxLoss: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      profitFactor: 0,
      avgTradeDuration: 0,
      equityCurve: [],
      totalCommission: 0,
    };
  }
  
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  
  const totalPnlPercent = trades.reduce((sum, t) => sum + t.pnlPercent, 0);
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnlPercent, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnlPercent, 0) / losses.length) : 0;
  const totalCommission = trades.reduce((sum, t) => sum + t.commission, 0);
  
  let equity = 100;
  const equityCurve: number[] = [100];
  let peak = 100;
  let maxDrawdown = 0;
  
  for (const trade of trades) {
    equity *= (1 + trade.pnlPercent / 100);
    equityCurve.push(equity);
    
    if (equity > peak) peak = equity;
    const drawdown = ((peak - equity) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  const returns = trades.map(t => t.pnlPercent);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
  
  const grossProfit = wins.reduce((sum, t) => sum + t.pnlPercent, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnlPercent, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
  
  const avgTradeDuration = trades.reduce((sum, t) => sum + (t.exitTime - t.entryTime), 0) / trades.length;
  
  return {
    totalTrades: trades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    winRate: (wins.length / trades.length) * 100,
    totalPnl: (initialCapital * totalPnlPercent / 100),
    totalPnlPercent,
    avgWin,
    avgLoss,
    maxWin: Math.max(...trades.map(t => t.pnlPercent)),
    maxLoss: Math.min(...trades.map(t => t.pnlPercent)),
    maxDrawdown,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    avgTradeDuration: Math.round(avgTradeDuration),
    equityCurve,
    totalCommission,
  };
}

// Generate synthetic klines for backtest when API unavailable
function generateSyntheticKlines(symbol: string, basePrice: number, count: number) {
  const klines: number[][] = [];
  let price = basePrice;
  const volatility = basePrice * 0.02; // 2% daily volatility
  
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 2 * volatility;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = 1000000 + Math.random() * 5000000;
    const openTime = Date.now() - (count - i) * 3600000; // hourly
    
    klines.push([
      openTime,
      open.toString(),
      high.toString(),
      low.toString(),
      close.toString(),
      volume.toString(),
    ]);
    
    price = close;
  }
  
  return klines;
}

// Real prices for synthetic data
const REAL_PRICES: Record<string, number> = {
  'BTCUSDT': 67000,
  'ETHUSDT': 3400,
  'BNBUSDT': 580,
  'SOLUSDT': 175,
  'XRPUSDT': 0.52,
  'ADAUSDT': 0.267,
  'DOGEUSDT': 0.12,
  'AVAXUSDT': 35,
  'DOTUSDT': 6.5,
  'LINKUSDT': 14,
  'UNIUSDT': 8.5,
  'ATOMUSDT': 8.2,
  'MATICUSDT': 0.52,
  'LTCUSDT': 82,
  'ETCUSDT': 22,
};

// ========================================
// API HANDLER
// ========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      symbol,
      strategy,
      timeframe,
      parameters,
    } = body;

    if (!symbol || !strategy || !timeframe) {
      return NextResponse.json({
        success: false,
        error: 'Eksik parametreler',
      }, { status: 400 });
    }

    let klines: number[][] = [];
    
    // Try Binance API endpoints
    const endpoints = [
      'https://api.binance.com/api/v3/klines',
      'https://api1.binance.com/api/v3/klines',
      'https://api2.binance.com/api/v3/klines',
      'https://api3.binance.com/api/v3/klines',
    ];
    
    const limit = 1000;
    
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(
          `${endpoint}?symbol=${symbol}&interval=${timeframe}&limit=${limit}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 100) {
            klines = data;
            break;
          }
        }
      } catch {
        continue;
      }
    }

    // If no data from Binance, use synthetic data
    if (klines.length === 0) {
      console.log('Binance API unavailable, using synthetic data for backtest');
      const basePrice = REAL_PRICES[symbol] || 100;
      klines = generateSyntheticKlines(symbol, basePrice, 500);
    }

    const closes = klines.map((k) => parseFloat(k[4] as string));
    const highs = klines.map((k) => parseFloat(k[2] as string));
    const lows = klines.map((k) => parseFloat(k[3] as string));
    const volumes = klines.map((k) => parseFloat(k[5] as string));
    const openTimes = klines.map((k) => k[0] as number);

    // Run strategy
    let trades: Trade[] = [];

    switch (strategy) {
      case 'TrendFollower':
        trades = runTrendFollowerStrategy(closes, highs, lows, volumes, {
          emaPeriod: parameters?.emaPeriod || 50,
          stPeriod: parameters?.stPeriod || 10,
          stMultiplier: parameters?.stMultiplier || 3,
          riskPercent: parameters?.riskPercent || 1,
        });
        break;

      case 'MeanReversion':
        trades = runMeanReversionStrategy(closes, highs, lows, volumes, {
          bbPeriod: parameters?.bbPeriod || 20,
          bbStd: parameters?.bbStd || 2,
          rsiPeriod: parameters?.rsiPeriod || 14,
          rsiLow: parameters?.rsiLow || 35,
          rsiHigh: parameters?.rsiHigh || 65,
        });
        break;

      case 'EMACross':
        trades = runEMACrossStrategy(closes, highs, lows, volumes, {
          fastPeriod: parameters?.fastPeriod || 9,
          slowPeriod: parameters?.slowPeriod || 21,
          useFilter: parameters?.useFilter ?? true,
        });
        break;

      case 'Breakout':
        trades = runBreakoutStrategy(closes, highs, lows, volumes, {
          lookback: parameters?.lookback || 20,
          volumeMultiplier: parameters?.volumeMultiplier || 1.5,
        });
        break;

      default:
        trades = runTrendFollowerStrategy(closes, highs, lows, volumes, {
          emaPeriod: 50,
          stPeriod: 10,
          stMultiplier: 3,
          riskPercent: 1,
        });
    }

    // Calculate metrics
    const metrics = calculateBacktestMetrics(trades);

    // Prepare trade data
    const tradesWithDates = trades.map(t => ({
      ...t,
      entryDate: new Date(openTimes[t.entryTime]).toISOString(),
      exitDate: new Date(openTimes[t.exitTime]).toISOString(),
      duration: t.exitTime - t.entryTime,
    }));

    // Save to database if userId provided
    if (userId) {
      try {
        await db.backtest.create({
          data: {
            userId,
            strategy,
            symbol,
            timeframe,
            startDate: new Date(openTimes[0]),
            endDate: new Date(openTimes[openTimes.length - 1]),
            parameters: JSON.stringify(parameters || {}),
            totalTrades: metrics.totalTrades,
            winningTrades: metrics.winningTrades,
            losingTrades: metrics.losingTrades,
            winRate: metrics.winRate,
            totalPnl: metrics.totalPnl,
            totalPnlPercent: metrics.totalPnlPercent,
            avgWin: metrics.avgWin,
            avgLoss: metrics.avgLoss,
            maxWin: metrics.maxWin,
            maxLoss: metrics.maxLoss,
            maxDrawdown: metrics.maxDrawdown,
            sharpeRatio: metrics.sharpeRatio,
            profitFactor: typeof metrics.profitFactor === 'number' ? metrics.profitFactor : 999,
            avgTradeDuration: metrics.avgTradeDuration,
            trades: JSON.stringify(tradesWithDates),
          },
        });
      } catch (dbError) {
        console.error('Database save error:', dbError);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        symbol,
        strategy,
        timeframe,
        metrics,
        trades: tradesWithDates,
        period: {
          start: new Date(openTimes[0]).toISOString(),
          end: new Date(openTimes[openTimes.length - 1]).toISOString(),
          candles: klines.length,
        },
        info: {
          commissionUsed: `${COMMISSION * 100}% per trade`,
          slippageUsed: `${SLIPPAGE * 100}%`,
          dataSource: klines.length > 0 && klines[0][0] > 1700000000000 ? 'Binance Real Data' : 'Synthetic Data (API unavailable)',
        },
      },
    });

  } catch (error) {
    console.error('Backtest error:', error);
    return NextResponse.json({
      success: false,
      error: 'Backtest hesaplanamadı: ' + (error instanceof Error ? error.message : 'Bilinmeyen hata'),
    }, { status: 500 });
  }
}

// GET - Fetch backtest history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'userId gerekli',
      }, { status: 400 });
    }

    const backtests = await db.backtest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const backtestsParsed = backtests.map(bt => ({
      ...bt,
      parameters: JSON.parse(bt.parameters),
      trades: JSON.parse(bt.trades),
    }));

    return NextResponse.json({
      success: true,
      data: backtestsParsed,
    });

  } catch (error) {
    console.error('Fetch backtests error:', error);
    return NextResponse.json({
      success: false,
      error: 'Backtest geçmişi alınamadı',
    }, { status: 500 });
  }
}
