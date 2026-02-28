import { NextRequest, NextResponse } from 'next/server';

// ========================================
// 🚀 ADVANCED STRATEGY OPTIMIZER v3.0
// DeepTrade Pro - Multi-Strategy Backtest Engine
// Profesyonel Strateji Optimizasyonu
// ========================================

// Commission ve Slippage
const COMMISSION = 0.0004; // %0.04 (Binance VIP)
const SLIPPAGE = 0.0002;   // %0.02

// ========================================
// TECHNICAL INDICATORS
// ========================================

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
  if (prices.length < period) return prices;
  
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

function calculateMACD(closes: number[], fast: number = 12, slow: number = 26, signal: number = 9): { macd: number[]; signal: number[]; histogram: number[] } {
  const emaFast = calculateEMA(closes, fast);
  const emaSlow = calculateEMA(closes, slow);
  
  const macd: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macd.push(emaFast[i] - emaSlow[i]);
  }
  
  const signalLine = calculateEMA(macd, signal);
  
  const histogram: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    histogram.push(macd[i] - signalLine[i]);
  }
  
  return { macd, signal: signalLine, histogram };
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], period: number = 14, smoothK: number = 3, smoothD: number = 3): { k: number[]; d: number[] } {
  const k: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      k.push(50);
    } else {
      const highestHigh = Math.max(...highs.slice(i - period + 1, i + 1));
      const lowestLow = Math.min(...lows.slice(i - period + 1, i + 1));
      const range = highestHigh - lowestLow;
      k.push(range === 0 ? 50 : ((closes[i] - lowestLow) / range) * 100);
    }
  }
  
  const smoothedK = calculateSMA(k, smoothK);
  const d = calculateSMA(smoothedK, smoothD);
  
  return { k: smoothedK, d };
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

function calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): number[] {
  const adx: number[] = [];
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  const tr: number[] = [highs[0] - lows[0]];
  
  for (let i = 1; i < closes.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    
    tr.push(Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    ));
  }
  
  const smoothTR = calculateEMA(tr, period);
  const smoothPlusDM = calculateEMA(plusDM, period);
  const smoothMinusDM = calculateEMA(minusDM, period);
  
  for (let i = 0; i < closes.length; i++) {
    if (smoothTR[i] === 0) {
      adx.push(0);
    } else {
      const plusDI = (smoothPlusDM[i] / smoothTR[i]) * 100;
      const minusDI = (smoothMinusDM[i] / smoothTR[i]) * 100;
      const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
      adx.push(isNaN(dx) ? 0 : dx);
    }
  }
  
  return calculateEMA(adx, period);
}

function calculateIchimoku(
  highs: number[],
  lows: number[],
  closes: number[],
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouBPeriod: number = 52
): {
  tenkan: number[];
  kijun: number[];
  senkouA: number[];
  senkouB: number[];
  chikou: number[];
  cloud: ('above' | 'below' | 'inside')[];
} {
  const tenkan: number[] = [];
  const kijun: number[] = [];
  const senkouA: number[] = [];
  const senkouB: number[] = [];
  const chikou: number[] = [];
  const cloud: ('above' | 'below' | 'inside')[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    // Tenkan-sen
    if (i < tenkanPeriod - 1) {
      tenkan.push(closes[i]);
    } else {
      const high = Math.max(...highs.slice(i - tenkanPeriod + 1, i + 1));
      const low = Math.min(...lows.slice(i - tenkanPeriod + 1, i + 1));
      tenkan.push((high + low) / 2);
    }
    
    // Kijun-sen
    if (i < kijunPeriod - 1) {
      kijun.push(closes[i]);
    } else {
      const high = Math.max(...highs.slice(i - kijunPeriod + 1, i + 1));
      const low = Math.min(...lows.slice(i - kijunPeriod + 1, i + 1));
      kijun.push((high + low) / 2);
    }
    
    // Senkou Span A
    senkouA.push((tenkan[i] + kijun[i]) / 2);
    
    // Senkou Span B
    if (i < senkouBPeriod - 1) {
      senkouB.push(closes[i]);
    } else {
      const high = Math.max(...highs.slice(i - senkouBPeriod + 1, i + 1));
      const low = Math.min(...lows.slice(i - senkouBPeriod + 1, i + 1));
      senkouB.push((high + low) / 2);
    }
    
    // Chikou Span (lagging)
    chikou.push(closes[i]);
    
    // Cloud position
    const upperCloud = Math.max(senkouA[i], senkouB[i]);
    const lowerCloud = Math.min(senkouA[i], senkouB[i]);
    
    if (closes[i] > upperCloud) {
      cloud.push('above');
    } else if (closes[i] < lowerCloud) {
      cloud.push('below');
    } else {
      cloud.push('inside');
    }
  }
  
  return { tenkan, kijun, senkouA, senkouB, chikou, cloud };
}

// ========================================
// TRADE INTERFACE
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

// ========================================
// STRATEGY DEFINITIONS
// ========================================

// 1. SMART TREND FOLLOWER - Basitleştirilmiş versiyon
function runSmartTrendFollower(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[]
): Trade[] {
  const trades: Trade[] = [];
  const superTrend = calculateSuperTrend(highs, lows, closes, 10, 3);
  const rsi = calculateRSI(closes, 14);
  const ema50 = calculateEMA(closes, 50);
  const atr = calculateATR(highs, lows, closes, 14);
  
  let position: 'LONG' | 'SHORT' | null = null;
  let entryPrice = 0;
  let entryTime = 0;
  let stopLoss = 0;
  let takeProfit = 0;
  let highestSinceEntry = 0;
  let trailingStop = 0;
  let lastTrend: 'up' | 'down' | null = null;
  
  for (let i = 100; i < closes.length; i++) {
    const price = closes[i];
    const currTrend = superTrend.trends[i];
    
    // ENTRY CONDITIONS - SuperTrend trend değişimi
    if (!position) {
      // LONG: SuperTrend UP'a döndü
      if (currTrend === 'up' && lastTrend === 'down') {
        position = 'LONG';
        entryPrice = price * (1 + SLIPPAGE);
        entryTime = i;
        stopLoss = price - atr[i] * 2;
        takeProfit = price + atr[i] * 4;
        highestSinceEntry = price;
        trailingStop = stopLoss;
      }
      // SHORT: SuperTrend DOWN'a döndü
      else if (currTrend === 'down' && lastTrend === 'up') {
        position = 'SHORT';
        entryPrice = price * (1 - SLIPPAGE);
        entryTime = i;
        stopLoss = price + atr[i] * 2;
        takeProfit = price - atr[i] * 4;
        highestSinceEntry = price;
        trailingStop = stopLoss;
      }
    }
    // EXIT CONDITIONS
    else if (position) {
      let exit = false;
      let exitPrice = price;
      let reason = '';
      
      if (position === 'LONG') {
        // Trailing stop
        if (price > highestSinceEntry) {
          highestSinceEntry = price;
          const newTrailingStop = price - atr[i] * 2;
          if (newTrailingStop > trailingStop) {
            trailingStop = newTrailingStop;
          }
        }
        
        if (price <= stopLoss) {
          exit = true;
          exitPrice = stopLoss;
          reason = 'Initial SL';
        } else if (price <= trailingStop && trailingStop > stopLoss) {
          exit = true;
          exitPrice = trailingStop;
          reason = 'Trailing Stop';
        } else if (price >= takeProfit) {
          exit = true;
          exitPrice = takeProfit;
          reason = 'TP Hit';
        } else if (currTrend === 'down') {
          exit = true;
          reason = 'Trend Reversal';
        }
      } else {
        // SHORT
        if (price < highestSinceEntry || highestSinceEntry === 0) {
          highestSinceEntry = price;
          const newTrailingStop = price + atr[i] * 2;
          if (newTrailingStop < trailingStop || trailingStop === 0) {
            trailingStop = newTrailingStop;
          }
        }
        
        if (price >= stopLoss) {
          exit = true;
          exitPrice = stopLoss;
          reason = 'Initial SL';
        } else if (price >= trailingStop && trailingStop < stopLoss) {
          exit = true;
          exitPrice = trailingStop;
          reason = 'Trailing Stop';
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
    
    lastTrend = currTrend;
  }
  
  return trades;
}

// 2. MACD MOMENTUM STRATEGY
function runMACDMomentum(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[]
): Trade[] {
  const trades: Trade[] = [];
  const macd = calculateMACD(closes, 12, 26, 9);
  const ema200 = calculateEMA(closes, 200);
  const rsi = calculateRSI(closes, 14);
  const atr = calculateATR(highs, lows, closes, 14);
  
  let position: 'LONG' | 'SHORT' | null = null;
  let entryPrice = 0;
  let entryTime = 0;
  let stopLoss = 0;
  let takeProfit = 0;
  
  for (let i = 200; i < closes.length; i++) {
    const price = closes[i];
    const prevHist = macd.histogram[i - 1];
    const currHist = macd.histogram[i];
    const prevMacd = macd.macd[i - 1];
    const prevSignal = macd.signal[i - 1];
    const currMacd = macd.macd[i];
    const currSignal = macd.signal[i];
    
    // Histogram crossing zero upward
    const histCrossUp = prevHist < 0 && currHist > 0;
    const histCrossDown = prevHist > 0 && currHist < 0;
    // MACD cross signal
    const macdCrossUp = prevMacd < prevSignal && currMacd > currSignal;
    const macdCrossDown = prevMacd > prevSignal && currMacd < currSignal;
    
    if (!position) {
      // LONG: MACD cross up + above EMA200 + RSI not overbought
      if ((histCrossUp || macdCrossUp) && price > ema200[i] && rsi[i] < 70) {
        position = 'LONG';
        entryPrice = price * (1 + SLIPPAGE);
        entryTime = i;
        stopLoss = price - atr[i] * 2;
        takeProfit = price + atr[i] * 4;
      }
      // SHORT: MACD cross down + below EMA200 + RSI not oversold
      else if ((histCrossDown || macdCrossDown) && price < ema200[i] && rsi[i] > 30) {
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
        } else if (macdCrossDown && currHist < 0) {
          exit = true;
          reason = 'MACD Reversal';
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
        } else if (macdCrossUp && currHist > 0) {
          exit = true;
          reason = 'MACD Reversal';
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

// 3. ICHIMOKU CLOUD STRATEGY
function runIchimokuCloud(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[]
): Trade[] {
  const trades: Trade[] = [];
  const ichimoku = calculateIchimoku(highs, lows, closes);
  const rsi = calculateRSI(closes, 14);
  const atr = calculateATR(highs, lows, closes, 14);
  
  let position: 'LONG' | 'SHORT' | null = null;
  let entryPrice = 0;
  let entryTime = 0;
  let stopLoss = 0;
  let takeProfit = 0;
  
  for (let i = 100; i < closes.length; i++) {
    const price = closes[i];
    const prevTenkan = ichimoku.tenkan[i - 1];
    const prevKijun = ichimoku.kijun[i - 1];
    const currTenkan = ichimoku.tenkan[i];
    const currKijun = ichimoku.kijun[i];
    
    // TK Cross
    const tkCrossUp = prevTenkan <= prevKijun && currTenkan > currKijun;
    const tkCrossDown = prevTenkan >= prevKijun && currTenkan < currKijun;
    
    if (!position) {
      // LONG: TK Cross Up + Above Cloud + RSI not overbought
      if (tkCrossUp && ichimoku.cloud[i] === 'above' && rsi[i] < 70) {
        position = 'LONG';
        entryPrice = price * (1 + SLIPPAGE);
        entryTime = i;
        stopLoss = price - atr[i] * 2;
        takeProfit = price + atr[i] * 4;
      }
      // SHORT: TK Cross Down + Below Cloud + RSI not oversold
      else if (tkCrossDown && ichimoku.cloud[i] === 'below' && rsi[i] > 30) {
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
        } else if (tkCrossDown || ichimoku.cloud[i] === 'below') {
          exit = true;
          reason = 'Ichimoku Reversal';
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
        } else if (tkCrossUp || ichimoku.cloud[i] === 'above') {
          exit = true;
          reason = 'Ichimoku Reversal';
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

// 4. STOCHASTIC RSI MEAN REVERSION
function runStochRSIMeanReversion(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[]
): Trade[] {
  const trades: Trade[] = [];
  const stoch = calculateStochastic(highs, lows, closes, 14, 3, 3);
  const ema100 = calculateEMA(closes, 100);
  const bb = calculateBollingerBands(closes, 20, 2);
  const atr = calculateATR(highs, lows, closes, 14);
  
  let position: 'LONG' | 'SHORT' | null = null;
  let entryPrice = 0;
  let entryTime = 0;
  let stopLoss = 0;
  let takeProfit = 0;
  
  for (let i = 100; i < closes.length; i++) {
    const price = closes[i];
    const prevK = stoch.k[i - 1];
    const currK = stoch.k[i];
    const prevD = stoch.d[i - 1];
    const currD = stoch.d[i];
    
    // Stochastic cross
    const crossUp = prevK < prevD && currK > currD;
    const crossDown = prevK > prevD && currK < currD;
    
    if (!position) {
      // LONG: Stochastic oversold + cross up + price near lower BB
      if (crossUp && currK < 25 && price <= bb.lower[i] * 1.02) {
        position = 'LONG';
        entryPrice = price * (1 + SLIPPAGE);
        entryTime = i;
        stopLoss = price - atr[i] * 1.5;
        takeProfit = bb.middle[i];
      }
      // SHORT: Stochastic overbought + cross down + price near upper BB
      else if (crossDown && currK > 75 && price >= bb.upper[i] * 0.98) {
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
        } else if (price >= takeProfit) {
          exit = true;
          exitPrice = takeProfit;
          reason = 'TP Hit';
        } else if (crossDown && currK > 70) {
          exit = true;
          reason = 'Stoch Overbought';
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
        } else if (crossUp && currK < 30) {
          exit = true;
          reason = 'Stoch Oversold';
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

// 5. TRIPLE EMA MOMENTUM
function runTripleEMAMomentum(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[]
): Trade[] {
  const trades: Trade[] = [];
  const ema5 = calculateEMA(closes, 5);
  const ema13 = calculateEMA(closes, 13);
  const ema21 = calculateEMA(closes, 21);
  const ema200 = calculateEMA(closes, 200);
  const atr = calculateATR(highs, lows, closes, 14);
  const adx = calculateADX(highs, lows, closes, 14);
  
  let position: 'LONG' | 'SHORT' | null = null;
  let entryPrice = 0;
  let entryTime = 0;
  let stopLoss = 0;
  let takeProfit = 0;
  
  for (let i = 200; i < closes.length; i++) {
    const price = closes[i];
    
    // Triple EMA alignment
    const bullishAlignment = ema5[i] > ema13[i] && ema13[i] > ema21[i];
    const bearishAlignment = ema5[i] < ema13[i] && ema13[i] < ema21[i];
    const prevBullish = ema5[i - 1] > ema13[i - 1] && ema13[i - 1] > ema21[i - 1];
    const prevBearish = ema5[i - 1] < ema13[i - 1] && ema13[i - 1] < ema21[i - 1];
    
    // Trend change detection
    const trendUp = !prevBullish && bullishAlignment;
    const trendDown = !prevBearish && bearishAlignment;
    
    if (!position) {
      // LONG: Triple EMA bullish + above EMA200 + ADX > 20 (trending)
      if (trendUp && price > ema200[i] && adx[i] > 20) {
        position = 'LONG';
        entryPrice = price * (1 + SLIPPAGE);
        entryTime = i;
        stopLoss = price - atr[i] * 2;
        takeProfit = price + atr[i] * 3;
      }
      // SHORT: Triple EMA bearish + below EMA200 + ADX > 20
      else if (trendDown && price < ema200[i] && adx[i] > 20) {
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
        } else if (trendDown || bearishAlignment) {
          exit = true;
          reason = 'EMA Reversal';
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
        } else if (trendUp || bullishAlignment) {
          exit = true;
          reason = 'EMA Reversal';
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

// 6. ATR CHANNEL BREAKOUT
function runATRChannelBreakout(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[]
): Trade[] {
  const trades: Trade[] = [];
  const atr = calculateATR(highs, lows, closes, 14);
  const sma = calculateSMA(closes, 20);
  
  // ATR Channel
  const upperChannel: number[] = [];
  const lowerChannel: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    upperChannel.push(sma[i] + atr[i] * 2);
    lowerChannel.push(sma[i] - atr[i] * 2);
  }
  
  let position: 'LONG' | 'SHORT' | null = null;
  let entryPrice = 0;
  let entryTime = 0;
  let stopLoss = 0;
  let takeProfit = 0;
  
  // Volume average
  const avgVolumes: number[] = [];
  for (let i = 0; i < volumes.length; i++) {
    if (i < 20) avgVolumes.push(volumes[i]);
    else avgVolumes.push(volumes.slice(i - 20, i).reduce((a, b) => a + b, 0) / 20);
  }
  
  for (let i = 50; i < closes.length; i++) {
    const price = closes[i];
    const prevPrice = closes[i - 1];
    const volumeOk = volumes[i] > avgVolumes[i] * 1.3;
    
    if (!position) {
      // LONG: Break above upper channel with volume
      if (price > upperChannel[i] && prevPrice <= upperChannel[i - 1] && volumeOk) {
        position = 'LONG';
        entryPrice = price * (1 + SLIPPAGE);
        entryTime = i;
        stopLoss = sma[i];
        takeProfit = price + atr[i] * 3;
      }
      // SHORT: Break below lower channel with volume
      else if (price < lowerChannel[i] && prevPrice >= lowerChannel[i - 1] && volumeOk) {
        position = 'SHORT';
        entryPrice = price * (1 - SLIPPAGE);
        entryTime = i;
        stopLoss = sma[i];
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
        } else if (price < sma[i]) {
          exit = true;
          reason = 'Back to SMA';
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
        } else if (price > sma[i]) {
          exit = true;
          reason = 'Back to SMA';
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

// 7. CONFLUENCE MASTER - En katı strateji
function runConfluenceMaster(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[]
): Trade[] {
  const trades: Trade[] = [];
  
  // Calculate all indicators
  const superTrend = calculateSuperTrend(highs, lows, closes, 10, 3);
  const rsi = calculateRSI(closes, 14);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const macd = calculateMACD(closes, 12, 26, 9);
  const atr = calculateATR(highs, lows, closes, 14);
  const adx = calculateADX(highs, lows, closes, 14);
  const bb = calculateBollingerBands(closes, 20, 2);
  
  let position: 'LONG' | 'SHORT' | null = null;
  let entryPrice = 0;
  let entryTime = 0;
  let stopLoss = 0;
  let takeProfit = 0;
  let highestSinceEntry = 0;
  let trailingStop = 0;
  
  for (let i = 200; i < closes.length; i++) {
    const price = closes[i];
    
    // Calculate confluence score
    let bullishScore = 0;
    let bearishScore = 0;
    
    // 1. SuperTrend (20 pts)
    if (superTrend.trends[i] === 'up') bullishScore += 20;
    else bearishScore += 20;
    
    // 2. EMA alignment (20 pts)
    if (price > ema50[i] && ema50[i] > ema200[i]) bullishScore += 20;
    else if (price < ema50[i] && ema50[i] < ema200[i]) bearishScore += 20;
    
    // 3. RSI (15 pts)
    if (rsi[i] > 50 && rsi[i] < 70) bullishScore += 15;
    else if (rsi[i] < 50 && rsi[i] > 30) bearishScore += 15;
    
    // 4. MACD (15 pts)
    if (macd.histogram[i] > 0 && macd.macd[i] > macd.signal[i]) bullishScore += 15;
    else if (macd.histogram[i] < 0 && macd.macd[i] < macd.signal[i]) bearishScore += 15;
    
    // 5. ADX trend strength (10 pts)
    if (adx[i] > 25) {
      if (superTrend.trends[i] === 'up') bullishScore += 10;
      else bearishScore += 10;
    }
    
    // 6. Bollinger position (10 pts)
    if (price > bb.middle[i]) bullishScore += 10;
    else bearishScore += 10;
    
    // 7. Price momentum (10 pts)
    if (price > closes[i - 5]) bullishScore += 10;
    else bearishScore += 10;
    
    if (!position) {
      // LONG: Need 65+ bullish confluence + trend confirmation
      if (bullishScore >= 65 && 
          superTrend.trends[i] === 'up' && 
          price > ema200[i] &&
          macd.histogram[i] > 0) {
        position = 'LONG';
        entryPrice = price * (1 + SLIPPAGE);
        entryTime = i;
        stopLoss = price - atr[i] * 1.5;
        takeProfit = price + atr[i] * 4;
        highestSinceEntry = price;
        trailingStop = stopLoss;
      }
      // SHORT: Need 65+ bearish confluence
      else if (bearishScore >= 65 && 
               superTrend.trends[i] === 'down' && 
               price < ema200[i] &&
               macd.histogram[i] < 0) {
        position = 'SHORT';
        entryPrice = price * (1 - SLIPPAGE);
        entryTime = i;
        stopLoss = price + atr[i] * 1.5;
        takeProfit = price - atr[i] * 4;
        highestSinceEntry = price;
        trailingStop = stopLoss;
      }
    }
    else if (position) {
      let exit = false;
      let exitPrice = price;
      let reason = '';
      
      if (position === 'LONG') {
        // Trailing stop
        if (price > highestSinceEntry) {
          highestSinceEntry = price;
          const newTrailingStop = price - atr[i] * 1.5;
          if (newTrailingStop > trailingStop) trailingStop = newTrailingStop;
        }
        
        if (price <= stopLoss) {
          exit = true;
          exitPrice = stopLoss;
          reason = 'Initial SL';
        } else if (price <= trailingStop && trailingStop > stopLoss) {
          exit = true;
          exitPrice = trailingStop;
          reason = 'Trailing Stop';
        } else if (price >= takeProfit) {
          exit = true;
          exitPrice = takeProfit;
          reason = 'TP Hit';
        } else if (bearishScore >= 60 && superTrend.trends[i] === 'down') {
          exit = true;
          reason = 'Confluence Reversal';
        }
      } else {
        if (price < highestSinceEntry || highestSinceEntry === 0) {
          highestSinceEntry = price;
          const newTrailingStop = price + atr[i] * 1.5;
          if (newTrailingStop < trailingStop || trailingStop === 0) trailingStop = newTrailingStop;
        }
        
        if (price >= stopLoss) {
          exit = true;
          exitPrice = stopLoss;
          reason = 'Initial SL';
        } else if (price >= trailingStop && trailingStop < stopLoss) {
          exit = true;
          exitPrice = trailingStop;
          reason = 'Trailing Stop';
        } else if (price <= takeProfit) {
          exit = true;
          exitPrice = takeProfit;
          reason = 'TP Hit';
        } else if (bullishScore >= 60 && superTrend.trends[i] === 'up') {
          exit = true;
          reason = 'Confluence Reversal';
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
// BACKTEST METRICS
// ========================================

function calculateMetrics(trades: Trade[]) {
  if (trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalPnlPercent: 0,
      avgWin: 0,
      avgLoss: 0,
      maxDrawdown: 0,
      profitFactor: 0,
      sharpeRatio: 0,
    };
  }
  
  const wins = trades.filter(t => t.pnl > 0);
  const losses = trades.filter(t => t.pnl < 0);
  
  const totalPnlPercent = trades.reduce((sum, t) => sum + t.pnlPercent, 0);
  const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnlPercent, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnlPercent, 0) / losses.length) : 0;
  
  // Equity curve for drawdown
  let equity = 100;
  let peak = 100;
  let maxDrawdown = 0;
  
  for (const trade of trades) {
    equity *= (1 + trade.pnlPercent / 100);
    if (equity > peak) peak = equity;
    const drawdown = ((peak - equity) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  // Sharpe
  const returns = trades.map(t => t.pnlPercent);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
  
  // Profit Factor
  const grossProfit = wins.reduce((sum, t) => sum + t.pnlPercent, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnlPercent, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;
  
  return {
    totalTrades: trades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    winRate: (wins.length / trades.length) * 100,
    totalPnlPercent: Math.round(totalPnlPercent * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
  };
}

// ========================================
// API HANDLER
// ========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols = ['BTCUSDT', 'ETHUSDT'], timeframes = ['1h', '4h'] } = body;
    
    const strategies = [
      { name: 'StochRSIMeanReversion', fn: runStochRSIMeanReversion, description: 'Stochastic + Bollinger Bands Mean Reversion' },
      { name: 'SmartTrendFollower', fn: runSmartTrendFollower, description: 'SuperTrend + RSI + EMA + Trailing Stop' },
      { name: 'ConfluenceMaster', fn: runConfluenceMaster, description: 'Multi-Indicator Confluence (7 indicators, 100pts)' },
      { name: 'MACDMomentum', fn: runMACDMomentum, description: 'MACD Cross + EMA200 Trend Filter + RSI' },
      { name: 'IchimokuCloud', fn: runIchimokuCloud, description: 'TK Cross + Cloud Position + RSI Filter' },
      { name: 'TripleEMAMomentum', fn: runTripleEMAMomentum, description: 'Triple EMA Alignment + ADX Trend Strength' },
      { name: 'ATRChannelBreakout', fn: runATRChannelBreakout, description: 'ATR Channel Breakout with Volume Confirmation' },
    ];
    
    const results: any[] = [];
    
    // Test each strategy on each symbol/timeframe
    for (const symbol of symbols) {
      for (const timeframe of timeframes) {
        // Fetch data
        const limit = 1000;
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`
        );
        
        if (!response.ok) continue;
        
        const klines = await response.json();
        const closes = klines.map((k: any) => parseFloat(k[4]));
        const highs = klines.map((k: any) => parseFloat(k[2]));
        const lows = klines.map((k: any) => parseFloat(k[3]));
        const volumes = klines.map((k: any) => parseFloat(k[5]));
        const openTimes = klines.map((k: any) => k[0]);
        
        // Run each strategy
        for (const strategy of strategies) {
          const trades = strategy.fn(closes, highs, lows, volumes);
          const metrics = calculateMetrics(trades);
          
          results.push({
            strategy: strategy.name,
            description: strategy.description,
            symbol,
            timeframe,
            ...metrics,
            period: {
              start: new Date(openTimes[0]).toISOString(),
              end: new Date(openTimes[openTimes.length - 1]).toISOString(),
              candles: klines.length,
            },
          });
        }
      }
    }
    
    // Sort by winrate, then by profit factor
    results.sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.profitFactor !== a.profitFactor) return b.profitFactor - a.profitFactor;
      return b.totalPnlPercent - a.totalPnlPercent;
    });
    
    // Group by strategy and calculate average performance
    const strategySummary: Record<string, any> = {};
    for (const result of results) {
      if (!strategySummary[result.strategy]) {
        strategySummary[result.strategy] = {
          strategy: result.strategy,
          description: result.description,
          avgWinRate: 0,
          avgProfitFactor: 0,
          avgPnl: 0,
          totalTrades: 0,
          avgDrawdown: 0,
          tests: 0,
          wins: 0,
        };
      }
      
      const s = strategySummary[result.strategy];
      s.avgWinRate += result.winRate;
      s.avgProfitFactor += result.profitFactor;
      s.avgPnl += result.totalPnlPercent;
      s.totalTrades += result.totalTrades;
      s.avgDrawdown += result.maxDrawdown;
      s.tests += 1;
      if (result.winRate > 50) s.wins += 1;
    }
    
    // Calculate averages
    const summaryArray = Object.values(strategySummary).map((s: any) => ({
      ...s,
      avgWinRate: Math.round((s.avgWinRate / s.tests) * 100) / 100,
      avgProfitFactor: Math.round((s.avgProfitFactor / s.tests) * 100) / 100,
      avgPnl: Math.round((s.avgPnl / s.tests) * 100) / 100,
      avgDrawdown: Math.round((s.avgDrawdown / s.tests) * 100) / 100,
      consistency: Math.round((s.wins / s.tests) * 100),
    }));
    
    summaryArray.sort((a: any, b: any) => {
      if (b.avgWinRate !== a.avgWinRate) return b.avgWinRate - a.avgWinRate;
      return b.avgProfitFactor - a.avgProfitFactor;
    });
    
    // Find best overall strategy
    const bestStrategy = summaryArray[0];
    
    // Find best specific configuration
    const bestConfig = results[0];
    
    return NextResponse.json({
      success: true,
      data: {
        bestStrategy,
        bestConfig,
        strategyRankings: summaryArray,
        allResults: results.slice(0, 20), // Top 20 results
        testedAt: new Date().toISOString(),
        totalTests: results.length,
        settings: {
          commission: `${COMMISSION * 100}%`,
          slippage: `${SLIPPAGE * 100}%`,
          dataSource: 'Binance Real Data',
        },
      },
    });
    
  } catch (error) {
    console.error('Optimize error:', error);
    return NextResponse.json({
      success: false,
      error: 'Strateji optimizasyonu başarısız',
    }, { status: 500 });
  }
}
