import { NextRequest, NextResponse } from 'next/server';
import { generateMultiSheetExcel, ExportSheetData } from '@/lib/excel';
import { incrementExportCount } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sheets, fileName, recordId } = body;

    if (!sheets || !Array.isArray(sheets) || sheets.length === 0) {
      return NextResponse.json(
        { success: false, message: '请提供待导出的 Sheet 数据' },
        { status: 400 }
      );
    }

    const excelBuffer = generateMultiSheetExcel(sheets as ExportSheetData[]);

    if (recordId) {
      incrementExportCount(recordId);
    }

    const nowStr = new Date().toISOString().slice(0, 10);
    const downloadName = encodeURIComponent(
      fileName || `提取数据_${nowStr}.xlsx`
    );

    return new Response(new Uint8Array(excelBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${downloadName}"; filename*=UTF-8''${downloadName}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('Export excel error:', error);
    return NextResponse.json(
      { success: false, message: 'Excel 导出失败: ' + error.message },
      { status: 500 }
    );
  }
}
