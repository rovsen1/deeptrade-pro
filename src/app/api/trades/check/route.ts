import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// TP/SL Kontrolü ve Güncelleme
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trades: tradesData } = body;

    if (!tradesData || !Array.isArray(tradesData)) {
      return NextResponse.json({ 
        success: false, 
        error: 'trades array gerekli' 
      }, { status: 400 });
    }

    const updates: Array<{
      tradeId: string;
      symbol: string;
      type: string;
      status: string;
      pnl: number;
      pnlPercent: number;
      exitPrice: number;
    }> = [];

    for (const tradeUpdate of tradesData) {
      const { tradeId, currentPrice } = tradeUpdate;

      const trade = await db.trade.findUnique({
        where: { id: tradeId },
      });

      if (!trade || trade.status !== 'ACTIVE') continue;

      // PnL hesapla
      let pnl = 0;
      let pnlPercent = 0;
      
      if (trade.type === 'LONG') {
        pnlPercent = ((currentPrice - trade.entryPrice) / trade.entryPrice) * 100;
      } else {
        pnlPercent = ((trade.entryPrice - currentPrice) / trade.entryPrice) * 100;
      }
      pnl = (trade.entryPrice * pnlPercent) / 100;

      // TP/SL kontrolü
      let newStatus = 'ACTIVE';
      let exitPrice = currentPrice;

      if (trade.type === 'LONG') {
        // LONG için TP yukarıda, SL aşağıda
        if (currentPrice >= trade.takeProfit) {
          newStatus = 'TP_HIT';
          exitPrice = trade.takeProfit;
        } else if (currentPrice <= trade.stopLoss) {
          newStatus = 'SL_HIT';
          exitPrice = trade.stopLoss;
        }
      } else {
        // SHORT için TP aşağıda, SL yukarıda
        if (currentPrice <= trade.takeProfit) {
          newStatus = 'TP_HIT';
          exitPrice = trade.takeProfit;
        } else if (currentPrice >= trade.stopLoss) {
          newStatus = 'SL_HIT';
          exitPrice = trade.stopLoss;
        }
      }

      // Güncelle
      await db.trade.update({
        where: { id: tradeId },
        data: {
          currentPrice,
          pnl,
          pnlPercent,
          status: newStatus,
          closedAt: newStatus !== 'ACTIVE' ? new Date() : undefined,
        },
      });

      // Eğer kapandıysa geçmişe ekle
      if (newStatus !== 'ACTIVE') {
        const duration = Math.floor(
          (new Date().getTime() - trade.createdAt.getTime()) / 60000
        ); // dakika cinsinden

        // Final PnL hesapla (exit price ile)
        let finalPnl = 0;
        let finalPnlPercent = 0;
        
        if (trade.type === 'LONG') {
          finalPnlPercent = ((exitPrice - trade.entryPrice) / trade.entryPrice) * 100;
        } else {
          finalPnlPercent = ((trade.entryPrice - exitPrice) / trade.entryPrice) * 100;
        }
        finalPnl = (trade.entryPrice * finalPnlPercent) / 100;

        await db.tradeHistory.create({
          data: {
            userId: trade.userId,
            symbol: trade.symbol,
            type: trade.type,
            signalType: trade.signalType,
            signalStrength: trade.signalStrength,
            entryPrice: trade.entryPrice,
            exitPrice,
            stopLoss: trade.stopLoss,
            takeProfit: trade.takeProfit,
            result: newStatus,
            pnl: finalPnl,
            pnlPercent: finalPnlPercent,
            reasons: trade.reasons,
            duration,
            openedAt: trade.createdAt,
            closedAt: new Date(),
          },
        });

        updates.push({
          tradeId,
          symbol: trade.symbol,
          type: trade.type,
          status: newStatus,
          pnl: finalPnl,
          pnlPercent: finalPnlPercent,
          exitPrice,
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      updates,
      count: updates.length,
    });
  } catch (error) {
    console.error('Trade check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'İşlem kontrolü yapılamadı' 
    }, { status: 500 });
  }
}
