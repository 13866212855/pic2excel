import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAuthFromRequest } from '@/lib/auth';
import { getAdminUser, updateAdminPassword } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromRequest(req);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: '未授权或登录已过期' },
        { status: 401 }
      );
    }

    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: '请提供原密码和新密码' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: '新密码长度至少需要 6 个字符' },
        { status: 400 }
      );
    }

    const user = getAdminUser(auth.username);
    if (!user) {
      return NextResponse.json(
        { success: false, message: '管理员用户不存在' },
        { status: 404 }
      );
    }

    const isMatch = bcrypt.compareSync(oldPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: '原密码错误' },
        { status: 400 }
      );
    }

    const updated = updateAdminPassword(auth.username, newPassword);
    if (!updated) {
      return NextResponse.json(
        { success: false, message: '密码更新失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '密码修改成功，请牢记新密码',
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { success: false, message: '修改密码失败: ' + error.message },
      { status: 500 }
    );
  }
}
