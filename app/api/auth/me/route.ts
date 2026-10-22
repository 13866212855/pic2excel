import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getAdminUser } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, message: '未授权或登录已过期' },
      { status: 401 }
    );
  }

  const user = getAdminUser(auth.username);
  if (!user) {
    return NextResponse.json(
      { success: false, message: '用户不存在' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      username: user.username,
      role: 'admin',
      createdAt: user.createdAt,
    },
  });
}
