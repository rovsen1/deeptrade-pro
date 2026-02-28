import { NextResponse } from 'next/server';

// Top USDT pairs to track
const TOP_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
  'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'LTCUSDT', 'ETCUSDT',
  'NEARUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT', 'INJUSDT',
  'SUIUSDT', 'SEIUSDT', 'TIAUSDT', 'WLDUSDT', 'PEPEUSDT',
  'FILUSDT', 'IMXUSDT', 'RNDRUSDT', 'FETUSDT', 'GRTUSDT',
  'AAVEUSDT', 'RUNEUSDT', 'FLOWUSDT', 'ALGOUSDT', 'VETUSDT',
  'MANAUSDT', 'SANDUSDT', 'AXSUSDT', 'GALAUSDT', 'ENSUSDT',
  'LDOUSDT', 'CRVUSDT', 'COMPUSDT', 'SNXUSDT', 'MKRUSDT',
  'SUSHIUSDT', 'YFIUSDT', '1INCHUSDT', 'ZRXUSDT', 'KAVAUSDT'
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
}

export async function GET() {
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
      next: { revalidate: 30 } // Cache for 30 seconds
    });

    if (!response.ok) {
      throw new Error('Binance API error');
    }

    const data = await response.json();

    // Filter USDT pairs and get top 50 by volume
    const usdtPairs = data
      .filter((item: { symbol: string }) => 
        item.symbol.endsWith('USDT') && 
        !item.symbol.includes('UP') && 
        !item.symbol.includes('DOWN') &&
        !item.symbol.includes('BULL') &&
        !item.symbol.includes('BEAR')
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
      }))
      .sort((a: MarketData, b: MarketData) => b.quoteVolume - a.quoteVolume)
      .slice(0, 50);

    // Prioritize our tracked pairs
    const prioritizedPairs = [...usdtPairs].sort((a, b) => {
      const aIndex = TOP_PAIRS.indexOf(a.symbol);
      const bIndex = TOP_PAIRS.indexOf(b.symbol);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return NextResponse.json({
      success: true,
      data: prioritizedPairs,
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
