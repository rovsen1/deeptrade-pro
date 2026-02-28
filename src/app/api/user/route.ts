import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Kullanıcı bilgilerini getir
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const username = searchParams.get('username');

    if (!userId && !username) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId veya username gerekli' 
      }, { status: 400 });
    }

    const user = userId 
      ? await db.user.findUnique({ where: { id: userId } })
      : await db.user.findUnique({ where: { username: username! } });

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Kullanıcı bulunamadı' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: user 
    });
  } catch (error) {
    console.error('User fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Kullanıcı bilgileri alınamadı' 
    }, { status: 500 });
  }
}

// POST - Yeni kullanıcı oluştur veya varsa getir
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, telegramBotToken, telegramChatId, notificationsEnabled } = body;

    if (!username) {
      return NextResponse.json({ 
        success: false, 
        error: 'username gerekli' 
      }, { status: 400 });
    }

    // Kullanıcı var mı kontrol et
    let user = await db.user.findUnique({
      where: { username },
    });

    if (user) {
      // Güncelle
      user = await db.user.update({
        where: { username },
        data: {
          telegramBotToken,
          telegramChatId,
          notificationsEnabled: notificationsEnabled ?? user.notificationsEnabled,
        },
      });
    } else {
      // Yeni oluştur
      user = await db.user.create({
        data: {
          username,
          telegramBotToken,
          telegramChatId,
          notificationsEnabled: notificationsEnabled ?? false,
        },
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: user,
      isNew: !user.createdAt || user.createdAt === user.updatedAt,
    });
  } catch (error) {
    console.error('User create error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Kullanıcı oluşturulamadı' 
    }, { status: 500 });
  }
}

// PUT - Kullanıcı bilgilerini güncelle
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, username, telegramBotToken, telegramChatId, notificationsEnabled } = body;

    if (!userId && !username) {
      return NextResponse.json({ 
        success: false, 
        error: 'userId veya username gerekli' 
      }, { status: 400 });
    }

    const user = userId
      ? await db.user.update({
          where: { id: userId },
          data: {
            telegramBotToken,
            telegramChatId,
            notificationsEnabled,
          },
        })
      : await db.user.update({
          where: { username: username! },
          data: {
            telegramBotToken,
            telegramChatId,
            notificationsEnabled,
          },
        });

    return NextResponse.json({ 
      success: true, 
      data: user 
    });
  } catch (error) {
    console.error('User update error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Kullanıcı güncellenemedi' 
    }, { status: 500 });
  }
}
