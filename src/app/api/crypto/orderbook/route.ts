import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const limit = parseInt(searchParams.get('limit') || '20');

    const response = await fetch(
      `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=${limit}`,
      { next: { revalidate: 5 } } // Cache for 5 seconds
    );

    if (!response.ok) {
      throw new Error('Binance API error');
    }

    const data = await response.json();

    // Calculate bid/ask totals and spread
    const bids = data.bids.map((bid: string[]) => ({
      price: parseFloat(bid[0]),
      quantity: parseFloat(bid[1]),
      total: 0,
    }));

    const asks = data.asks.map((ask: string[]) => ({
      price: parseFloat(ask[0]),
      quantity: parseFloat(ask[1]),
      total: 0,
    }));

    // Calculate cumulative totals
    let bidTotal = 0;
    for (let i = 0; i < bids.length; i++) {
      bidTotal += bids[i].quantity * bids[i].price;
      bids[i].total = bidTotal;
    }

    let askTotal = 0;
    for (let i = 0; i < asks.length; i++) {
      askTotal += asks[i].quantity * asks[i].price;
      asks[i].total = askTotal;
    }

    // Calculate spread
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread = bestAsk - bestBid;
    const spreadPercent = bestBid > 0 ? ((spread / bestBid) * 100) : 0;

    // Calculate imbalance (order flow)
    const bidVolume = bids.reduce((sum: number, b: { quantity: number }) => sum + b.quantity, 0);
    const askVolume = asks.reduce((sum: number, a: { quantity: number }) => sum + a.quantity, 0);
    const imbalance = bidVolume + askVolume > 0 
      ? ((bidVolume - askVolume) / (bidVolume + askVolume)) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      symbol,
      bids: bids.slice(0, limit),
      asks: asks.slice(0, limit),
      spread: {
        value: spread,
        percent: spreadPercent.toFixed(4),
      },
      imbalance: imbalance.toFixed(2),
      bidVolume: bidVolume.toFixed(4),
      askVolume: askVolume.toFixed(4),
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Orderbook fetch error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Emir defteri alınamadı',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
