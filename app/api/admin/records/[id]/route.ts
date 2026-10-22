import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getRecordById, deleteRecord } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, message: '未授权访问' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const record = getRecordById(id);

  if (!record) {
    return NextResponse.json(
      { success: false, message: '未找到该记录' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    record,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, message: '未授权访问' },
      { status: 401 }
    );
  }

  const { id } = await params;
  const deleted = deleteRecord(id);

  if (!deleted) {
    return NextResponse.json(
      { success: false, message: '记录不存在或已被删除' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    message: '记录已成功删除',
  });
}
