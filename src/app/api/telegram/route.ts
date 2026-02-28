import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botToken, chatId, message } = body as {
      botToken: string;
      chatId: string;
      message: string;
    };

    // Validate inputs
    if (!botToken || !chatId || !message) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Bot token, Chat ID ve mesaj gereklidir',
        },
        { status: 400 }
      );
    }

    // Send message via Telegram API
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram API error:', errorData);
      return NextResponse.json(
        { 
          success: false, 
          error: `Telegram hatası: ${errorData.description || 'Bilinmeyen hata'}`,
        },
        { status: 400 }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      messageId: result.result?.message_id,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Telegram notification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Telegram mesajı gönderilemedi',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

// Test Telegram connection
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const botToken = searchParams.get('botToken');
    const chatId = searchParams.get('chatId');

    if (!botToken || !chatId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Bot token ve Chat ID gereklidir',
        },
        { status: 400 }
      );
    }

    // Get bot info
    const botInfoUrl = `https://api.telegram.org/bot${botToken}/getMe`;
    const botInfoResponse = await fetch(botInfoUrl);
    
    if (!botInfoResponse.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Geçersiz Bot Token',
        },
        { status: 400 }
      );
    }

    const botInfo = await botInfoResponse.json();

    // Send test message
    const testMessage = `🤖 <b>Bağlantı Testi</b>

✅ Telegram bağlantınız başarıyla kuruldu!

📊 Kripto Analiz Dashboard'unuz artık sinyal bildirimleri gönderebilir.

⏰ Test Zamanı: ${new Date().toLocaleString('tr-TR')}`;

    const sendUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: testMessage,
        parse_mode: 'HTML',
      }),
    });

    if (!sendResponse.ok) {
      const errorData = await sendResponse.json();
      return NextResponse.json(
        { 
          success: false, 
          error: `Mesaj gönderilemedi: ${errorData.description || 'Geçersiz Chat ID'}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      botName: botInfo.result?.username,
      message: 'Telegram bağlantısı başarılı! Test mesajı gönderildi.',
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Telegram test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Telegram bağlantısı kurulamadı',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
