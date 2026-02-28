import { NextResponse } from 'next/server';

// ========================================
// 📊 DEEPTRADE PRO - MARKET DATA API
// Robust version with proper fallbacks
// ========================================

// Major coins to prioritize
const MAJOR_COINS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
  'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'LTCUSDT', 'ETCUSDT'
];

// Layer 1 & 2 coins
const LAYER_COINS = [
  'SOLUSDT', 'AVAXUSDT', 'MATICUSDT', 'NEARUSDT', 'FTMUSDT',
  'ARBUSDT', 'OPUSDT', 'SUIUSDT', 'APTUSDT', 'SEIUSDT',
  'INJUSDT', 'TIAUSDT', 'MANTAUSDT', 'STRKUSDT', 'MNTUSDT'
];

// DeFi tokens
const DEFI_COINS = [
  'UNIUSDT', 'AAVEUSDT', 'MKRUSDT', 'COMPUSDT', 'CRVUSDT',
  'SUSHIUSDT', 'LDOUSDT', 'SNXUSDT', 'YFIUSDT', '1INCHUSDT',
  'RUNEUSDT', 'CAKEUSDT', 'DYDXUSDT', 'GMXUSDT', 'RDNTUSDT',
  'PENDLEUSDT', 'ENAUSDT', 'AEVOUSDT'
];

// AI tokens
const AI_COINS = [
  'FETUSDT', 'RNDRUSDT', 'GRTUSDT', 'AGIXUSDT', 'OCEANUSDT',
  'TAOUSDT', 'NEURONUSDT', 'AIUSDT', 'ARKMUSDT', 'WLDUSDT'
];

// Meme coins
const MEME_COINS = [
  'DOGEUSDT', 'SHIBUSDT', 'PEPEUSDT', 'FLOKIUSDT', 'BONKUSDT',
  'MEMEUSDT', 'DOGEKINGUSDT', 'BABYDOGEUSDT', 'WIFUSDT', 'MYROUSDT'
];

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
  category?: string;
}

function getCoinCategory(symbol: string): string {
  if (MAJOR_COINS.includes(symbol)) return 'major';
  if (LAYER_COINS.includes(symbol)) return 'layer';
  if (DEFI_COINS.includes(symbol)) return 'defi';
  if (AI_COINS.includes(symbol)) return 'ai';
  if (MEME_COINS.includes(symbol)) return 'meme';
  return 'altcoin';
}

// Extended fallback data with realistic prices
function getFallbackData(): MarketData[] {
  const fallbackPrices: Record<string, { price: number; change: number }> = {
    'BTCUSDT': { price: 85000, change: 2.5 },
    'ETHUSDT': { price: 3200, change: 1.8 },
    'BNBUSDT': { price: 620, change: 0.5 },
    'SOLUSDT': { price: 180, change: 3.2 },
    'XRPUSDT': { price: 2.5, change: -1.2 },
    'ADAUSDT': { price: 0.85, change: 1.5 },
    'DOGEUSDT': { price: 0.38, change: 5.2 },
    'AVAXUSDT': { price: 42, change: 2.1 },
    'DOTUSDT': { price: 7.5, change: -0.8 },
    'MATICUSDT': { price: 0.55, change: 1.2 },
    'LINKUSDT': { price: 18, change: 0.9 },
    'UNIUSDT': { price: 12, change: -0.5 },
    'ATOMUSDT': { price: 9, change: 1.8 },
    'LTCUSDT': { price: 95, change: 0.3 },
    'ETCUSDT': { price: 25, change: -1.5 },
    'NEARUSDT': { price: 5.5, change: 2.8 },
    'FTMUSDT': { price: 0.85, change: 3.5 },
    'ARBUSDT': { price: 0.45, change: 1.1 },
    'OPUSDT': { price: 1.8, change: 2.2 },
    'SUIUSDT': { price: 3.2, change: 4.5 },
    'SHIBUSDT': { price: 0.00002, change: 3.5 },
    'PEPEUSDT': { price: 0.00001, change: 8.2 },
    'FLOKIUSDT': { price: 0.0002, change: 4.1 },
    'BONKUSDT': { price: 0.00003, change: 6.5 },
    'AAVEUSDT': { price: 95, change: -0.8 },
    'MKRUSDT': { price: 2800, change: 1.2 },
    'CRVUSDT': { price: 0.6, change: -2.1 },
    'PENDLEUSDT': { price: 5.5, change: 3.2 },
    'ENAUSDT': { price: 0.8, change: 2.5 },
    'FETUSDT': { price: 2.2, change: 5.5 },
    'RNDRUSDT': { price: 8.5, change: 3.8 },
    'TAOUSDT': { price: 380, change: 2.2 },
    'WLDUSDT': { price: 3.5, change: -1.8 },
  };

  return Object.entries(fallbackPrices).map(([symbol, data]) => ({
    symbol,
    price: data.price,
    priceChange: data.price * (data.change / 100),
    priceChangePercent: data.change,
    volume: 1000000,
    quoteVolume: 50000000,
    highPrice: data.price * 1.02,
    lowPrice: data.price * 0.98,
    openPrice: data.price / (1 + data.change / 100),
    category: getCoinCategory(symbol),
  }));
}

export async function GET() {
  try {
    // Try multiple Binance API endpoints with shorter timeout
    const endpoints = [
      'https://api.binance.com/api/v3/ticker/24hr',
      'https://api1.binance.com/api/v3/ticker/24hr',
      'https://api2.binance.com/api/v3/ticker/24hr',
      'https://api3.binance.com/api/v3/ticker/24hr',
    ];

    let data = null;

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; DeepTrade-Pro/1.0)',
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const jsonData = await response.json();
          if (Array.isArray(jsonData) && jsonData.length > 0) {
            data = jsonData;
            break;
          }
        }
      } catch {
        continue;
      }
    }

    // If all endpoints fail, use fallback data
    if (!data || !Array.isArray(data)) {
      console.log('Binance API unavailable, using fallback data');
      return sendFallbackResponse();
    }

    // Filter USDT pairs
    const usdtPairs = data
      .filter((item: { symbol: string; quoteVolume: string }) => 
        item.symbol.endsWith('USDT') && 
        !item.symbol.includes('UP') && 
        !item.symbol.includes('DOWN') &&
        !item.symbol.includes('BULL') &&
        !item.symbol.includes('BEAR') &&
        !item.symbol.includes('HEDGE') &&
        parseFloat(item.quoteVolume) > 1000000
      )
      .map((item: {
        symbol: string;
        lastPrice: string;
        priceChange: string;
        priceChangePercent: string;
        volume: string;
        quoteVolume: string;
        highPrice: string;
        lowPrice: string;
        openPrice: string;
      }) => ({
        symbol: item.symbol,
        price: parseFloat(item.lastPrice) || 0,
        priceChange: parseFloat(item.priceChange) || 0,
        priceChangePercent: parseFloat(item.priceChangePercent) || 0,
        volume: parseFloat(item.volume) || 0,
        quoteVolume: parseFloat(item.quoteVolume) || 0,
        highPrice: parseFloat(item.highPrice) || 0,
        lowPrice: parseFloat(item.lowPrice) || 0,
        openPrice: parseFloat(item.openPrice) || 0,
        category: getCoinCategory(item.symbol),
      }))
      .filter((item: MarketData) => item.price > 0)
      .sort((a: MarketData, b: MarketData) => b.quoteVolume - a.quoteVolume);

    if (usdtPairs.length === 0) {
      return sendFallbackResponse();
    }

    // Get top 500 by volume
    const topPairs = usdtPairs.slice(0, 500);

    // Create categorized lists
    const major = topPairs.filter((c: MarketData) => c.category === 'major');
    const layer = topPairs.filter((c: MarketData) => c.category === 'layer');
    const defi = topPairs.filter((c: MarketData) => c.category === 'defi');
    const ai = topPairs.filter((c: MarketData) => c.category === 'ai');
    const meme = topPairs.filter((c: MarketData) => c.category === 'meme');
    
    // Top gainers
    const gainers = [...topPairs]
      .filter((c: MarketData) => c.priceChangePercent > 0)
      .sort((a: MarketData, b: MarketData) => b.priceChangePercent - a.priceChangePercent)
      .slice(0, 10);
    
    // Top losers
    const losers = [...topPairs]
      .filter((c: MarketData) => c.priceChangePercent < 0)
      .sort((a: MarketData, b: MarketData) => a.priceChangePercent - b.priceChangePercent)
      .slice(0, 10);
    
    // Most active
    const mostActive = [...topPairs]
      .sort((a: MarketData, b: MarketData) => b.quoteVolume - a.quoteVolume)
      .slice(0, 10);

    // Calculate market stats with safety checks
    const totalVolume = topPairs.reduce((sum: number, c: MarketData) => sum + (c.quoteVolume || 0), 0);
    const btcData = topPairs.find((c: MarketData) => c.symbol === 'BTCUSDT');
    const ethData = topPairs.find((c: MarketData) => c.symbol === 'ETHUSDT');
    
    const avgChange = topPairs.reduce((sum: number, c: MarketData) => sum + (c.priceChangePercent || 0), 0) / topPairs.length;
    const positiveCount = topPairs.filter((c: MarketData) => c.priceChangePercent > 0).length;
    const negativeCount = topPairs.filter((c: MarketData) => c.priceChangePercent < 0).length;

    return NextResponse.json({
      success: true,
      data: topPairs.slice(0, 100),
      all: topPairs,
      categories: { major, layer, defi, ai, meme },
      market: { gainers, losers, mostActive },
      stats: {
        totalCoins: topPairs.length,
        totalVolume,
        btcPrice: btcData?.price || 85000,
        btcChange: btcData?.priceChangePercent || 0,
        ethPrice: ethData?.price || 3200,
        ethChange: ethData?.priceChangePercent || 0,
        avgChange: avgChange.toFixed(2),
        positiveCount,
        negativeCount,
        marketSentiment: avgChange > 0 ? 'bullish' : 'bearish',
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Market data fetch error:', error);
    return sendFallbackResponse();
  }
}

function sendFallbackResponse() {
  const fallbackData = getFallbackData();
  
  return NextResponse.json({
    success: true,
    data: fallbackData.slice(0, 20),
    all: fallbackData,
    categories: {
      major: fallbackData.filter(c => c.category === 'major'),
      layer: fallbackData.filter(c => c.category === 'layer'),
      defi: fallbackData.filter(c => c.category === 'defi'),
      ai: fallbackData.filter(c => c.category === 'ai'),
      meme: fallbackData.filter(c => c.category === 'meme'),
    },
    market: {
      gainers: fallbackData.filter(c => c.priceChangePercent > 0).sort((a, b) => b.priceChangePercent - a.priceChangePercent).slice(0, 10),
      losers: fallbackData.filter(c => c.priceChangePercent < 0).sort((a, b) => a.priceChangePercent - b.priceChangePercent).slice(0, 10),
      mostActive: fallbackData.slice(0, 10),
    },
    stats: {
      totalCoins: fallbackData.length,
      totalVolume: 1000000000,
      btcPrice: 85000,
      btcChange: 2.5,
      ethPrice: 3200,
      ethChange: 1.8,
      avgChange: '1.5',
      positiveCount: 25,
      negativeCount: 8,
      marketSentiment: 'bullish',
    },
    timestamp: Date.now(),
    note: 'Using fallback data - Live API temporarily unavailable',
  });
}
