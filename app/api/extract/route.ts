import { NextRequest, NextResponse } from 'next/server';
import { extractDataFromImage } from '@/lib/ai-extractor';
import { saveRecord, ExtractedItem, RecordItem } from '@/lib/db';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { images, promptType = 'table', customPrompt = '' } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { success: false, message: '请提供待识别的图片列表' },
        { status: 400 }
      );
    }

    const items: ExtractedItem[] = [];
    const recordId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    for (let index = 0; index < images.length; index++) {
      const img = images[index];
      const fileName = img.name || `image_${index + 1}.png`;
      const mimeType = img.type || 'image/jpeg';
      const fileSize = img.size || 0;
      const sheetName = img.sheetName || `Sheet${index + 1}`;
      const itemPromptType = img.promptType || promptType;
      const itemCustomPrompt = img.customPrompt || customPrompt;

      // Validation
      if (fileSize > MAX_FILE_SIZE) {
        items.push({
          id: img.id || `item_${index + 1}`,
          fileName,
          fileSize,
          mimeType,
          status: 'failed',
          errorMessage: '单文件大小超过 10MB 限制',
          promptType: itemPromptType,
          customPrompt: itemCustomPrompt,
          sheetName,
          extractedData: null,
        });
        continue;
      }

      if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
        items.push({
          id: img.id || `item_${index + 1}`,
          fileName,
          fileSize,
          mimeType,
          status: 'failed',
          errorMessage: `不支持的图片格式: ${mimeType}，仅支持 JPG/PNG/WEBP`,
          promptType: itemPromptType,
          customPrompt: itemCustomPrompt,
          sheetName,
          extractedData: null,
        });
        continue;
      }

      // Process image with AI
      try {
        const result = await extractDataFromImage({
          imageBase64: img.base64,
          mimeType,
          promptType: itemPromptType,
          customPrompt: itemCustomPrompt,
        });

        // Store a lightweight thumbnail preview in DB (or base64 if within reasonable limit)
        // To prevent DB blowup, thumbnail base64 is preserved
        items.push({
          id: img.id || `item_${index + 1}`,
          fileName,
          fileSize,
          mimeType,
          thumbnailUrl: img.base64?.length < 800000 ? img.base64 : undefined,
          status: 'success',
          promptType: itemPromptType,
          customPrompt: itemCustomPrompt,
          sheetName,
          modelUsed: result.modelUsed,
          extractedData: {
            headers: result.headers,
            rows: result.rows,
            summaryText: result.summaryText,
            rawResponse: result.rawResponse,
          },
          processedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        items.push({
          id: img.id || `item_${index + 1}`,
          fileName,
          fileSize,
          mimeType,
          thumbnailUrl: img.base64?.length < 800000 ? img.base64 : undefined,
          status: 'failed',
          errorMessage: err.message || '识别模型调用失败',
          promptType: itemPromptType,
          customPrompt: itemCustomPrompt,
          sheetName,
          extractedData: null,
          processedAt: new Date().toISOString(),
        });
      }
    }

    const successCount = items.filter((i) => i.status === 'success').length;
    const overallStatus: 'completed' | 'partial' | 'failed' =
      successCount === items.length
        ? 'completed'
        : successCount > 0
        ? 'partial'
        : 'failed';

    const summary = `共处理 ${items.length} 张图片，成功 ${successCount} 张，失败 ${items.length - successCount} 张`;

    const record: RecordItem = {
      id: recordId,
      createdAt: new Date().toISOString(),
      imageCount: items.length,
      status: overallStatus,
      summary,
      promptType,
      items,
      exportCount: 0,
    };

    saveRecord(record);

    return NextResponse.json({
      success: true,
      recordId: record.id,
      status: overallStatus,
      summary,
      items,
    });
  } catch (error: any) {
    console.error('Extraction handler error:', error);
    return NextResponse.json(
      { success: false, message: '数据提取异常: ' + error.message },
      { status: 500 }
    );
  }
}
