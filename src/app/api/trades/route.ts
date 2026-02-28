import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET - Aktif işlemleri getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status') || 'ACTIVE';

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId gerekli' }, { status: 400 });
    }

    const trades = await db.trade.findMany({
      where: { 
        userId,
        status: status === 'ALL' ? undefined : status 
      },
      orderBy: { createdAt: 'desc' },
    });

    // Parse reasons JSON
    const tradesWithParsedReasons = trades.map(trade => ({
      ...trade,
      reasons: JSON.parse(trade.reasons),
    }));

    return NextResponse.json({ 
      success: true, 
      data: tradesWithParsedReasons 
    });
  } catch (error) {
    console.error('Trades fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'İşlemler alınamadı' 
    }, { status: 500 });
  }
}

// POST - Yeni işlem oluştur
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      symbol, 
      type, 
      signalType, 
      signalStrength,
      entryPrice, 
      stopLoss, 
      takeProfit, 
      reasons,
      timeframe 
    } = body;

    if (!userId || !symbol || !type || !entryPrice) {
      return NextResponse.json({ 
        success: false, 
        error: 'Eksik parametreler' 
      }, { status: 400 });
    }

    // Aynı coin için aktif işlem var mı kontrol et
    const existingTrade = await db.trade.findFirst({
      where: { 
        userId, 
        symbol, 
        status: 'ACTIVE' 
      },
    });

    if (existingTrade) {
      return NextResponse.json({ 
        success: false, 
        error: `${symbol} için zaten aktif işlem var`,
        existingTrade: {
          ...existingTrade,
          reasons: JSON.parse(existingTrade.reasons),
        }
      }, { status: 400 });
    }

    // Yeni işlem oluştur
    const trade = await db.trade.create({
      data: {
        userId,
        symbol,
        type,
        signalType: signalType || 'scalp',
        signalStrength: signalStrength || 50,
        entryPrice,
        stopLoss,
        takeProfit,
        currentPrice: entryPrice,
        status: 'ACTIVE',
        pnl: 0,
        pnlPercent: 0,
        reasons: JSON.stringify(reasons || []),
        timeframe: timeframe || '1h',
      },
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        ...trade,
        reasons: JSON.parse(trade.reasons),
      }
    });
  } catch (error) {
    console.error('Trade create error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'İşlem oluşturulamadı' 
    }, { status: 500 });
  }
}

// DELETE - İşlem iptal et
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tradeId = searchParams.get('tradeId');

    if (!tradeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'tradeId gerekli' 
      }, { status: 400 });
    }

    const trade = await db.trade.update({
      where: { id: tradeId },
      data: { 
        status: 'CANCELLED',
        closedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        ...trade,
        reasons: JSON.parse(trade.reasons),
      }
    });
  } catch (error) {
    console.error('Trade cancel error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'İşlem iptal edilemedi' 
    }, { status: 500 });
  }
}
