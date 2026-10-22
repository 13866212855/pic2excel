import { getConfig } from './db';
import { GoogleGenAI } from '@google/genai';

export interface ExtractedTableData {
  headers: string[];
  rows: (Record<string, any> | any[])[];
  summaryText?: string;
  rawResponse?: string;
  modelUsed: string;
}

const UNIVERSAL_TABLE_INSTRUCTION = `
【核心硬性提取准则 - 严禁拒答与闲聊】：
1. 智能自适应识别：
   - 只要图片是数据表格、统计报表、教育数据表、花名册、财务凭证或任意表格（例如教基统计表、成绩单、Excel截图等），你【必须直接将图片中的全部真实表头与所有数据单元格逐行逐列精确提取】，绝对不能遗漏任何一列数据和任何一个数值！
   - 若有合并或多级表头，请完整拼接（如“外语-#英语”），确保每一列都有对应的表头。
   - 提取每一行的所有数值（包括 0、符号、分类代码、具体数字），按原图工整对齐。
2. 绝对严禁事项：
   - 严禁输出任何“这不是聊天记录”、“无法按照格式提取”、“抱歉”等自然语言闲聊、对话或拒答文字！
   - 无论图片是什么类型，必须且仅返回纯净合法的 JSON 对象！`;

const PROMPT_TEMPLATES: Record<string, string> = {
  auto: `你是一个顶尖的智能图片数据数字化与表格还原专家。
请仔细分析图片，自动检测图片类型并严格提取为结构化数据表格：

1. 若图片包含数据表格、统计报表、教育统计表（如教基报表）、花名册、财务清单等：
   - 提取所有真实列名作为 headers（多级列名如“外语”下包含“#英语/#日语/#俄语”，请分别命名为“外语-#英语”、“外语-#日语”、“外语-#俄语”，确保每一列都有对应字段）。
   - 将表中的每一行数据（包括序号、代码编号行、统计数字、合计、男女等）完整记录到 rows 列表中。
2. 若图片为社交聊天截图（微信、QQ、钉钉等）：
   - headers: ["序号", "发送时间", "发言人", "消息类型", "消息内容", "备注/金额"]
3. 若为发票/单据凭证：
   - headers: ["序号", "货物或服务名称", "规格型号", "数量", "单价", "金额", "税率", "税额"]

${UNIVERSAL_TABLE_INSTRUCTION}

请必须且只能返回纯净合法的 JSON 对象，格式如下：
{
  "headers": ["列1名称", "列2名称", "列3名称", ...],
  "rows": [
    { "列1名称": "数值1", "列2名称": "数值2", ... }
  ],
  "summaryText": "简要提取总结说明"
}`,

  table: `你是一个专业的表格截图与统计数据精准还原专家。
请识别图片中的完整表格（包含大标题、全部列名、子列项、代码编号以及所有数据行的数字与文字）。

【严格要求】：
1. 提取所有实际列标题作为 headers。若有多级表头，用“-”拼接（如“外语-#英语”、“艺术-#音乐”），确保每一列都有对应名称。
2. 将每一行数据（包括甲乙代码行、初中、高中、合计行等所有记录）逐一还原为 rows 对象，精准记录每一个数字和文本。
3. 保持所有数字、数值、符号的原汁原味，不省略任何数据列。

${UNIVERSAL_TABLE_INSTRUCTION}

必须且只能返回纯净合法的 JSON 对象：
{
  "headers": ["列1", "列2", "列3", ...],
  "rows": [
    { "列1": "数值", "列2": "数值", ... }
  ],
  "summaryText": "表格识别说明"
}`,

  wechat: `你是一个专业的社交聊天记录数据提取专家。
请分析图片中的所有消息记录。
【自适应保底规则】：如果发现图片并非聊天记录而是一份统计数据表格/报表，你必须直接按原表格的行列结构提取其真实表头与全部数值数据，严禁拒答！

${UNIVERSAL_TABLE_INSTRUCTION}

请返回且仅返回合法的 JSON 对象：
{
  "headers": ["序号", "发送时间", "发言人", "消息类型", "消息内容", "备注/金额"],
  "rows": [
    { "序号": 1, "发送时间": "10:35", "发言人": "张三", "消息类型": "文本", "消息内容": "你好", "备注/金额": "" }
  ],
  "summaryText": "提取说明"
}`,

  invoice: `你是一个专业的财务票据与发票数据结构化提取专家。
请识别图片中的发票、收据、报销单或结算凭证。

${UNIVERSAL_TABLE_INSTRUCTION}

请提取票据主体信息及全部明细行，返回且仅返回合法的 JSON 对象：
{
  "headers": ["序号", "货物或应税劳务/服务名称", "规格型号", "单位", "数量", "单价", "金额", "税率", "税额"],
  "rows": [
    {
      "序号": 1,
      "货物或应税劳务/服务名称": "技术开发服务",
      "规格型号": "标准版",
      "单位": "项",
      "数量": "1",
      "单价": "5000.00",
      "金额": "5000.00",
      "税率": "6%",
      "税额": "300.00"
    }
  ],
  "summaryText": "发票代码/号码、开票日期、购买方、销售方、价税合计等关键汇总信息"
}`,

  custom: `你是一个智能图片数据提取助手。请根据用户的特别要求提取图片中的关键数据并转换为表格。
${UNIVERSAL_TABLE_INSTRUCTION}
请返回且仅返回合法的 JSON 格式：
{
  "headers": ["字段1", "字段2", ...],
  "rows": [
    { "字段1": "内容", "字段2": "内容" }
  ],
  "summaryText": "总结说明"
}`,
};

const REFUSAL_KEYWORDS = [
  '并非社交聊天',
  '不是社交聊天',
  '无法按照您要求的格式提取聊天',
  '无法按照您要求的格式提取',
  '不是聊天记录',
  '不包含任何聊天',
  '无法提取聊天',
  '请提供相关图片',
  '无法提取此数据',
];

function isRefusalResponse(text: string): boolean {
  if (!text) return false;
  return REFUSAL_KEYWORDS.some((kw) => text.includes(kw));
}

export async function extractDataFromImage(params: {
  imageBase64: string; // "data:image/png;base64,..." or raw base64
  mimeType?: string;
  promptType: string;
  customPrompt?: string;
}): Promise<ExtractedTableData> {
  const config = getConfig();

  // Normalize base64
  let base64Content = params.imageBase64;
  let detectedMime = params.mimeType || 'image/jpeg';
  if (params.imageBase64.includes(';base64,')) {
    const parts = params.imageBase64.split(';base64,');
    detectedMime = parts[0].replace('data:', '') || detectedMime;
    base64Content = parts[1];
  }
  const fullDataUrl = `data:${detectedMime};base64,${base64Content}`;

  // Build prompt
  let basePrompt = PROMPT_TEMPLATES[params.promptType] || PROMPT_TEMPLATES.auto;
  if (params.promptType === 'custom' && params.customPrompt?.trim()) {
    basePrompt = `${PROMPT_TEMPLATES.custom}\n\n用户自定义提取规则：\n${params.customPrompt.trim()}`;
  } else if (params.customPrompt?.trim()) {
    basePrompt = `${basePrompt}\n\n附加用户指示：\n${params.customPrompt.trim()}`;
  }

  // 1. Determine model for vision chat completions
  let targetModel = (config.imageModel || config.textModel || 'agnes-2.5-flash').trim().toLowerCase();
  // On apihub.agnes-ai.com, "agnes-image-*" is an image generation model (via /v1/images/generations)
  // Multimodal visual understanding models that accept image_url in /chat/completions are "agnes-2.5-flash" & "agnes-3.0-flash"
  if (targetModel.includes('image-2') || targetModel.includes('image-3')) {
    targetModel = 'agnes-2.5-flash';
  }

  let rawText = '';
  let modelUsed = targetModel;
  let primaryError: Error | null = null;

  const callModel = async (promptText: string, modelName: string) => {
    const cleanBaseUrl = (config.baseUrl || 'https://apihub.agnes-ai.com/v1').replace(/\/+$/, '');
    const endpoint = `${cleanBaseUrl}/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000); // 45 seconds

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              {
                type: 'image_url',
                image_url: {
                  url: fullDataUrl,
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`主模型服务响应失败 (${response.status}): ${errBody.slice(0, 300)}`);
    }

    const data = await response.json();
    return (
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.message?.reasoning_content ||
      ''
    );
  };

  try {
    rawText = await callModel(basePrompt, targetModel);

    // If response was conversational refusal, auto-retry with table extraction prompt
    if (isRefusalResponse(rawText)) {
      console.warn('[AIExtractor] Detected conversational refusal response. Triggering automatic corrective table pass...');
      const correctivePrompt = PROMPT_TEMPLATES.table;
      const retryText = await callModel(correctivePrompt, targetModel);
      if (retryText && !isRefusalResponse(retryText)) {
        rawText = retryText;
      }
    }

    if (!rawText) {
      throw new Error('主模型未返回有效文本内容');
    }
  } catch (err: any) {
    primaryError = err;
    console.warn(`[AIExtractor] Primary model endpoint error:`, err?.message);

    // 2. Fallback attempt: Use Google Gemini if backup enabled and GEMINI_API_KEY available
    if (config.useGeminiBackup && process.env.GEMINI_API_KEY) {
      try {
        console.log(`[AIExtractor] Attempting Gemini 2.5 Flash visual fallback...`);
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const geminiRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                { text: PROMPT_TEMPLATES.auto },
                {
                  inlineData: {
                    mimeType: detectedMime,
                    data: base64Content,
                  },
                },
              ],
            },
          ],
        });
        rawText = geminiRes.text || '';
        modelUsed = 'gemini-2.5-flash (智能备用)';
      } catch (geminiErr: any) {
        console.error(`[AIExtractor] Gemini fallback failed:`, geminiErr?.message);
        throw new Error(
          `模型识别失败: 主模型错误 [${primaryError?.message || '无法连接'}]，备用模型亦无法连接 [${geminiErr?.message}]`
        );
      }
    } else {
      throw new Error(`主模型识别失败: ${primaryError?.message || '服务连接超时'}`);
    }
  }

  // 3. Parse JSON from output
  const parsed = parseAIResponse(rawText);

  return {
    headers: parsed.headers,
    rows: parsed.rows,
    summaryText: parsed.summaryText,
    rawResponse: rawText,
    modelUsed,
  };
}

function parseAIResponse(rawText: string): {
  headers: string[];
  rows: (Record<string, any> | any[])[];
  summaryText: string;
} {
  let cleaned = rawText.trim();

  // Strip markdown code fences ```json ... ``` or ``` ... ```
  if (cleaned.includes('```')) {
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonMatch && jsonMatch[1]) {
      cleaned = jsonMatch[1].trim();
    }
  }

  try {
    const obj = JSON.parse(cleaned);

    // Case 1: Standard { headers: [...], rows: [...] }
    if (obj && Array.isArray(obj.headers) && Array.isArray(obj.rows)) {
      return {
        headers: obj.headers.map(String),
        rows: obj.rows,
        summaryText: obj.summaryText || obj.summary || `提取成功，共 ${obj.rows.length} 行数据`,
      };
    }

    // Case 2: Direct array of objects [ { a: 1, b: 2 }, ... ]
    if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'object') {
      const headers = Object.keys(obj[0]);
      return {
        headers,
        rows: obj,
        summaryText: `提取成功，共 ${obj.length} 行记录`,
      };
    }

    // Case 3: Object with data or items array
    if (obj && typeof obj === 'object') {
      const possibleList = obj.data || obj.items || obj.list || obj.records;
      if (Array.isArray(possibleList) && possibleList.length > 0) {
        const headers = Object.keys(possibleList[0]);
        return {
          headers,
          rows: possibleList,
          summaryText: obj.summaryText || obj.summary || `提取成功，共 ${possibleList.length} 条记录`,
        };
      }
    }
  } catch (parseErr) {
    console.warn('[AIExtractor] Direct JSON parse failed, attempting regex/table recovery:', parseErr);
  }

  // Fallback 1: try finding any JSON object or array within text
  try {
    const objectMatch = cleaned.match(/\{[\s\S]*"headers"[\s\S]*"rows"[\s\S]*\}/);
    if (objectMatch) {
      const recoveredObj = JSON.parse(objectMatch[0]);
      if (Array.isArray(recoveredObj.headers) && Array.isArray(recoveredObj.rows)) {
        return {
          headers: recoveredObj.headers.map(String),
          rows: recoveredObj.rows,
          summaryText: recoveredObj.summaryText || `提取成功，共 ${recoveredObj.rows.length} 行数据`,
        };
      }
    }

    const arrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      const recoveredArray = JSON.parse(arrayMatch[0]);
      if (Array.isArray(recoveredArray) && recoveredArray.length > 0) {
        return {
          headers: Object.keys(recoveredArray[0]),
          rows: recoveredArray,
          summaryText: `通过正则恢复解析成功，共 ${recoveredArray.length} 条记录`,
        };
      }
    }
  } catch {}

  // Fallback 2: Check for Markdown Table syntax (| col1 | col2 | ... \n |---|---| \n | val1 | val2 |)
  const markdownTableResult = parseMarkdownTable(rawText);
  if (markdownTableResult) {
    return markdownTableResult;
  }

  // Last-resort fallback: split lines into single-column text items
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !isRefusalResponse(l));

  if (lines.length === 0) {
    lines.push('未能直接从模型响应中提取出标准表格，请检查原图清晰度或重试');
  }

  return {
    headers: ['序号', '识别文本内容'],
    rows: lines.slice(0, 100).map((line, idx) => ({
      序号: idx + 1,
      识别文本内容: line,
    })),
    summaryText: '未检测到标准 JSON 结构，已将内容按行转为文本表格',
  };
}

function parseMarkdownTable(text: string): {
  headers: string[];
  rows: Record<string, string>[];
  summaryText: string;
} | null {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && l.endsWith('|'));

  if (lines.length < 2) return null;

  // Header line
  const headerLine = lines[0];
  const headers = headerLine
    .slice(1, -1)
    .split('|')
    .map((h) => h.trim())
    .filter((h) => h.length > 0);

  if (headers.length === 0) return null;

  // Skip divider line (|---|---|)
  let startIdx = 1;
  if (lines[1].includes('---') || lines[1].includes('-|-')) {
    startIdx = 2;
  }

  const rows: Record<string, string>[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const cells = lines[i]
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim());

    const rowObj: Record<string, string> = {};
    headers.forEach((h, colIdx) => {
      rowObj[h] = cells[colIdx] ?? '';
    });
    rows.push(rowObj);
  }

  if (rows.length === 0) return null;

  return {
    headers,
    rows,
    summaryText: `成功从 Markdown 表格中解析 ${rows.length} 行数据`,
  };
}
