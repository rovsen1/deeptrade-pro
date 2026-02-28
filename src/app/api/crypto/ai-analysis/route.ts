import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

interface Signal {
  symbol: string;
  signal: string;
  strength: number;
  reasons: string[];
  indicators: {
    rsi: number;
    macdHistogram: number;
    ema50: number;
    ema200: number;
    support: number;
    resistance: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, signals, marketData, dominance } = body as {
      symbol: string;
      signals: Signal[];
      marketData: {
        priceChangePercent: number;
        volume: number;
        highPrice: number;
        lowPrice: number;
      };
      dominance: {
        btcDominance: string;
        dominanceTrend: string;
      };
    };

    // Initialize AI
    const zai = await ZAI.create();

    // Prepare analysis data
    const buySignals = signals.filter(s => s.signal === 'AL');
    const sellSignals = signals.filter(s => s.signal === 'SAT');
    const holdSignals = signals.filter(s => s.signal === 'BEKLE');

    const scalpSignals = signals.filter(s => s.type === 'scalp');
    const swingSignals = signals.filter(s => s.type === 'swing');

    // Calculate average indicators
    const avgRSI = signals.length > 0 
      ? signals.reduce((sum, s) => sum + (s.indicators?.rsi || 50), 0) / signals.length 
      : 50;
    
    const prompt = `Sen profesyonel bir kripto para analisti ve trader'sın. Aşağıdaki teknik analiz verilerine dayanarak ${symbol} için kısa ve öz bir piyasa yorumu yap.

VERİLER:
- Sembol: ${symbol}
- Fiyat Değişimi (24h): %{marketData?.priceChangePercent?.toFixed(2) || '0'}
- RSI Ortalaması: ${avgRSI.toFixed(1)}
- AL Sinyali Sayısı: ${buySignals.length}
- SAT Sinyali Sayısı: ${sellSignals.length}
- BEKLE Sinyali Sayısı: ${holdSignals.length}
- Scalp Sinyalleri: ${scalpSignals.length} adet
- Swing Sinyalleri: ${swingSignals.length} adet
- BTC Dominance: %{dominance?.btcDominance || '52'}
- Piyasa Trendi: ${dominance?.dominanceTrend || 'nötr'}

EN GÜÇLÜ AL SİNYALLERİ:
${buySignals.slice(0, 3).map(s => `- ${s.timeframe}: Güç %{s.strength}, ${s.reasons?.slice(0, 2).join(', ')}`).join('\n') || '- Yok'}

EN GÜÇLÜ SAT SİNYALLERİ:
${sellSignals.slice(0, 3).map(s => `- ${s.timeframe}: Güç %{s.strength}, ${s.reasons?.slice(0, 2).join(', ')}`).join('\n') || '- Yok'}

Lütfen şu formatta kısa bir analiz yap:

📊 GENEL GÖRÜNÜM: (1-2 cümle ile piyasa durumu)
🎯 SİNYAL ANALİZİ: (AL veya SAT mı daha güçlü, neden)
⚠️ RİSK UYARISI: (Dikkat edilmesi gerekenler)
💡 STRATEJİ ÖNERİSİ: (Scalp ve Swing için kısa öneriler)

Türkçe yanıtla, kısa ve öz ol. Maksimum 200 kelime.`;

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'Sen profesyonel bir kripto para analistisin. Kısa, öz ve action-oriented analizler yapıyorsun. Türkçe konuşuyorsun.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const analysis = completion.choices[0]?.message?.content || 'Analiz yapılamadı';

    return NextResponse.json({
      success: true,
      symbol,
      analysis,
      summary: {
        trend: buySignals.length > sellSignals.length ? 'yükseliş' : sellSignals.length > buySignals.length ? 'düşüş' : 'yatay',
        confidence: Math.max(buySignals.length, sellSignals.length) / Math.max(signals.length, 1) * 100,
        recommendation: buySignals.length > sellSignals.length + 2 ? 'ALIM' : sellSignals.length > buySignals.length + 2 ? 'SATIM' : 'BEKLE',
      },
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('AI Analysis error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'AI analizi yapılamadı',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
