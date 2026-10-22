import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'image_excel_extractor_super_secret_jwt_key_2026';
const TOKEN_EXPIRY = '24h';

export interface TokenPayload {
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export function signToken(payload: { username: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch {
    return null;
  }
}

export function getAuthFromRequest(req: NextRequest | Request): TokenPayload | null {
  let token: string | undefined;

  // Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // Check cookie if not in header
  if (!token && 'cookies' in req) {
    const cookieToken = (req as NextRequest).cookies.get('admin_token')?.value;
    if (cookieToken) {
      token = cookieToken;
    }
  }

  if (!token) return null;
  return verifyToken(token);
}

export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '****';
  const prefix = key.slice(0, 7);
  const suffix = key.slice(-8);
  return `${prefix}****${suffix}`;
}
