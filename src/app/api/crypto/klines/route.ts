import { NextRequest, NextResponse } from 'next/server';

const VALID_INTERVALS = ['5m', '15m', '1h', '4h', '1d'];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = searchParams.get('interval') || '1h';
    const limit = parseInt(searchParams.get('limit') || '200');

    if (!VALID_INTERVALS.includes(interval)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Geçersiz zaman aralığı. Kullanılabilir: ' + VALID_INTERVALS.join(', '),
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      { next: { revalidate: 30 } }
    );

    if (!response.ok) {
      throw new Error('Binance API error');
    }

    const data = await response.json();

    // Format klines data
    const klines = data.map((kline: (string | number)[]) => ({
      openTime: kline[0],
      open: parseFloat(kline[1] as string),
      high: parseFloat(kline[2] as string),
      low: parseFloat(kline[3] as string),
      close: parseFloat(kline[4] as string),
      volume: parseFloat(kline[5] as string),
      closeTime: kline[6],
      quoteVolume: parseFloat(kline[7] as string),
      trades: kline[8],
      takerBuyVolume: parseFloat(kline[9] as string),
      takerBuyQuoteVolume: parseFloat(kline[10] as string),
    }));

    return NextResponse.json({
      success: true,
      symbol,
      interval,
      data: klines,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Klines fetch error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Mum verileri alınamadı',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
