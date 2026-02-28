import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ========================================
// 🕯️ PATTERN RECOGNITION ENGINE
// DeepTrade Pro - Auto Chart Patterns
// ========================================

interface Pattern {
  type: string;
  bullish: boolean;
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  neckline?: number;
  points: { price: number; index: number }[];
}

// Local Min/Max finder
function findLocalExtrema(prices: number[], window: number = 5): { minima: number[]; maxima: number[] } {
  const minima: number[] = [];
  const maxima: number[] = [];
  
  for (let i = window; i < prices.length - window; i++) {
    const leftWindow = prices.slice(i - window, i);
    const rightWindow = prices.slice(i + 1, i + window + 1);
    const current = prices[i];
    
    // Check for local minimum
    if (leftWindow.every(p => p >= current) && rightWindow.every(p => p >= current)) {
      minima.push(i);
    }
    
    // Check for local maximum
    if (leftWindow.every(p => p <= current) && rightWindow.every(p => p <= current)) {
      maxima.push(i);
    }
  }
  
  return { minima, maxima };
}

// Double Bottom Pattern
function detectDoubleBottom(closes: number[], lows: number[], minima: number[]): Pattern | null {
  if (minima.length < 2) return null;
  
  // Find last two minima
  const lastTwo = minima.slice(-2);
  if (lastTwo.length < 2) return null;
  
  const [first, second] = lastTwo;
  const firstLow = lows[first];
  const secondLow = lows[second];
  
  // Check if lows are approximately equal (within 3%)
  const diff = Math.abs(firstLow - secondLow) / Math.min(firstLow, secondLow);
  
  if (diff < 0.03 && second > first) {
    // Find neckline (highest point between two bottoms)
    const betweenHighs = closes.slice(first, second);
    const neckline = Math.max(...betweenHighs);
    const necklineIndex = first + betweenHighs.indexOf(neckline);
    
    // Pattern height
    const height = neckline - Math.min(firstLow, secondLow);
    const target = neckline + height;
    const stopLoss = Math.min(firstLow, secondLow) * 0.98;
    
    // Confidence based on volume profile and symmetry
    const timeDiff = second - first;
    const symmetry = 1 - Math.abs((second - necklineIndex) - (necklineIndex - first)) / timeDiff;
    const confidence = Math.min(85, 50 + symmetry * 35);
    
    return {
      type: 'DOUBLE_BOTTOM',
      bullish: true,
      confidence: Math.round(confidence),
      entryPrice: neckline,
      targetPrice: target,
      stopLoss,
      neckline,
      points: [
        { price: firstLow, index: first },
        { price: neckline, index: necklineIndex },
        { price: secondLow, index: second },
      ],
    };
  }
  
  return null;
}

// Double Top Pattern
function detectDoubleTop(closes: number[], highs: number[], maxima: number[]): Pattern | null {
  if (maxima.length < 2) return null;
  
  const lastTwo = maxima.slice(-2);
  if (lastTwo.length < 2) return null;
  
  const [first, second] = lastTwo;
  const firstHigh = highs[first];
  const secondHigh = highs[second];
  
  const diff = Math.abs(firstHigh - secondHigh) / Math.min(firstHigh, secondHigh);
  
  if (diff < 0.03 && second > first) {
    const betweenLows = closes.slice(first, second);
    const neckline = Math.min(...betweenLows);
    const necklineIndex = first + betweenLows.indexOf(neckline);
    
    const height = Math.max(firstHigh, secondHigh) - neckline;
    const target = neckline - height;
    const stopLoss = Math.max(firstHigh, secondHigh) * 1.02;
    
    const timeDiff = second - first;
    const symmetry = 1 - Math.abs((second - necklineIndex) - (necklineIndex - first)) / timeDiff;
    const confidence = Math.min(85, 50 + symmetry * 35);
    
    return {
      type: 'DOUBLE_TOP',
      bullish: false,
      confidence: Math.round(confidence),
      entryPrice: neckline,
      targetPrice: target,
      stopLoss,
      neckline,
      points: [
        { price: firstHigh, index: first },
        { price: neckline, index: necklineIndex },
        { price: secondHigh, index: second },
      ],
    };
  }
  
  return null;
}

// Head and Shoulders Pattern
function detectHeadAndShoulders(closes: number[], highs: number[], maxima: number[]): Pattern | null {
  if (maxima.length < 3) return null;
  
  const lastThree = maxima.slice(-3);
  if (lastThree.length < 3) return null;
  
  const [leftShoulder, head, rightShoulder] = lastThree;
  const lsHigh = highs[leftShoulder];
  const headHigh = highs[head];
  const rsHigh = highs[rightShoulder];
  
  // Head should be higher than both shoulders
  if (headHigh > lsHigh && headHigh > rsHigh) {
    // Shoulders should be approximately equal
    const shoulderDiff = Math.abs(lsHigh - rsHigh) / Math.min(lsHigh, rsHigh);
    
    if (shoulderDiff < 0.05) {
      // Find neckline
      const leftTrough = Math.min(...closes.slice(leftShoulder, head));
      const rightTrough = Math.min(...closes.slice(head, rightShoulder + 1));
      const neckline = (leftTrough + rightTrough) / 2;
      
      const height = headHigh - neckline;
      const target = neckline - height;
      const stopLoss = headHigh * 1.02;
      
      const confidence = Math.min(80, 45 + (1 - shoulderDiff) * 35);
      
      return {
        type: 'HEAD_AND_SHOULDERS',
        bullish: false,
        confidence: Math.round(confidence),
        entryPrice: neckline,
        targetPrice: target,
        stopLoss,
        neckline,
        points: [
          { price: lsHigh, index: leftShoulder },
          { price: leftTrough, index: leftShoulder + closes.slice(leftShoulder, head).indexOf(leftTrough) },
          { price: headHigh, index: head },
          { price: rightTrough, index: head + closes.slice(head, rightShoulder + 1).indexOf(rightTrough) },
          { price: rsHigh, index: rightShoulder },
        ],
      };
    }
  }
  
  return null;
}

// Inverse Head and Shoulders
function detectInverseHeadAndShoulders(closes: number[], lows: number[], minima: number[]): Pattern | null {
  if (minima.length < 3) return null;
  
  const lastThree = minima.slice(-3);
  if (lastThree.length < 3) return null;
  
  const [leftShoulder, head, rightShoulder] = lastThree;
  const lsLow = lows[leftShoulder];
  const headLow = lows[head];
  const rsLow = lows[rightShoulder];
  
  // Head should be lower than both shoulders
  if (headLow < lsLow && headLow < rsLow) {
    const shoulderDiff = Math.abs(lsLow - rsLow) / Math.min(lsLow, rsLow);
    
    if (shoulderDiff < 0.05) {
      const leftPeak = Math.max(...closes.slice(leftShoulder, head));
      const rightPeak = Math.max(...closes.slice(head, rightShoulder + 1));
      const neckline = (leftPeak + rightPeak) / 2;
      
      const height = neckline - headLow;
      const target = neckline + height;
      const stopLoss = headLow * 0.98;
      
      const confidence = Math.min(80, 45 + (1 - shoulderDiff) * 35);
      
      return {
        type: 'INVERSE_HEAD_AND_SHOULDERS',
        bullish: true,
        confidence: Math.round(confidence),
        entryPrice: neckline,
        targetPrice: target,
        stopLoss,
        neckline,
        points: [
          { price: lsLow, index: leftShoulder },
          { price: headLow, index: head },
          { price: rsLow, index: rightShoulder },
        ],
      };
    }
  }
  
  return null;
}

// Triangle Patterns
function detectTriangle(closes: number[], highs: number[], lows: number[]): Pattern | null {
  const lookback = 30;
  const recentHighs = highs.slice(-lookback);
  const recentLows = lows.slice(-lookback);
  
  // Calculate trend lines
  const highTrend: number[] = [];
  const lowTrend: number[] = [];
  
  for (let i = 0; i < recentHighs.length; i++) {
    highTrend.push(recentHighs[i]);
    lowTrend.push(recentLows[i]);
  }
  
  // Check for converging trend lines
  const firstHigh = recentHighs[0];
  const lastHigh = recentHighs[recentHighs.length - 1];
  const firstLow = recentLows[0];
  const lastLow = recentLows[recentLows.length - 1];
  
  const highSlope = (lastHigh - firstHigh) / lookback;
  const lowSlope = (lastLow - firstLow) / lookback;
  
  // Ascending Triangle (bullish)
  if (Math.abs(highSlope) < 0.001 && lowSlope > 0.001) {
    const resistance = Math.max(...recentHighs);
    const target = resistance + (resistance - Math.min(...recentLows));
    
    return {
      type: 'ASCENDING_TRIANGLE',
      bullish: true,
      confidence: 65,
      entryPrice: resistance,
      targetPrice: target,
      stopLoss: Math.min(...recentLows) * 0.98,
      breakoutLevel: resistance,
      points: [
        { price: firstLow, index: closes.length - lookback },
        { price: resistance, index: closes.length - 1 },
      ],
    };
  }
  
  // Descending Triangle (bearish)
  if (Math.abs(lowSlope) < 0.001 && highSlope < -0.001) {
    const support = Math.min(...recentLows);
    const target = support - (Math.max(...recentHighs) - support);
    
    return {
      type: 'DESCENDING_TRIANGLE',
      bullish: false,
      confidence: 65,
      entryPrice: support,
      targetPrice: target,
      stopLoss: Math.max(...recentHighs) * 1.02,
      breakoutLevel: support,
      points: [
        { price: firstHigh, index: closes.length - lookback },
        { price: support, index: closes.length - 1 },
      ],
    };
  }
  
  // Symmetrical Triangle
  if (highSlope < -0.001 && lowSlope > 0.001) {
    const apex = (lastHigh + lastLow) / 2;
    const range = firstHigh - firstLow;
    
    return {
      type: 'SYMMETRICAL_TRIANGLE',
      bullish: true, // Neutral, default to bullish
      confidence: 55,
      entryPrice: apex,
      targetPrice: apex + range * 0.6,
      stopLoss: apex - range * 0.3,
      breakoutLevel: apex,
      points: [
        { price: firstHigh, index: closes.length - lookback },
        { price: firstLow, index: closes.length - lookback },
        { price: apex, index: closes.length - 1 },
      ],
    };
  }
  
  return null;
}

// Flag Pattern
function detectFlag(closes: number[]): Pattern | null {
  const lookback = 20;
  const recent = closes.slice(-lookback);
  
  // Check for strong initial move (5%+ in first 5 candles)
  const initialMove = (recent[4] - recent[0]) / recent[0];
  
  if (Math.abs(initialMove) > 0.05) {
    // Check for consolidation
    const consolidation = recent.slice(5);
    const range = Math.max(...consolidation) - Math.min(...consolidation);
    const avgPrice = consolidation.reduce((a, b) => a + b, 0) / consolidation.length;
    
    if (range / avgPrice < 0.03) {
      const bullish = initialMove > 0;
      const target = bullish
        ? recent[recent.length - 1] * (1 + Math.abs(initialMove))
        : recent[recent.length - 1] * (1 - Math.abs(initialMove));
      
      return {
        type: bullish ? 'BULL_FLAG' : 'BEAR_FLAG',
        bullish,
        confidence: 60,
        entryPrice: recent[recent.length - 1],
        targetPrice: target,
        stopLoss: bullish
          ? Math.min(...consolidation) * 0.98
          : Math.max(...consolidation) * 1.02,
        points: [
          { price: recent[0], index: closes.length - lookback },
          { price: recent[4], index: closes.length - lookback + 4 },
          { price: recent[recent.length - 1], index: closes.length - 1 },
        ],
      };
    }
  }
  
  return null;
}

// Wedge Pattern
function detectWedge(closes: number[], highs: number[], lows: number[]): Pattern | null {
  const lookback = 25;
  const recentHighs = highs.slice(-lookback);
  const recentLows = lows.slice(-lookback);
  
  const firstHigh = recentHighs[0];
  const lastHigh = recentHighs[recentHighs.length - 1];
  const firstLow = recentLows[0];
  const lastLow = recentLows[recentLows.length - 1];
  
  const highSlope = (lastHigh - firstHigh) / lookback;
  const lowSlope = (lastLow - firstLow) / lookback;
  
  // Rising Wedge (bearish)
  if (highSlope > 0 && lowSlope > 0 && highSlope < lowSlope) {
    return {
      type: 'RISING_WEDGE',
      bullish: false,
      confidence: 60,
      entryPrice: lastLow,
      targetPrice: lastLow - (firstHigh - firstLow),
      stopLoss: lastHigh * 1.02,
      points: [
        { price: firstLow, index: closes.length - lookback },
        { price: firstHigh, index: closes.length - lookback },
        { price: lastLow, index: closes.length - 1 },
        { price: lastHigh, index: closes.length - 1 },
      ],
    };
  }
  
  // Falling Wedge (bullish)
  if (highSlope < 0 && lowSlope < 0 && highSlope > lowSlope) {
    return {
      type: 'FALLING_WEDGE',
      bullish: true,
      confidence: 60,
      entryPrice: lastHigh,
      targetPrice: lastHigh + (firstHigh - firstLow),
      stopLoss: lastLow * 0.98,
      points: [
        { price: firstLow, index: closes.length - lookback },
        { price: firstHigh, index: closes.length - lookback },
        { price: lastLow, index: closes.length - 1 },
        { price: lastHigh, index: closes.length - 1 },
      ],
    };
  }
  
  return null;
}

// Support/Resistance Detection
function detectSupportResistance(closes: number[], highs: number[], lows: number[]): { support: number[]; resistance: number[] } {
  const levels = [];
  const lookback = 50;
  
  for (let i = lookback; i < closes.length; i++) {
    const window = closes.slice(i - lookback, i);
    const isMin = lows[i] <= Math.min(...window);
    const isMax = highs[i] >= Math.max(...window);
    
    if (isMin) levels.push({ price: lows[i], type: 'support', index: i });
    if (isMax) levels.push({ price: highs[i], type: 'resistance', index: i });
  }
  
  // Cluster nearby levels
  const support: number[] = [];
  const resistance: number[] = [];
  
  const clusterLevels = (levels: { price: number; type: string }[], type: 'support' | 'resistance') => {
    const filtered = levels.filter(l => l.type === type);
    const clusters: number[] = [];
    
    for (const level of filtered) {
      const exists = clusters.some(c => Math.abs(c - level.price) / level.price < 0.02);
      if (!exists) clusters.push(level.price);
    }
    
    return clusters.slice(-5);
  };
  
  return {
    support: clusterLevels(levels, 'support'),
    resistance: clusterLevels(levels, 'resistance'),
  };
}

// ========================================
// MAIN API HANDLER
// ========================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const timeframe = searchParams.get('timeframe') || '1h';
    const userId = searchParams.get('userId');

    // Fetch klines
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=200`
    );

    if (!response.ok) {
      throw new Error('Binance API error');
    }

    const klines = await response.json();

    const closes = klines.map((k: (string | number)[]) => parseFloat(k[4] as string));
    const highs = klines.map((k: (string | number)[]) => parseFloat(k[2] as string));
    const lows = klines.map((k: (string | number)[]) => parseFloat(k[3] as string));
    const openTimes = klines.map((k: (string | number)[]) => k[0] as number);

    // Find extrema
    const { minima, maxima } = findLocalExtrema(closes);

    // Detect patterns
    const patterns: Pattern[] = [];

    // Double patterns
    const doubleBottom = detectDoubleBottom(closes, lows, minima);
    if (doubleBottom) patterns.push(doubleBottom);

    const doubleTop = detectDoubleTop(closes, highs, maxima);
    if (doubleTop) patterns.push(doubleTop);

    // Head and shoulders
    const hns = detectHeadAndShoulders(closes, highs, maxima);
    if (hns) patterns.push(hns);

    const ihns = detectInverseHeadAndShoulders(closes, lows, minima);
    if (ihns) patterns.push(ihns);

    // Triangle
    const triangle = detectTriangle(closes, highs, lows);
    if (triangle) patterns.push(triangle);

    // Flag
    const flag = detectFlag(closes);
    if (flag) patterns.push(flag);

    // Wedge
    const wedge = detectWedge(closes, highs, lows);
    if (wedge) patterns.push(wedge);

    // Support/Resistance
    const { support, resistance } = detectSupportResistance(closes, highs, lows);

    // Current price
    const currentPrice = closes[closes.length - 1];

    // Filter high confidence patterns
    const highConfidencePatterns = patterns.filter(p => p.confidence >= 50);

    // Save detected patterns to DB
    if (userId && highConfidencePatterns.length > 0) {
      for (const pattern of highConfidencePatterns) {
        try {
          await db.detectedPattern.create({
            data: {
              userId,
              symbol,
              pattern: pattern.type,
              patternType: pattern.bullish ? 'bullish' : 'bearish',
              confidence: pattern.confidence,
              entryPrice: pattern.entryPrice,
              targetPrice: pattern.targetPrice,
              stopLossPrice: pattern.stopLoss,
              neckline: pattern.neckline,
              breakoutLevel: pattern.breakoutLevel,
              patternPoints: JSON.stringify(pattern.points),
              timeframe,
            },
          });
        } catch (dbError) {
          console.error('Pattern save error:', dbError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        symbol,
        timeframe,
        currentPrice,
        patterns: highConfidencePatterns.map(p => ({
          ...p,
          entryPricePercent: ((p.entryPrice - currentPrice) / currentPrice * 100).toFixed(2),
          targetPricePercent: ((p.targetPrice - currentPrice) / currentPrice * 100).toFixed(2),
          stopLossPercent: ((p.stopLoss - currentPrice) / currentPrice * 100).toFixed(2),
          riskReward: ((p.targetPrice - currentPrice) / (currentPrice - p.stopLoss)).toFixed(2),
        })),
        supportResistance: {
          support: support.map(s => ({
            price: s,
            distance: ((currentPrice - s) / currentPrice * 100).toFixed(2),
          })),
          resistance: resistance.map(r => ({
            price: r,
            distance: ((r - currentPrice) / currentPrice * 100).toFixed(2),
          })),
        },
        marketStructure: {
          trend: currentPrice > closes[closes.length - 20] ? 'UPTREND' : 'DOWNTREND',
          highOfDay: Math.max(...highs.slice(-24)),
          lowOfDay: Math.min(...lows.slice(-24)),
        },
      },
    });

  } catch (error) {
    console.error('Pattern detection error:', error);
    return NextResponse.json({
      success: false,
      error: 'Pattern tespit edilemedi',
    }, { status: 500 });
  }
}
