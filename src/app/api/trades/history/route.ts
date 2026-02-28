import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Geçmiş işlemleri getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const symbol = searchParams.get('symbol');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId gerekli' }, { status: 400 });
    }

    const where: Record<string, unknown> = { userId };
    if (symbol) where.symbol = symbol;

    const history = await db.tradeHistory.findMany({
      where,
      orderBy: { closedAt: 'desc' },
      take: limit,
    });

    // Parse reasons JSON
    const historyWithParsedReasons = history.map(trade => ({
      ...trade,
      reasons: JSON.parse(trade.reasons),
    }));

    return NextResponse.json({ 
      success: true, 
      data: historyWithParsedReasons 
    });
  } catch (error) {
    console.error('History fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Geçmiş işlemler alınamadı' 
    }, { status: 500 });
  }
}
