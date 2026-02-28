import { NextRequest, NextResponse } from 'next/server';

// Technical Analysis Functions

function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  // Use smoothed average for remaining periods
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
  
  // Start with SMA for the first EMA value
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  // Apply EMA formula for remaining prices
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

function calculateEMAArray(prices: number[], period: number): number[] {
  if (prices.length < period) return prices;
  
  const multiplier = 2 / (period + 1);
  const emaArray: number[] = [];
  
  // Start with SMA for the first EMA value
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  // Fill initial positions with the SMA
  for (let i = 0; i < period - 1; i++) {
    emaArray.push(ema);
  }
  emaArray.push(ema);
  
  // Apply EMA formula for remaining prices
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
    emaArray.push(ema);
  }
  
  return emaArray;
}

function calculateMACD(closes: number[]): { macd: number; signal: number; histogram: number; trend: string } {
  if (closes.length < 35) {
    return { macd: 0, signal: 0, histogram: 0, trend: 'nötr' };
  }
  
  const ema12Array = calculateEMAArray(closes, 12);
  const ema26Array = calculateEMAArray(closes, 26);
  
  // Calculate MACD line (EMA12 - EMA26)
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(ema12Array[i] - ema26Array[i]);
  }
  
  // Calculate Signal line (9-period EMA of MACD line)
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

function calculateBollingerBands(closes: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number; bandwidth: number } {
  if (closes.length < period) {
    const price = closes[closes.length - 1] || 0;
    return { upper: price * 1.02, middle: price, lower: price * 0.98, bandwidth: 0 };
  }
  
  const sma = closes.slice(-period).reduce((a, b) => a + b, 0) / period;
  const variance = closes.slice(-period).reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period;
  const std = Math.sqrt(variance);
  
  const upper = sma + stdDev * std;
  const lower = sma - stdDev * std;
  const bandwidth = ((upper - lower) / sma) * 100;
  
  return { upper, middle: sma, lower, bandwidth };
}

function calculateSupportResistance(highs: number[], lows: number[], closes: number[]): { support: number; resistance: number } {
  const period = 20;
  if (highs.length < period) {
    return { support: closes[closes.length - 1] * 0.95, resistance: closes[closes.length - 1] * 1.05 };
  }
  
  // Find recent swing highs and lows
  const recentHighs = highs.slice(-period);
  const recentLows = lows.slice(-period);
  
  const resistance = Math.max(...recentHighs);
  const support = Math.min(...recentLows);
  
  return { support, resistance };
}

function detectVolumeSpike(volumes: number[]): { isSpike: boolean; ratio: number } {
  if (volumes.length < 20) return { isSpike: false, ratio: 1 };
  
  const avgVolume = volumes.slice(-20, -1).reduce((a, b) => a + b, 0) / 19;
  const currentVolume = volumes[volumes.length - 1];
  const ratio = currentVolume / avgVolume;
  
  return { isSpike: ratio > 2, ratio };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = searchParams.get('interval') || '1h';

    // Fetch klines data
    const klinesResponse = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`,
      { next: { revalidate: 30 } }
    );

    if (!klinesResponse.ok) {
      throw new Error('Binance API error');
    }

    const klinesData = await klinesResponse.json();

    if (!Array.isArray(klinesData) || klinesData.length === 0) {
      throw new Error('No klines data');
    }

    // Extract arrays
    const closes = klinesData.map((k: (string | number)[]) => parseFloat(k[4] as string));
    const highs = klinesData.map((k: (string | number)[]) => parseFloat(k[2] as string));
    const lows = klinesData.map((k: (string | number)[]) => parseFloat(k[3] as string));
    const volumes = klinesData.map((k: (string | number)[]) => parseFloat(k[5] as string));

    const currentPrice = closes[closes.length - 1];

    // Calculate all indicators
    const rsi = calculateRSI(closes);
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);
    const macd = calculateMACD(closes);
    const bollingerBands = calculateBollingerBands(closes);
    const supportResistance = calculateSupportResistance(highs, lows, closes);
    const volumeAnalysis = detectVolumeSpike(volumes);

    // Determine trend
    let trend = 'nötr';
    if (ema9 > ema21 && ema21 > ema50) trend = 'yükseliş';
    else if (ema9 < ema21 && ema21 < ema50) trend = 'düşüş';

    return NextResponse.json({
      success: true,
      symbol,
      interval,
      price: currentPrice,
      indicators: {
        rsi: Math.round(rsi * 100) / 100,
        ema9: Math.round(ema9 * 1000000) / 1000000,
        ema21: Math.round(ema21 * 1000000) / 1000000,
        ema50: Math.round(ema50 * 1000000) / 1000000,
        ema200: Math.round(ema200 * 1000000) / 1000000,
        macd: {
          macd: Math.round(macd.macd * 1000000) / 1000000,
          signal: Math.round(macd.signal * 1000000) / 1000000,
          histogram: Math.round(macd.histogram * 1000000) / 1000000,
          trend: macd.trend
        },
        bollingerBands: {
          upper: Math.round(bollingerBands.upper * 1000000) / 1000000,
          middle: Math.round(bollingerBands.middle * 1000000) / 1000000,
          lower: Math.round(bollingerBands.lower * 1000000) / 1000000,
          bandwidth: Math.round(bollingerBands.bandwidth * 100) / 100
        },
        support: Math.round(supportResistance.support * 1000000) / 1000000,
        resistance: Math.round(supportResistance.resistance * 1000000) / 1000000,
        volume: {
          current: volumes[volumes.length - 1],
          average: volumes.slice(-20).reduce((a, b) => a + b, 0) / 20,
          spike: volumeAnalysis.isSpike,
          ratio: Math.round(volumeAnalysis.ratio * 100) / 100
        }
      },
      trend,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Technical analysis error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Teknik analiz hesaplanamadı',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
