import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// TP/SL Hesaplama Fonksiyonu
function calculateTPSL(
  entryPrice: number,
  type: 'LONG' | 'SHORT',
  klines: Array<{ high: number; low: number; close: number }>,
  signalType: 'scalp' | 'swing'
) {
  // ATR hesapla (14 periyot)
  const period = Math.min(14, klines.length);
  let atrSum = 0;
  
  for (let i = 1; i < period; i++) {
    const high = klines[i].high;
    const low = klines[i].low;
    const prevClose = klines[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    atrSum += tr;
  }
  const atr = atrSum / (period - 1);
  
  // Swing High/Low bul
  const lookback = signalType === 'scalp' ? 10 : 20;
  const relevantKlines = klines.slice(0, lookback);
  
  const highs = relevantKlines.map(k => k.high);
  const lows = relevantKlines.map(k => k.low);
  
  const swingHigh = Math.max(...highs);
  const swingLow = Math.min(...lows);
  
  // Risk faktörü (Scalp için daha tight, Swing için daha geniş)
  const riskMultiplier = signalType === 'scalp' ? 1.5 : 2.0;
  const rewardMultiplier = signalType === 'scalp' ? 2.0 : 2.5;
  
  let stopLoss: number;
  let takeProfit: number;
  
  if (type === 'LONG') {
    // LONG: SL aşağıda, TP yukarıda
    stopLoss = Math.max(
      swingLow,
      entryPrice - (atr * riskMultiplier)
    );
    takeProfit = Math.min(
      swingHigh,
      entryPrice + (atr * rewardMultiplier * 2)
    );
    
    // En az %1.5 TP mesafesi garanti et
    const minTPDistance = entryPrice * 0.015;
    if (takeProfit - entryPrice < minTPDistance) {
      takeProfit = entryPrice + minTPDistance;
    }
    
    // En az %1 SL mesafesi garanti et
    const minSLDistance = entryPrice * 0.01;
    if (entryPrice - stopLoss < minSLDistance) {
      stopLoss = entryPrice - minSLDistance;
    }
  } else {
    // SHORT: SL yukarıda, TP aşağıda
    stopLoss = Math.min(
      swingHigh,
      entryPrice + (atr * riskMultiplier)
    );
    takeProfit = Math.max(
      swingLow,
      entryPrice - (atr * rewardMultiplier * 2)
    );
    
    // En az %1.5 TP mesafesi garanti et
    const minTPDistance = entryPrice * 0.015;
    if (entryPrice - takeProfit < minTPDistance) {
      takeProfit = entryPrice - minTPDistance;
    }
    
    // En az %1 SL mesafesi garanti et
    const minSLDistance = entryPrice * 0.01;
    if (stopLoss - entryPrice < minSLDistance) {
      stopLoss = entryPrice + minSLDistance;
    }
  }
  
  return {
    stopLoss: parseFloat(stopLoss.toFixed(8)),
    takeProfit: parseFloat(takeProfit.toFixed(8)),
    atr: parseFloat(atr.toFixed(8)),
    swingHigh: parseFloat(swingHigh.toFixed(8)),
    swingLow: parseFloat(swingLow.toFixed(8)),
  };
}

// POST - Otomatik işlem aç (sinyal verisi ile)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      symbol,
      type, // 'LONG' | 'SHORT'
      signalType, // 'scalp' | 'swing'
      signalStrength,
      entryPrice,
      reasons,
      timeframe,
      klines, // TP/SL hesaplaması için
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

    // TP/SL hesapla
    let tpSlData;
    if (klines && klines.length >= 2) {
      tpSlData = calculateTPSL(
        entryPrice,
        type,
        klines,
        signalType || 'scalp'
      );
    } else {
      // Klines yoksa varsayılan değerler
      const slPercent = signalType === 'scalp' ? 0.015 : 0.025;
      const tpPercent = signalType === 'scalp' ? 0.03 : 0.05;
      
      tpSlData = {
        stopLoss: type === 'LONG' 
          ? entryPrice * (1 - slPercent)
          : entryPrice * (1 + slPercent),
        takeProfit: type === 'LONG'
          ? entryPrice * (1 + tpPercent)
          : entryPrice * (1 - tpPercent),
        atr: 0,
        swingHigh: entryPrice * 1.02,
        swingLow: entryPrice * 0.98,
      };
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
        stopLoss: tpSlData.stopLoss,
        takeProfit: tpSlData.takeProfit,
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
      },
      tpSlData, // Hesaplanan TP/SL bilgilerini de döndür
    });
  } catch (error) {
    console.error('Auto trade create error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Otomatik işlem oluşturulamadı' 
    }, { status: 500 });
  }
}

// GET - Sinyalden otomatik işlem oluştur (mevcut sinyal verisini kullan)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const symbol = searchParams.get('symbol');
    const signalType = searchParams.get('signalType') as 'LONG' | 'SHORT' || 'LONG';

    if (!userId || !symbol) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId ve symbol gerekli' 
      }, { status: 400 });
    }

    // Aktif işlem kontrolü
    const existingTrade = await db.trade.findFirst({
      where: { userId, symbol, status: 'ACTIVE' },
    });

    return NextResponse.json({ 
      success: true, 
      hasActiveTrade: !!existingTrade,
      activeTrade: existingTrade ? {
        ...existingTrade,
        reasons: JSON.parse(existingTrade.reasons),
      } : null,
    });
  } catch (error) {
    console.error('Auto trade check error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'İşlem kontrolü yapılamadı' 
    }, { status: 500 });
  }
}
