'use client';

import React from 'react';
import { Sparkles, Table, MessageSquare, Receipt, Sliders } from 'lucide-react';

export interface PromptOption {
  id: string;
  label: string;
  description: string;
  icon: any;
  defaultHeaders: string[];
}

export const PROMPT_PRESETS: PromptOption[] = [
  {
    id: 'auto',
    label: '智能通用识别 (推荐)',
    description: '智能自适应图片内容，自动识别统计表格、报表、单据或聊天记录，精确还原全部行列数值',
    icon: Sparkles,
    defaultHeaders: ['列1', '列2', '列3', '列4'],
  },
  {
    id: 'table',
    label: '通用数据表格与报表',
    description: '精准识别教基报表、统计单据、多行多列表格，完整还原表头、代码编号与全部数字',
    icon: Table,
    defaultHeaders: ['指标名称', '代码', '数值'],
  },
  {
    id: 'wechat',
    label: '微信/社交聊天记录',
    description: '自动提取发言时间、发送人、消息类型（文本/语音/红包/图片）与消息正文',
    icon: MessageSquare,
    defaultHeaders: ['序号', '发送时间', '发言人', '消息类型', '消息内容', '备注/金额'],
  },
  {
    id: 'invoice',
    label: '发票与单据凭证',
    description: '提取发票代码、开票日期、购买方、销售方明细商品项及税费金额',
    icon: Receipt,
    defaultHeaders: ['序号', '货物或劳务名称', '规格型号', '数量', '单价', '金额', '税率', '税额'],
  },
  {
    id: 'custom',
    label: '自定义 Prompt 规则',
    description: '由您自定义指定需要提取的结构化字段与解析业务要求',
    icon: Sliders,
    defaultHeaders: ['字段1', '字段2', '字段3'],
  },
];

interface PromptSelectorProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  customPrompt: string;
  onChangeCustomPrompt: (val: string) => void;
}

export default function PromptSelector({
  selectedType,
  onSelectType,
  customPrompt,
  onChangeCustomPrompt,
}: PromptSelectorProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            选择提取规则模板
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            默认开启「智能通用识别」，自动精准还原教基统计表、报表截屏、单据或聊天记录的工整数值
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {PROMPT_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isSelected = selectedType === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectType(preset.id)}
              className={`text-left p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-600 bg-indigo-50/60 shadow-sm ring-1 ring-indigo-500/20'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <span className="text-[11px] font-medium text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      当前选中
                    </span>
                  )}
                </div>
                <div className="font-medium text-sm text-slate-900 mb-1">{preset.label}</div>
                <div className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {preset.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedType === 'custom' && (
        <div className="mt-4 pt-4 border-t border-slate-100 animate-fadeIn">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            自定义 Prompt 提取指示（可指定提取字段、命名要求、过滤条件）：
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => onChangeCustomPrompt(e.target.value)}
            placeholder="例如：请提取截图中所有的统计指标名称、代码与各项学科数值，按原表格行列一一对齐..."
            rows={3}
            className="w-full text-xs text-slate-800 bg-slate-50 rounded-xl p-3 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none font-mono"
          />
        </div>
      )}
    </div>
  );
}
