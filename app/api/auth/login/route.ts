import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminUser } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: '请输入管理员用户名和密码' },
        { status: 400 }
      );
    }

    const admin = getAdminUser(username);
    if (!admin) {
      return NextResponse.json(
        { success: false, message: '账号或密码不正确' },
        { status: 401 }
      );
    }

    const isMatch = bcrypt.compareSync(password, admin.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: '账号或密码不正确' },
        { status: 401 }
      );
    }

    const token = signToken({ username: admin.username, role: 'admin' });

    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      token,
      user: {
        username: admin.username,
        role: 'admin',
      },
    });

    // Set HTTP-only cookie for web security
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: '服务器内部错误，请稍后重试' },
      { status: 500 }
    );
  }
}
