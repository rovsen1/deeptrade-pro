import { NextResponse } from 'next/server';

interface GlobalData {
  data: {
    total_market_cap_usd: number;
    total_volume_24h_usd: number;
    bitcoin_market_cap_usd: number;
    bitcoin_percentage_of_market_cap: number;
    active_cryptocurrencies: number;
    markets: number;
    market_cap_change_percentage_24h_usd: number;
  };
}

export async function GET() {
  try {
    // Fetch global market data from CoinGecko
    const response = await fetch(
      'https://api.coingecko.com/api/v3/global',
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );

    if (!response.ok) {
      throw new Error('CoinGecko API error');
    }

    const data: GlobalData = await response.json();
    const globalData = data.data;

    // Fetch BTC price from Binance
    const btcResponse = await fetch(
      'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',
      { next: { revalidate: 30 } }
    );

    let btcPrice = 0;
    let btcChange24h = 0;
    
    if (btcResponse.ok) {
      const btcData = await btcResponse.json();
      btcPrice = parseFloat(btcData.lastPrice);
      btcChange24h = parseFloat(btcData.priceChangePercent);
    }

    // Calculate additional metrics
    const btcDominance = globalData.bitcoin_percentage_of_market_cap;
    const totalMarketCap = globalData.total_market_cap_usd;
    const totalVolume = globalData.total_volume_24h_usd;
    const altcoinMarketCap = totalMarketCap * ((100 - btcDominance) / 100);
    
    // Market sentiment based on dominance
    let dominanceTrend = 'nötr';
    if (btcDominance > 55) {
      dominanceTrend = 'btc-güçlü'; // BTC season
    } else if (btcDominance < 45) {
      dominanceTrend = 'altcoin-sezonu'; // Altcoin season
    }

    return NextResponse.json({
      success: true,
      btcDominance: btcDominance.toFixed(2),
      totalMarketCap: totalMarketCap,
      totalVolume: totalVolume,
      altcoinMarketCap: altcoinMarketCap,
      btcPrice: btcPrice,
      btcChange24h: btcChange24h.toFixed(2),
      activeCryptos: globalData.active_cryptocurrencies,
      totalMarkets: globalData.markets,
      marketCapChange24h: globalData.market_cap_change_percentage_24h_usd.toFixed(2),
      dominanceTrend,
      sentiment: {
        trend: dominanceTrend,
        description: dominanceTrend === 'btc-güçlü' 
          ? 'Bitcoin hakimiyeti yüksek, ALT coinler zayıf'
          : dominanceTrend === 'altcoin-sezonu'
          ? 'Altcoin sezonu, ALT coinler güçlü'
          : 'Piyasa dengeli',
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Dominance fetch error:', error);
    
    // Fallback data
    return NextResponse.json({
      success: true,
      btcDominance: '52.00',
      totalMarketCap: 2500000000000,
      totalVolume: 80000000000,
      altcoinMarketCap: 1200000000000,
      btcPrice: 67000,
      btcChange24h: '1.50',
      activeCryptos: 12000,
      totalMarkets: 800,
      marketCapChange24h: '0.5',
      dominanceTrend: 'nötr',
      sentiment: {
        trend: 'nötr',
        description: 'Piyasa dengeli',
      },
      timestamp: Date.now(),
      fallback: true,
    });
  }
}
