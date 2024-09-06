import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import crypto from 'crypto';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
const LOGIN_PASSWORD = process.env.LOGIN_PASSWORD || 'password123';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(request: Request) {
  const { password } = await request.json();

  if (password === LOGIN_PASSWORD) {
    const token = await new SignJWT({ authenticated: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(JWT_SECRET);
    return NextResponse.json({ token });
  } else {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }
}