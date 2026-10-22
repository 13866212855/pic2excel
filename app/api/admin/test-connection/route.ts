import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getConfig } from '@/lib/db';

export async function POST(req: NextRequest) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    return NextResponse.json(
      { success: false, message: '未授权访问' },
      { status: 401 }
    );
  }

  const currentConfig = getConfig();
  let testBaseUrl = currentConfig.baseUrl;
  let testApiKey = currentConfig.apiKey;
  let testModel = currentConfig.textModel || 'agnes-2.5-flash';

  try {
    const body = await req.json().catch(() => ({}));
    if (body.baseUrl) testBaseUrl = body.baseUrl;
    if (body.apiKey && !body.apiKey.includes('****')) testApiKey = body.apiKey;
    if (body.textModel) testModel = body.textModel;
  } catch {}

  const cleanBaseUrl = (testBaseUrl || 'https://apihub.agnes-ai.com/v1').replace(/\/+$/, '');
  const endpoint = `${cleanBaseUrl}/chat/completions`;

  // 1. Try to query /models to get available models for this apiKey
  let availableModels: string[] = [];
  try {
    const modelsRes = await fetch(`${cleanBaseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${testApiKey}`,
      },
      signal: AbortSignal.timeout(6000),
    });
    if (modelsRes.ok) {
      const modelsData = await modelsRes.json();
      if (Array.isArray(modelsData?.data)) {
        availableModels = modelsData.data.map((m: any) => m.id);
      }
    }
  } catch (err) {
    console.warn('[test-connection] Failed to fetch /models:', err);
  }

  // 2. Candidate models to test (exact, lowercase, or fallback to first available text/chat model)
  const candidateModels: string[] = [];
  candidateModels.push(testModel);
  if (testModel !== testModel.toLowerCase()) {
    candidateModels.push(testModel.toLowerCase());
  }
  if (availableModels.length > 0) {
    const chatCandidates = availableModels.filter(
      (m) => !m.includes('video') && !m.includes('image-2')
    );
    chatCandidates.forEach((m) => {
      if (!candidateModels.includes(m)) {
        candidateModels.push(m);
      }
    });
  }

  const startTime = Date.now();
  let lastError: any = null;
  let lastStatus = 0;
  let lastErrorText = '';
  let successfulModel = '';
  let replyText = '';

  for (const modelToTry of candidateModels) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${testApiKey}`,
        },
        body: JSON.stringify({
          model: modelToTry,
          messages: [{ role: 'user', content: '请回复: OK' }],
          max_tokens: 10,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      lastStatus = response.status;

      if (response.ok) {
        const data = await response.json();
        replyText =
          data.choices?.[0]?.message?.content ||
          data.choices?.[0]?.message?.reasoning_content ||
          'OK';
        successfulModel = modelToTry;
        break;
      } else {
        const errJson = await response.json().catch(() => ({}));
        lastErrorText =
          errJson.error?.message ||
          (await response.text().catch(() => '')) ||
          response.statusText;
        lastError = errJson;
      }
    } catch (err: any) {
      lastError = err;
      lastErrorText = err.message || '网络连接失败';
    }
  }

  const latencyMs = Date.now() - startTime;

  if (successfulModel) {
    const isAutoCorrected = successfulModel !== testModel;
    return NextResponse.json({
      success: true,
      latencyMs,
      message: isAutoCorrected
        ? `测试连接成功！(注意：API 服务要求模型名称必须为全小写 "${successfulModel}"，已为您自动匹配纠正)`
        : '测试连接成功，接口响应正常！',
      details: `有效模型: ${successfulModel} | 延迟: ${latencyMs}ms | 响应预览: "${replyText.trim()}"`,
      suggestedModel: successfulModel,
      availableModels,
      endpoint,
    });
  }

  // If failed
  let troubleshootingHint = '';
  if (lastStatus === 404) {
    troubleshootingHint = `提示：服务端返回 404 model_not_found，说明 API 密钥有效，但模型名称不匹配（该接口区分大小写且必须全小写，如 "agnes-2.5-flash"）。${
      availableModels.length > 0 ? `当前密钥授权的可用模型列表为: [${availableModels.join(', ')}]` : ''
    }`;
  } else if (lastStatus === 401) {
    troubleshootingHint = '提示：API 密钥无效或已过期 (401 Unauthorized)，请检查 API 密钥是否填写正确。';
  } else if (lastStatus === 403) {
    troubleshootingHint = '提示：账户余额不足或无此模型调用权限 (403 Forbidden)。';
  }

  return NextResponse.json({
    success: false,
    latencyMs,
    status: lastStatus || 500,
    message: `模型服务返回错误 HTTP ${lastStatus || 'ERR'}`,
    details: `${lastErrorText} ${troubleshootingHint ? '\n' + troubleshootingHint : ''}`,
    suggestedModel: availableModels[0] || undefined,
    availableModels,
    endpoint,
  });
}
