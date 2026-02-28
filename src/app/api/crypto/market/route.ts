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

export async function GET() {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
      next: { revalidate: 20 } // Cache for 20 seconds
    });

    if (!response.ok) {
      throw new Error('Binance API error');
    }

    const data = await response.json();

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
    return NextResponse.json(
      { 
        success: false, 
        error: 'Piyasa verileri alınamadı',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
