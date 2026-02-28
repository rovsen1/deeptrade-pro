import { NextResponse } from 'next/server';

// ========================================
// 📊 DEEPTRADE PRO - MARKET DATA API
// CoinGecko Integration for Real Prices
// ========================================

// CoinGecko ID mapping
const COIN_IDS: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'XRP': 'ripple',
  'ADA': 'cardano',
  'DOGE': 'dogecoin',
  'AVAX': 'avalanche-2',
  'DOT': 'polkadot',
  'MATIC': 'matic-network',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'LTC': 'litecoin',
  'ETC': 'ethereum-classic',
  'NEAR': 'near',
  'FTM': 'fantom',
  'ARB': 'arbitrum',
  'OP': 'optimism',
  'SUI': 'sui',
  'SHIB': 'shiba-inu',
  'PEPE': 'pepe',
  'FLOKI': 'floki',
  'BONK': 'bonk',
  'AAVE': 'aave',
  'MKR': 'maker',
  'CRV': 'curve-dao-token',
  'PENDLE': 'pendle',
  'ENA': 'ena-finance',
  'FET': 'fetch-ai',
  'RNDR': 'render-token',
  'TAO': 'bittensor',
  'WLD': 'worldcoin-wld',
  'INJ': 'injective-protocol',
  'TIA': 'celestia',
  'SEI': 'sei-network',
  'APT': 'aptos',
  'AR': 'arweave',
  'IMX': 'immutable-x',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'AXS': 'axie-infinity',
  'GALA': 'gala',
  'ENS': 'ethereum-name-service',
  'LDO': 'lido-dao',
  'MKR': 'maker',
  'SNX': 'havven',
  '1INCH': '1inch',
  'COMP': 'compound-governance-token',
  'YFI': 'yearn-finance',
  'SUSHI': 'sushi',
  'RUNE': 'thorchain',
  'CAKE': 'pancakeswap-token',
  'DYDX': 'dydx',
  'GMX': 'gmx',
  'ICP': 'internet-computer',
  'FIL': 'filecoin',
  'HBAR': 'hedera-hashgraph',
  'VET': 'vechain',
  'ALGO': 'algorand',
  'XLM': 'stellar',
  'XMR': 'monero',
  'ZEC': 'zcash',
  'DASH': 'dash',
  'NEO': 'neo',
  'EOS': 'eos',
  'IOTA': 'iota',
  'TRX': 'tron',
  'BCH': 'bitcoin-cash',
  'KLAY': 'klay-token',
  'APE': 'apecoin',
  'BLUR': 'blur',
  'ORDI': 'ordinals',
  'WIF': 'dogwifhat',
  'JUP': 'jupiter-exchange-solana',
  'PYTH': 'pyth-network',
  'MEME': 'meme',
};

// Major coins to prioritize
const MAJOR_COINS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC', 'LINK', 'UNI', 'ATOM', 'LTC', 'ETC'];
const LAYER_COINS = ['NEAR', 'FTM', 'ARB', 'OP', 'SUI', 'INJ', 'TIA', 'SEI', 'APT'];
const DEFI_COINS = ['AAVE', 'MKR', 'CRV', 'PENDLE', 'ENA', 'LDO', 'SNX', 'COMP', 'SUSHI', 'RUNE', 'CAKE', 'DYDX', 'GMX'];
const AI_COINS = ['FET', 'RNDR', 'TAO', 'WLD'];
const MEME_COINS = ['SHIB', 'PEPE', 'FLOKI', 'BONK', 'WIF', 'MEME'];

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
  marketCap?: number;
  marketCapRank?: number;
}

function getCoinCategory(symbol: string): string {
  const base = symbol.replace('USDT', '');
  if (MAJOR_COINS.includes(base)) return 'major';
  if (LAYER_COINS.includes(base)) return 'layer';
  if (DEFI_COINS.includes(base)) return 'defi';
  if (AI_COINS.includes(base)) return 'ai';
  if (MEME_COINS.includes(base)) return 'meme';
  return 'altcoin';
}

// CoinGecko ID to Symbol mapping (reverse)
const ID_TO_SYMBOL: Record<string, string> = {};
Object.entries(COIN_IDS).forEach(([symbol, id]) => {
  ID_TO_SYMBOL[id] = symbol;
});

export async function GET() {
  try {
    // Try CoinGecko API first (works on Vercel)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // Fetch top 100 coins by market cap from CoinGecko
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h',
      {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 30 } // Cache for 30 seconds
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.log('CoinGecko API failed, status:', response.status);
      return sendFallbackResponse();
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.log('CoinGecko returned empty data');
      return sendFallbackResponse();
    }

    // Transform CoinGecko data to our format
    const marketData: MarketData[] = data.map((coin: {
      id: string;
      symbol: string;
      name: string;
      current_price: number;
      price_change_24h: number;
      price_change_percentage_24h: number;
      total_volume: number;
      market_cap: number;
      high_24h: number;
      low_24h: number;
      market_cap_rank: number;
    }) => {
      const symbol = coin.symbol.toUpperCase() + 'USDT';
      const price = coin.current_price || 0;
      const change = coin.price_change_24h || 0;
      const changePercent = coin.price_change_percentage_24h || 0;

      return {
        symbol,
        price,
        priceChange: change,
        priceChangePercent: changePercent,
        volume: coin.total_volume || 0,
        quoteVolume: coin.market_cap || 0,
        highPrice: coin.high_24h || price * 1.02,
        lowPrice: coin.low_24h || price * 0.98,
        openPrice: price - change,
        category: getCoinCategory(symbol),
        marketCap: coin.market_cap,
        marketCapRank: coin.market_cap_rank,
      };
    }).filter((coin: MarketData) => coin.price > 0);

    if (marketData.length === 0) {
      return sendFallbackResponse();
    }

    // Create categorized lists
    const major = marketData.filter(c => c.category === 'major');
    const layer = marketData.filter(c => c.category === 'layer');
    const defi = marketData.filter(c => c.category === 'defi');
    const ai = marketData.filter(c => c.category === 'ai');
    const meme = marketData.filter(c => c.category === 'meme');

    // Top gainers
    const gainers = [...marketData]
      .filter(c => c.priceChangePercent > 0)
      .sort((a, b) => b.priceChangePercent - a.priceChangePercent)
      .slice(0, 10);

    // Top losers
    const losers = [...marketData]
      .filter(c => c.priceChangePercent < 0)
      .sort((a, b) => a.priceChangePercent - b.priceChangePercent)
      .slice(0, 10);

    // Most active by volume
    const mostActive = [...marketData]
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    // Calculate stats
    const totalVolume = marketData.reduce((sum, c) => sum + (c.volume || 0), 0);
    const totalMarketCap = marketData.reduce((sum, c) => sum + (c.marketCap || 0), 0);
    const btcData = marketData.find(c => c.symbol === 'BTCUSDT');
    const ethData = marketData.find(c => c.symbol === 'ETHUSDT');

    const avgChange = marketData.reduce((sum, c) => sum + (c.priceChangePercent || 0), 0) / marketData.length;
    const positiveCount = marketData.filter(c => c.priceChangePercent > 0).length;
    const negativeCount = marketData.filter(c => c.priceChangePercent < 0).length;

    return NextResponse.json({
      success: true,
      data: marketData.slice(0, 50),
      all: marketData,
      categories: { major, layer, defi, ai, meme },
      market: { gainers, losers, mostActive },
      stats: {
        totalCoins: marketData.length,
        totalVolume,
        totalMarketCap,
        btcPrice: btcData?.price || 0,
        btcChange: btcData?.priceChangePercent || 0,
        ethPrice: ethData?.price || 0,
        ethChange: ethData?.priceChangePercent || 0,
        avgChange: avgChange.toFixed(2),
        positiveCount,
        negativeCount,
        marketSentiment: avgChange > 0 ? 'bullish' : 'bearish',
      },
      source: 'CoinGecko',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Market data fetch error:', error);
    return sendFallbackResponse();
  }
}

function sendFallbackResponse() {
  // Updated fallback prices (January 2025 approximate market prices)
  const fallbackPrices: Record<string, { price: number; change: number }> = {
    'BTCUSDT': { price: 97500, change: 1.2 },
    'ETHUSDT': { price: 3400, change: 1.8 },
    'BNBUSDT': { price: 650, change: 0.5 },
    'SOLUSDT': { price: 195, change: 2.5 },
    'XRPUSDT': { price: 2.40, change: -0.8 },
    'ADAUSDT': { price: 0.95, change: 1.5 },
    'DOGEUSDT': { price: 0.38, change: 3.2 },
    'AVAXUSDT': { price: 42, change: 2.0 },
    'DOTUSDT': { price: 8.5, change: -0.3 },
    'MATICUSDT': { price: 0.55, change: 1.0 },
    'LINKUSDT': { price: 22, change: 1.2 },
    'UNIUSDT': { price: 15, change: -0.5 },
    'ATOMUSDT': { price: 11, change: 1.8 },
    'LTCUSDT': { price: 105, change: 0.4 },
    'ETCUSDT': { price: 28, change: -1.5 },
    'NEARUSDT': { price: 6.5, change: 2.8 },
    'FTMUSDT': { price: 0.85, change: 3.5 },
    'ARBUSDT': { price: 1.15, change: 2.2 },
    'OPUSDT': { price: 1.85, change: 1.6 },
    'SUIUSDT': { price: 4.2, change: 4.5 },
    'SHIBUSDT': { price: 0.000020, change: 3.0 },
    'PEPEUSDT': { price: 0.000021, change: 5.5 },
    'FLOKIUSDT': { price: 0.00015, change: 3.8 },
    'BONKUSDT': { price: 0.000032, change: 4.2 },
    'AAVEUSDT': { price: 350, change: -0.8 },
    'MKRUSDT': { price: 1900, change: 0.6 },
    'CRVUSDT': { price: 0.85, change: -2.0 },
    'PENDLEUSDT': { price: 5.8, change: 2.8 },
    'ENAUSDT': { price: 0.95, change: 1.8 },
    'FETUSDT': { price: 1.45, change: 3.5 },
    'RNDRUSDT': { price: 8.5, change: 2.8 },
    'TAOUSDT': { price: 450, change: 2.0 },
    'WLDUSDT': { price: 2.2, change: -1.8 },
  };

  const fallbackData: MarketData[] = Object.entries(fallbackPrices).map(([symbol, data]) => ({
    symbol,
    price: data.price,
    priceChange: data.price * (data.change / 100),
    priceChangePercent: data.change,
    volume: 50000000,
    quoteVolume: 100000000,
    highPrice: data.price * 1.02,
    lowPrice: data.price * 0.98,
    openPrice: data.price / (1 + data.change / 100),
    category: getCoinCategory(symbol),
  }));

  return NextResponse.json({
    success: true,
    data: fallbackData.slice(0, 25),
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
      totalVolume: 1500000000,
      totalMarketCap: 3500000000000,
      btcPrice: 97500,
      btcChange: 1.2,
      ethPrice: 3400,
      ethChange: 1.8,
      avgChange: '1.5',
      positiveCount: 28,
      negativeCount: 7,
      marketSentiment: 'bullish',
    },
    source: 'Fallback (API temporarily unavailable)',
    timestamp: Date.now(),
    note: 'Using fallback prices - CoinGecko API temporarily unavailable',
  });
}
