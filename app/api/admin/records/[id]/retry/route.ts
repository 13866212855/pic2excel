import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getRecordById, updateRecord } from '@/lib/db';
import { extractDataFromImage } from '@/lib/ai-extractor';

export async function POST(
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
      { success: false, message: '记录不存在' },
      { status: 404 }
    );
  }

  const failedItems = record.items.filter((item) => item.status === 'failed');
  if (failedItems.length === 0) {
    return NextResponse.json({
      success: true,
      message: '该记录中没有失败的项目需要重试',
      record,
    });
  }

  for (const item of failedItems) {
    if (item.thumbnailUrl && item.thumbnailUrl.startsWith('data:')) {
      item.status = 'processing';
      try {
        const result = await extractDataFromImage({
          imageBase64: item.thumbnailUrl,
          mimeType: item.mimeType,
          promptType: item.promptType || 'table',
          customPrompt: item.customPrompt,
        });

        item.status = 'success';
        item.errorMessage = undefined;
        item.extractedData = {
          headers: result.headers,
          rows: result.rows,
          summaryText: result.summaryText,
          rawResponse: result.rawResponse,
        };
        item.modelUsed = result.modelUsed;
        item.processedAt = new Date().toISOString();
      } catch (err: any) {
        item.status = 'failed';
        item.errorMessage = err.message || '重试依然失败';
      }
    }
  }

  const successCount = record.items.filter((i) => i.status === 'success').length;
  record.status =
    successCount === record.items.length
      ? 'completed'
      : successCount > 0
      ? 'partial'
      : 'failed';

  updateRecord(record.id, {
    items: record.items,
    status: record.status,
  });

  return NextResponse.json({
    success: true,
    message: `重试处理完成，成功: ${successCount}/${record.items.length}`,
    record,
  });
}
