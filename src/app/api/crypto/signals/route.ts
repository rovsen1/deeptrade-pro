import { NextRequest, NextResponse } from 'next/server';

// ============= TECHNICAL ANALYSIS FUNCTIONS =============

function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
  }
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;
  
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

function calculateEMAArray(prices: number[], period: number): number[] {
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

function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number; trend: string } {
  if (closes.length < 35) return { macd: 0, signal: 0, histogram: 0, trend: 'nötr' };
  
  const ema12Array = calculateEMAArray(closes, 12);
  const ema26Array = calculateEMAArray(closes, 26);
  
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(ema12Array[i] - ema26Array[i]);
  }
  
  const signalArray = calculateEMAArray(macdLine.slice(25), 9);
  const signal = signalArray[signalArray.length - 1];
  const macd = macdLine[macdLine.length - 1];
  const histogram = macd - signal;
  
  let trend = 'nötr';
  if (histogram > 0 && macd > 0) trend = 'yükseliş';
  else if (histogram < 0 && macd < 0) trend = 'düşüş';
  else if (histogram > 0) trend = 'pozitif dönüş';
  else trend = 'negatif dönüş';
  
  return { macd, signal, histogram, trend };
}

function calculateStochastic(highs: number[], lows: number[], closes: number[], period: number = 14): { k: number; d: number; signal: string } {
  if (closes.length < period + 3) return { k: 50, d: 50, signal: 'nötr' };
  
  const kValues: number[] = [];
  
  for (let i = period - 1; i < closes.length; i++) {
    const highSlice = highs.slice(i - period + 1, i + 1);
    const lowSlice = lows.slice(i - period + 1, i + 1);
    const highestHigh = Math.max(...highSlice);
    const lowestLow = Math.min(...lowSlice);
    const currentClose = closes[i];
    
    const k = highestHigh === lowestLow 
      ? 50 
      : ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    kValues.push(k);
  }
  
  const k = kValues[kValues.length - 1];
  const d = kValues.slice(-3).reduce((a, b) => a + b, 0) / 3;
  
  let signal = 'nötr';
  if (k < 20 && d < 20) signal = 'aşırı satım';
  else if (k > 80 && d > 80) signal = 'aşırı alım';
  else if (k > d && k < 50) signal = 'alım sinyali';
  else if (k < d && k > 50) signal = 'satım sinyali';
  
  return { k, d, signal };
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < closes.length; i++) {
    const highLow = highs[i] - lows[i];
    const highClose = Math.abs(highs[i] - closes[i - 1]);
    const lowClose = Math.abs(lows[i] - closes[i - 1]);
    trueRanges.push(Math.max(highLow, highClose, lowClose));
  }
  
  const atr = trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
  return atr;
}

function calculateVWAP(highs: number[], lows: number[], closes: number[], volumes: number[]): number {
  if (closes.length === 0) return 0;
  
  let sumPV = 0;
  let sumVolume = 0;
  
  const periods = Math.min(24, closes.length);
  
  for (let i = closes.length - periods; i < closes.length; i++) {
    const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
    sumPV += typicalPrice * volumes[i];
    sumVolume += volumes[i];
  }
  
  return sumVolume > 0 ? sumPV / sumVolume : closes[closes.length - 1];
}

// ============= NEW ADVANCED INDICATORS =============

// SuperTrend Indicator
function calculateSuperTrend(
  highs: number[], 
  lows: number[], 
  closes: number[], 
  period: number = 10, 
  multiplier: number = 3
): { value: number; trend: 'yükseliş' | 'düşüş'; signal: string } {
  if (closes.length < period + 1) return { value: closes[closes.length - 1], trend: 'yükseliş', signal: 'nötr' };
  
  const atrArray: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
    atrArray.push(tr);
  }
  
  const atr = atrArray.slice(-period).reduce((a, b) => a + b, 0) / period;
  
  const hl2 = (highs[highs.length - 1] + lows[lows.length - 1]) / 2;
  const upperBand = hl2 + multiplier * atr;
  const lowerBand = hl2 - multiplier * atr;
  
  const prevClose = closes[closes.length - 2];
  const currentClose = closes[closes.length - 1];
  
  let superTrend = lowerBand;
  let trend: 'yükseliş' | 'düşüş' = 'yükseliş';
  
  if (currentClose > lowerBand && prevClose <= lowerBand) {
    trend = 'yükseliş';
    superTrend = lowerBand;
  } else if (currentClose < upperBand && prevClose >= upperBand) {
    trend = 'düşüş';
    superTrend = upperBand;
  }
  
  const signal = trend === 'yükseliş' ? 'ALIM' : 'SATIM';
  
  return { value: superTrend, trend, signal };
}

// Ichimoku Cloud
function calculateIchimoku(
  highs: number[], 
  lows: number[], 
  closes: number[]
): { 
  tenkan: number; 
  kijun: number; 
  senkouA: number; 
  senkouB: number; 
  chikou: number;
  cloud: 'üstünde' | 'altında' | 'içinde';
  signal: string;
} {
  const defaultPrice = closes[closes.length - 1];
  
  // Tenkan-sen (9 period)
  const tenkanHigh = Math.max(...highs.slice(-9));
  const tenkanLow = Math.min(...lows.slice(-9));
  const tenkan = (tenkanHigh + tenkanLow) / 2;
  
  // Kijun-sen (26 period)
  const kijunHigh = Math.max(...highs.slice(-26));
  const kijunLow = Math.min(...lows.slice(-26));
  const kijun = (kijunHigh + kijunLow) / 2;
  
  // Senkou Span A (average of Tenkan and Kijun, plotted 26 periods ahead)
  const senkouA = (tenkan + kijun) / 2;
  
  // Senkou Span B (52 period average, plotted 26 periods ahead)
  const senkouBHigh = Math.max(...highs.slice(-52));
  const senkouBLow = Math.min(...lows.slice(-52));
  const senkouB = (senkouBHigh + senkouBLow) / 2;
  
  // Chikou Span (current close plotted 26 periods back)
  const chikou = closes[closes.length - 1];
  
  // Current price position relative to cloud
  const currentPrice = closes[closes.length - 1];
  let cloud: 'üstünde' | 'altında' | 'içinde' = 'içinde';
  
  if (currentPrice > Math.max(senkouA, senkouB)) {
    cloud = 'üstünde';
  } else if (currentPrice < Math.min(senkouA, senkouB)) {
    cloud = 'altında';
  }
  
  // Signal generation
  let signal = 'nötr';
  if (tenkan > kijun && cloud === 'üstünde') {
    signal = 'güçlü ALIM';
  } else if (tenkan > kijun) {
    signal = 'ALIM';
  } else if (tenkan < kijun && cloud === 'altında') {
    signal = 'güçlü SATIM';
  } else if (tenkan < kijun) {
    signal = 'SATIM';
  }
  
  return { tenkan, kijun, senkouA, senkouB, chikou, cloud, signal };
}

// OBV (On Balance Volume)
function calculateOBV(closes: number[], volumes: number[]): { value: number; trend: string; divergence: string } {
  if (closes.length < 2) return { value: 0, trend: 'nötr', divergence: 'yok' };
  
  let obv = 0;
  const obvArray: number[] = [0];
  
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv += volumes[i];
    } else if (closes[i] < closes[i - 1]) {
      obv -= volumes[i];
    }
    obvArray.push(obv);
  }
  
  // Determine trend
  const obvMA20 = obvArray.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const trend = obv > obvMA20 ? 'yükseliş' : obv < obvMA20 ? 'düşüş' : 'yatay';
  
  // Check divergence (price vs OBV)
  const priceChange = closes[closes.length - 1] - closes[closes.length - 20];
  const obvChange = obvArray[obvArray.length - 1] - obvArray[obvArray.length - 20];
  
  let divergence = 'yok';
  if (priceChange > 0 && obvChange < 0) {
    divergence = 'negatif (dikkat)';
  } else if (priceChange < 0 && obvChange > 0) {
    divergence = 'pozitif (fırsat)';
  }
  
  return { value: obv, trend, divergence };
}

// ADX (Average Directional Index)
function calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): { value: number; trend: 'güçlü yükseliş' | 'güçlü düşüş' | 'zayıf' | 'yok'; diPlus: number; diMinus: number } {
  if (closes.length < period * 2) return { value: 0, trend: 'yok', diPlus: 0, diMinus: 0 };
  
  const trArray: number[] = [];
  const plusDMArray: number[] = [];
  const minusDMArray: number[] = [];
  
  for (let i = 1; i < closes.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trArray.push(tr);
    
    const plusDM = highs[i] - highs[i - 1] > lows[i - 1] - lows[i] 
      ? Math.max(highs[i] - highs[i - 1], 0) 
      : 0;
    plusDMArray.push(plusDM);
    
    const minusDM = lows[i - 1] - lows[i] > highs[i] - highs[i - 1] 
      ? Math.max(lows[i - 1] - lows[i], 0) 
      : 0;
    minusDMArray.push(minusDM);
  }
  
  const atr = trArray.slice(-period).reduce((a, b) => a + b, 0) / period;
  const plusDM = plusDMArray.slice(-period).reduce((a, b) => a + b, 0) / period;
  const minusDM = minusDMArray.slice(-period).reduce((a, b) => a + b, 0) / period;
  
  const diPlus = (plusDM / atr) * 100;
  const diMinus = (minusDM / atr) * 100;
  const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
  
  let trend: 'güçlü yükseliş' | 'güçlü düşüş' | 'zayıf' | 'yok' = 'yok';
  if (dx > 25) {
    if (diPlus > diMinus) trend = 'güçlü yükseliş';
    else trend = 'güçlü düşüş';
  } else if (dx > 20) {
    trend = 'zayıf';
  }
  
  return { value: dx, trend, diPlus, diMinus };
}

// Volume Profile
function calculateVolumeProfile(
  highs: number[], 
  lows: number[], 
  closes: number[], 
  volumes: number[], 
  levels: number = 10
): { price: number; volume: number; type: 'bid' | 'ask' }[] {
  if (closes.length < 10) return [];
  
  const minPrice = Math.min(...lows.slice(-50));
  const maxPrice = Math.max(...highs.slice(-50));
  const priceStep = (maxPrice - minPrice) / levels;
  
  const profile: Map<number, { bid: number; ask: number }> = new Map();
  
  for (let i = closes.length - 50; i < closes.length; i++) {
    const levelIndex = Math.floor((closes[i] - minPrice) / priceStep);
    const level = minPrice + levelIndex * priceStep;
    
    if (!profile.has(level)) {
      profile.set(level, { bid: 0, ask: 0 });
    }
    
    const data = profile.get(level)!;
    if (closes[i] > closes[i - 1] || i === closes.length - 50) {
      data.bid += volumes[i];
    } else {
      data.ask += volumes[i];
    }
  }
  
  const result: { price: number; volume: number; type: 'bid' | 'ask' }[] = [];
  profile.forEach((data, price) => {
    if (data.bid > data.ask) {
      result.push({ price, volume: data.bid, type: 'bid' });
    } else {
      result.push({ price, volume: data.ask, type: 'ask' });
    }
  });
  
  return result.sort((a, b) => b.volume - a.volume).slice(0, 5);
}

function detectVolumeSpike(volumes: number[]): { isSpike: boolean; ratio: number } {
  if (volumes.length < 20) return { isSpike: false, ratio: 1 };
  
  const avgVolume = volumes.slice(-20, -1).reduce((a, b) => a + b, 0) / 19;
  const currentVolume = volumes[volumes.length - 1];
  const ratio = currentVolume / avgVolume;
  
  return { isSpike: ratio > 2, ratio };
}

function calculateSupportResistance(highs: number[], lows: number[]): { support: number; resistance: number } {
  const period = 20;
  if (highs.length < period) return { support: 0, resistance: 0 };
  
  const resistance = Math.max(...highs.slice(-period));
  const support = Math.min(...lows.slice(-period));
  
  return { support, resistance };
}

// ============= SIGNAL GENERATION FUNCTIONS =============

function generateScalpSignal(data: {
  rsi: number;
  ema9: number;
  ema21: number;
  macd: { macd: number; signal: number; histogram: number; trend: string };
  stochastic: { k: number; d: number; signal: string };
  atr: number;
  vwap: number;
  superTrend: { value: number; trend: string; signal: string };
  obv: { value: number; trend: string; divergence: string };
  volume: { isSpike: boolean; ratio: number };
  price: number;
}): { signal: 'AL' | 'SAT' | 'BEKLE'; strength: number; reasons: string[]; score: number } {
  const { rsi, ema9, ema21, macd, stochastic, vwap, superTrend, obv, volume, price } = data;
  let score = 0;
  const reasons: string[] = [];
  
  // RSI Analysis (weight: 20)
  if (rsi < 25) { score += 25; reasons.push('RSI aşırı satım'); }
  else if (rsi < 30) { score += 20; reasons.push('RSI düşük'); }
  else if (rsi > 75) { score -= 25; reasons.push('RSI aşırı alım'); }
  else if (rsi > 70) { score -= 20; reasons.push('RSI yüksek'); }
  
  // Stochastic (weight: 15)
  if (stochastic.k < 20) { score += 15; reasons.push('Stoch aşırı satım'); }
  else if (stochastic.k > 80) { score -= 15; reasons.push('Stoch aşırı alım'); }
  
  // SuperTrend (weight: 20)
  if (superTrend.trend === 'yükseliş') { 
    score += 20; 
    reasons.push('SuperTrend yükseliş'); 
  } else { 
    score -= 20; 
    reasons.push('SuperTrend düşüş'); 
  }
  
  // EMA Cross (weight: 10)
  if (ema9 > ema21) { score += 10; reasons.push('EMA yukarı'); }
  else { score -= 10; reasons.push('EMA aşağı'); }
  
  // MACD (weight: 10)
  if (macd.histogram > 0) { score += 10; reasons.push('MACD pozitif'); }
  else { score -= 10; reasons.push('MACD negatif'); }
  
  // OBV (weight: 10)
  if (obv.trend === 'yükseliş') { score += 10; reasons.push('OBV yükseliş'); }
  else if (obv.trend === 'düşüş') { score -= 10; reasons.push('OBV düşüş'); }
  if (obv.divergence === 'pozitif (fırsat)') { score += 15; reasons.push('OBV pozitif diverjans'); }
  
  // VWAP (weight: 5)
  if (price < vwap * 0.98) { score += 5; reasons.push('VWAP altı'); }
  else if (price > vwap * 1.02) { score -= 5; reasons.push('VWAP üstü'); }
  
  // Volume (weight: 10)
  if (volume.isSpike) { score += 10; reasons.push(`Hacim ${volume.ratio.toFixed(1)}x`); }
  
  const signal: 'AL' | 'SAT' | 'BEKLE' = score >= 50 ? 'AL' : score <= -50 ? 'SAT' : 'BEKLE';
  const strength = Math.min(100, Math.abs(score) + 20);
  
  return { signal, strength, reasons, score };
}

function generateSwingSignal(data: {
  rsi: number;
  ema50: number;
  ema200: number;
  macd: { macd: number; signal: number; histogram: number; trend: string };
  stochastic: { k: number; d: number; signal: string };
  ichimoku: { tenkan: number; kijun: number; cloud: string; signal: string };
  adx: { value: number; trend: string; diPlus: number; diMinus: number };
  obv: { value: number; trend: string; divergence: string };
  price: number;
  support: number;
  resistance: number;
}): { signal: 'AL' | 'SAT' | 'BEKLE'; strength: number; reasons: string[]; score: number } {
  const { rsi, ema50, ema200, macd, ichimoku, adx, obv, price, support, resistance } = data;
  let score = 0;
  const reasons: string[] = [];
  
  // EMA Trend (Golden/Death Cross) (weight: 25)
  if (ema50 > ema200) { 
    score += 25; 
    reasons.push('Golden Cross'); 
  } else { 
    score -= 25; 
    reasons.push('Death Cross'); 
  }
  
  // Ichimoku (weight: 25)
  if (ichimoku.cloud === 'üstünde') { 
    score += 15; 
    reasons.push('Fiyat bulut üstü'); 
  } else if (ichimoku.cloud === 'altında') { 
    score -= 15; 
    reasons.push('Fiyat bulut altı'); 
  }
  if (ichimoku.tenkan > ichimoku.kijun) { 
    score += 10; 
    reasons.push('TK > KJ'); 
  } else { 
    score -= 10; 
    reasons.push('TK < KJ'); 
  }
  
  // ADX Trend Strength (weight: 15)
  if (adx.value > 25) {
    if (adx.diPlus > adx.diMinus) { 
      score += 15; 
      reasons.push('ADX güçlü yükseliş'); 
    } else { 
      score -= 15; 
      reasons.push('ADX güçlü düşüş'); 
    }
  }
  
  // MACD (weight: 15)
  if (macd.macd > 0 && macd.signal > 0) { 
    score += 15; 
    reasons.push('MACD sıfır üstü'); 
  } else if (macd.macd < 0 && macd.signal < 0) { 
    score -= 15; 
    reasons.push('MACD sıfır altı'); 
  }
  
  // OBV (weight: 10)
  if (obv.trend === 'yükseliş') { score += 10; reasons.push('OBV yükseliş'); }
  if (obv.divergence === 'pozitif (fırsat)') { score += 10; reasons.push('Pozitif diverjans'); }
  if (obv.divergence === 'negatif (dikkat)') { score -= 10; reasons.push('Negatif diverjans'); }
  
  // Support/Resistance (weight: 10)
  const supportDistance = ((price - support) / support) * 100;
  if (supportDistance < 3) { score += 10; reasons.push('Destek yakın'); }
  
  // RSI (weight: 10)
  if (rsi < 35) { score += 10; reasons.push('RSI düşük'); }
  else if (rsi > 65) { score -= 10; reasons.push('RSI yüksek'); }
  
  const signal: 'AL' | 'SAT' | 'BEKLE' = score >= 55 ? 'AL' : score <= -55 ? 'SAT' : 'BEKLE';
  const strength = Math.min(100, Math.abs(score) + 15);
  
  return { signal, strength, reasons, score };
}

// ============= MAIN API HANDLER =============

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const type = searchParams.get('type') || 'all';

    const timeframes = type === 'all' 
      ? ['5m', '15m', '1h', '4h', '1d']
      : type === 'scalp' 
        ? ['5m', '15m', '1h'] 
        : ['4h', '1d'];

    const signals: {
      symbol: string;
      timeframe: string;
      type: 'scalp' | 'swing';
      signal: 'AL' | 'SAT' | 'BEKLE';
      strength: number;
      reasons: string[];
      price: number;
      indicators: Record<string, number | string | boolean>;
    }[] = [];

    for (const interval of timeframes) {
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`,
        { next: { revalidate: 30 } }
      );

      if (!response.ok) continue;

      const klines = await response.json();
      
      const closes = klines.map((k: (string | number)[]) => parseFloat(k[4] as string));
      const highs = klines.map((k: (string | number)[]) => parseFloat(k[2] as string));
      const lows = klines.map((k: (string | number)[]) => parseFloat(k[3] as string));
      const volumes = klines.map((k: (string | number)[]) => parseFloat(k[5] as string));
      
      const price = closes[closes.length - 1];
      const rsi = calculateRSI(closes);
      const ema9 = calculateEMA(closes, 9);
      const ema21 = calculateEMA(closes, 21);
      const ema50 = calculateEMA(closes, 50);
      const ema200 = calculateEMA(closes, 200);
      const macd = calculateMACD(closes);
      const stochastic = calculateStochastic(highs, lows, closes);
      const atr = calculateATR(highs, lows, closes);
      const vwap = calculateVWAP(highs, lows, closes, volumes);
      const superTrend = calculateSuperTrend(highs, lows, closes);
      const ichimoku = calculateIchimoku(highs, lows, closes);
      const obv = calculateOBV(closes, volumes);
      const adx = calculateADX(highs, lows, closes);
      const volume = detectVolumeSpike(volumes);
      const { support, resistance } = calculateSupportResistance(highs, lows);

      const isScalp = ['5m', '15m', '1h'].includes(interval);
      
      if (isScalp) {
        const scalpResult = generateScalpSignal({
          rsi, ema9, ema21, macd, stochastic, atr, vwap, superTrend, obv, volume, price
        });

        signals.push({
          symbol,
          timeframe: interval,
          type: 'scalp',
          signal: scalpResult.signal,
          strength: scalpResult.strength,
          reasons: scalpResult.reasons,
          price,
          indicators: {
            rsi: Math.round(rsi * 100) / 100,
            stochK: Math.round(stochastic.k * 100) / 100,
            superTrend: superTrend.trend,
            obvTrend: obv.trend,
            obvDivergence: obv.divergence,
            vwap: Math.round(vwap * 1000000) / 1000000,
            atr: Math.round(atr * 1000000) / 1000000,
            volumeRatio: Math.round(volume.ratio * 100) / 100,
            volumeSpike: volume.isSpike
          }
        });
      } else {
        const swingResult = generateSwingSignal({
          rsi, ema50, ema200, macd, stochastic, ichimoku, adx, obv, price, support, resistance
        });

        signals.push({
          symbol,
          timeframe: interval,
          type: 'swing',
          signal: swingResult.signal,
          strength: swingResult.strength,
          reasons: swingResult.reasons,
          price,
          indicators: {
            rsi: Math.round(rsi * 100) / 100,
            ichimokuCloud: ichimoku.cloud,
            ichimokuSignal: ichimoku.signal,
            adx: Math.round(adx.value * 100) / 100,
            adxTrend: adx.trend,
            obvTrend: obv.trend,
            obvDivergence: obv.divergence,
            support: Math.round(support * 1000000) / 1000000,
            resistance: Math.round(resistance * 1000000) / 1000000
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      symbol,
      signals,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Signal generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Sinyaller oluşturulamadı', timestamp: Date.now() },
      { status: 500 }
    );
  }
}
