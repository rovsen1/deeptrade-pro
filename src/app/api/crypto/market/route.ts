import { NextResponse } from 'next/server';

// ========================================
// 📊 DEEPTRADE PRO - MARKET DATA API
// 500+ USDT Pairs with Categories
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

// Fallback data when Binance API fails
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
    // Try multiple Binance API endpoints
    const endpoints = [
      'https://api.binance.com/api/v3/ticker/24hr',
      'https://api1.binance.com/api/v3/ticker/24hr',
      'https://api2.binance.com/api/v3/ticker/24hr',
      'https://api3.binance.com/api/v3/ticker/24hr',
    ];

    let data = null;
    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(endpoint, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'DeepTrade-Pro/1.0',
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          data = await response.json();
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.log(`Endpoint ${endpoint} failed:`, err.message);
        continue;
      }
    }

    // If all endpoints fail, use fallback data
    if (!data) {
      console.log('All Binance endpoints failed, using fallback data');
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
          btcPrice: fallbackData.find(c => c.symbol === 'BTCUSDT')?.price || 85000,
          btcChange: fallbackData.find(c => c.symbol === 'BTCUSDT')?.priceChangePercent || 2.5,
          ethPrice: fallbackData.find(c => c.symbol === 'ETHUSDT')?.price || 3200,
          ethChange: fallbackData.find(c => c.symbol === 'ETHUSDT')?.priceChangePercent || 1.8,
          avgChange: '1.5',
          positiveCount: 12,
          negativeCount: 8,
          marketSentiment: 'bullish',
        },
        timestamp: Date.now(),
        note: 'Using fallback data - Binance API unavailable',
      });
    }

    // Filter USDT pairs
    const usdtPairs = data
      .filter((item: { symbol: string }) => 
        item.symbol.endsWith('USDT') && 
        !item.symbol.includes('UP') && 
        !item.symbol.includes('DOWN') &&
        !item.symbol.includes('BULL') &&
        !item.symbol.includes('BEAR') &&
        !item.symbol.includes('HEDGE') &&
        parseFloat(item.quoteVolume) > 1000000 // Minimum $1M volume
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
        price: parseFloat(item.lastPrice),
        priceChange: parseFloat(item.priceChange),
        priceChangePercent: parseFloat(item.priceChangePercent),
        volume: parseFloat(item.volume),
        quoteVolume: parseFloat(item.quoteVolume),
        highPrice: parseFloat(item.highPrice),
        lowPrice: parseFloat(item.lowPrice),
        openPrice: parseFloat(item.openPrice),
        category: getCoinCategory(item.symbol),
      }))
      .sort((a: MarketData, b: MarketData) => b.quoteVolume - a.quoteVolume);

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
    
    // Most active (by volume)
    const mostActive = [...topPairs]
      .sort((a: MarketData, b: MarketData) => b.quoteVolume - a.quoteVolume)
      .slice(0, 10);

    // Calculate market stats
    const totalVolume = topPairs.reduce((sum: number, c: MarketData) => sum + c.quoteVolume, 0);
    const btcData = topPairs.find((c: MarketData) => c.symbol === 'BTCUSDT');
    const ethData = topPairs.find((c: MarketData) => c.symbol === 'ETHUSDT');
    
    const avgChange = topPairs.reduce((sum: number, c: MarketData) => sum + c.priceChangePercent, 0) / topPairs.length;
    const positiveCount = topPairs.filter((c: MarketData) => c.priceChangePercent > 0).length;
    const negativeCount = topPairs.filter((c: MarketData) => c.priceChangePercent < 0).length;

    return NextResponse.json({
      success: true,
      data: topPairs.slice(0, 100), // Default: top 100
      all: topPairs, // Full list
      categories: {
        major,
        layer,
        defi,
        ai,
        meme,
      },
      market: {
        gainers,
        losers,
        mostActive,
      },
      stats: {
        totalCoins: topPairs.length,
        totalVolume,
        btcPrice: btcData?.price || 0,
        btcChange: btcData?.priceChangePercent || 0,
        ethPrice: ethData?.price || 0,
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
    
    // Return fallback data on any error
    const fallbackData = getFallbackData();
    
    return NextResponse.json({
      success: true,
      data: fallbackData.slice(0, 20),
      all: fallbackData,
      categories: {
        major: fallbackData.filter(c => c.category === 'major'),
        layer: fallbackData.filter(c => c.category === 'layer'),
        defi: [],
        ai: [],
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
        positiveCount: 12,
        negativeCount: 8,
        marketSentiment: 'bullish',
      },
      timestamp: Date.now(),
      note: 'Using fallback data due to API error',
    });
  }
}
// Force redeploy Sat Feb 28 15:50:08 UTC 2026
