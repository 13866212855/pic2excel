import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest, maskApiKey } from '@/lib/auth';
import { getConfig, updateConfig } from '@/lib/db';

export async function GET(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, message: '未授权访问' },
      { status: 401 }
    );
  }

  const config = getConfig();
  const url = new URL(req.url);
  const reveal = url.searchParams.get('reveal') === 'true';

  return NextResponse.json({
    success: true,
    config: {
      baseUrl: config.baseUrl,
      apiKey: reveal ? config.apiKey : maskApiKey(config.apiKey),
      isMasked: !reveal,
      textModel: config.textModel,
      imageModel: config.imageModel,
      useGeminiBackup: config.useGeminiBackup,
      hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
      updatedAt: config.updatedAt,
    },
  });
}

export async function PUT(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, message: '未授权访问' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const current = getConfig();

    const updates: any = {};
    if (typeof body.baseUrl === 'string' && body.baseUrl.trim()) {
      updates.baseUrl = body.baseUrl.trim();
    }
    if (typeof body.textModel === 'string' && body.textModel.trim()) {
      updates.textModel = body.textModel.trim();
    }
    if (typeof body.imageModel === 'string' && body.imageModel.trim()) {
      updates.imageModel = body.imageModel.trim();
    }
    if (typeof body.useGeminiBackup === 'boolean') {
      updates.useGeminiBackup = body.useGeminiBackup;
    }

    // Only update apiKey if provided and not masked
    if (typeof body.apiKey === 'string' && body.apiKey.trim() && !body.apiKey.includes('****')) {
      updates.apiKey = body.apiKey.trim();
    }

    const updated = updateConfig(updates);

    return NextResponse.json({
      success: true,
      message: '配置已成功保存至系统数据库',
      config: {
        baseUrl: updated.baseUrl,
        apiKey: maskApiKey(updated.apiKey),
        isMasked: true,
        textModel: updated.textModel,
        imageModel: updated.imageModel,
        useGeminiBackup: updated.useGeminiBackup,
        hasGeminiApiKey: Boolean(process.env.GEMINI_API_KEY),
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: '保存配置失败: ' + error.message },
      { status: 500 }
    );
  }
}
