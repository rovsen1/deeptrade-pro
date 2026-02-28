import { NextResponse } from 'next/server';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ========================================
// 📊 DEEPTRADE PRO - MARKET DATA API
// Real-time prices from Binance & CoinGecko
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
  // Try Binance API first (most reliable on Vercel)
  const binanceResult = await tryBinanceAPI();
  if (binanceResult) return binanceResult;

  // Fallback to CoinGecko if Binance fails
  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1',
      {
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const marketData: MarketData[] = data.map((coin: {
          id: string;
          symbol: string;
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
          return {
            symbol,
            price,
            priceChange: coin.price_change_24h || 0,
            priceChangePercent: coin.price_change_percentage_24h || 0,
            volume: coin.total_volume || 0,
            quoteVolume: coin.market_cap || 0,
            highPrice: coin.high_24h || price * 1.02,
            lowPrice: coin.low_24h || price * 0.98,
            openPrice: price - (coin.price_change_24h || 0),
            category: getCoinCategory(symbol),
            marketCap: coin.market_cap,
            marketCapRank: coin.market_cap_rank,
          };
        }).filter((coin: MarketData) => coin.price > 0);

        if (marketData.length > 0) {
          return formatResponse(marketData, 'CoinGecko');
        }
      }
    }
  } catch (error) {
    console.error('CoinGecko API error:', error);
  }

  return NextResponse.json({
    success: false,
    error: 'Piyasa verileri alınamadı - lütfen sayfayı yenileyin',
    data: [],
  }, { headers: resHeaders });
}

// Binance API - Primary source for real prices
async function tryBinanceAPI() {
  // Try multiple Binance endpoints
  const endpoints = [
    'https://api.binance.com/api/v3/ticker/24hr',
    'https://api1.binance.com/api/v3/ticker/24hr',
    'https://api2.binance.com/api/v3/ticker/24hr',
    'https://api3.binance.com/api/v3/ticker/24hr',
    'https://data-api.binance.com/api/v3/ticker/24hr',
  ];

  for (const endpoint of endpoints) {
    try {
      console.log('Trying Binance endpoint:', endpoint);
      
      const response = await fetch(endpoint, {
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        console.log('Failed:', response.status);
        continue;
      }

      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        console.log('Empty data');
        continue;
      }

      console.log('Binance API success! Got', data.length, 'pairs from', endpoint);

      // Filter USDT pairs
      const usdtPairs = data.filter((t: { symbol: string }) =>
        t.symbol.endsWith('USDT') && 
        !t.symbol.includes('UP') && 
        !t.symbol.includes('DOWN') && 
        !t.symbol.includes('BEAR') && 
        !t.symbol.includes('BULL') &&
        !t.symbol.includes('HEDGE')
      );

      const marketData: MarketData[] = usdtPairs.map((ticker: {
        symbol: string;
        lastPrice: string;
        priceChange: string;
        priceChangePercent: string;
        volume: string;
        quoteVolume: string;
        highPrice: string;
        lowPrice: string;
        openPrice: string;
      }) => {
        const price = parseFloat(ticker.lastPrice) || 0;
        return {
          symbol: ticker.symbol,
          price,
          priceChange: parseFloat(ticker.priceChange) || 0,
          priceChangePercent: parseFloat(ticker.priceChangePercent) || 0,
          volume: parseFloat(ticker.volume) || 0,
          quoteVolume: parseFloat(ticker.quoteVolume) || 0,
          highPrice: parseFloat(ticker.highPrice) || price,
          lowPrice: parseFloat(ticker.lowPrice) || price,
          openPrice: parseFloat(ticker.openPrice) || price,
          category: getCoinCategory(ticker.symbol),
        };
      }).filter((coin: MarketData) => coin.price > 0);

      if (marketData.length > 0) {
        return formatResponse(marketData, 'Binance');
      }
    } catch (error) {
      console.error('Binance endpoint error:', endpoint, error);
      continue;
    }
  }

  console.log('All Binance endpoints failed');
  return null;
}

function formatResponse(marketData: MarketData[], source: string) {
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

  // No-cache headers
  const resHeaders = new Headers();
  resHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');

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
    source,
    timestamp: Date.now(),
  }, { headers: resHeaders });
}
