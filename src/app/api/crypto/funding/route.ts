import { NextRequest, NextResponse } from 'next/server';

// Fetch Funding Rate from Binance Futures
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';

    // Fetch funding rate
    const fundingResponse = await fetch(
      `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=1`,
      { next: { revalidate: 30 } }
    );

    if (!fundingResponse.ok) {
      throw new Error('Binance Futures API error');
    }

    const fundingData = await fundingResponse.json();
    const currentFunding = fundingData[0] || { fundingRate: '0', fundingTime: Date.now() };

    // Fetch open interest
    const oiResponse = await fetch(
      `https://fapi.binance.com/fapi/v1/openInterest?symbol=${symbol}`,
      { next: { revalidate: 30 } }
    );

    let openInterest = 0;
    let openInterestValue = 0;
    
    if (oiResponse.ok) {
      const oiData = await oiResponse.json();
      openInterest = parseFloat(oiData.openInterest || '0');
    }

    // Fetch 24h ticker for current price
    const tickerResponse = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`,
      { next: { revalidate: 30 } }
    );

    let currentPrice = 0;
    let priceChange24h = 0;
    
    if (tickerResponse.ok) {
      const tickerData = await tickerResponse.json();
      currentPrice = parseFloat(tickerData.lastPrice || '0');
      priceChange24h = parseFloat(tickerData.priceChangePercent || '0');
      openInterestValue = openInterest * currentPrice;
    }

    // Fetch historical funding rates for trend
    const historyResponse = await fetch(
      `https://fapi.binance.com/fapi/v1/fundingRate?symbol=${symbol}&limit=8`,
      { next: { revalidate: 60 } }
    );

    let fundingHistory: { time: number; rate: number }[] = [];
    let avgFunding = 0;
    
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      fundingHistory = historyData.map((item: { fundingTime: number; fundingRate: string }) => ({
        time: item.fundingTime,
        rate: parseFloat(item.fundingRate) * 100,
      }));
      avgFunding = fundingHistory.reduce((sum: number, item: { rate: number }) => sum + item.rate, 0) / fundingHistory.length;
    }

    const fundingRate = parseFloat(currentFunding.fundingRate) * 100;
    
    // Interpret funding rate
    let sentiment = 'nötr';
    let sentimentEmoji = '⚖️';
    if (fundingRate > 0.05) {
      sentiment = 'aşırı uzun';
      sentimentEmoji = '📈🔥';
    } else if (fundingRate > 0.01) {
      sentiment = 'hafif uzun';
      sentimentEmoji = '📈';
    } else if (fundingRate < -0.05) {
      sentiment = 'aşırı kısa';
      sentimentEmoji = '📉🔥';
    } else if (fundingRate < -0.01) {
      sentiment = 'hafif kısa';
      sentimentEmoji = '📉';
    }

    return NextResponse.json({
      success: true,
      symbol,
      fundingRate: fundingRate.toFixed(4),
      fundingRatePercent: fundingRate.toFixed(4),
      fundingTime: currentFunding.fundingTime,
      nextFundingTime: currentFunding.fundingTime + (8 * 60 * 60 * 1000),
      openInterest: openInterest.toFixed(4),
      openInterestValue: openInterestValue.toFixed(2),
      currentPrice,
      priceChange24h: priceChange24h.toFixed(2),
      avgFundingRate: avgFunding.toFixed(4),
      fundingHistory,
      sentiment,
      sentimentEmoji,
      interpretation: {
        fundingRate: fundingRate > 0 
          ? 'Uzun pozisyonlar kısalara ödeme yapıyor'
          : 'Kısa pozisyonlar uzunlara ödeme yapıyor',
        recommendation: fundingRate > 0.05 
          ? 'Yüksek pozitif funding - Long pozisyonlar pahalı!'
          : fundingRate < -0.05 
          ? 'Yüksek negatif funding - Short pozisyonlar pahalı!'
          : 'Normal funding seviyeleri',
      },
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Funding rate fetch error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Funding rate verileri alınamadı',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
