import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Health check working',
    timestamp: Date.now(),
    env: process.env.NODE_ENV,
  });
}
