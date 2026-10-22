'use client';

import React from 'react';
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Eye,
  Edit3,
  Play,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';

export interface ImageQueueItem {
  id: string;
  file?: File;
  name: string;
  size: number;
  type: string;
  base64: string;
  sheetName: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  errorMessage?: string;
  extractedData?: {
    headers: string[];
    rows: any[];
    summaryText?: string;
  } | null;
  modelUsed?: string;
}

interface ImageCardProps {
  item: ImageQueueItem;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onPreviewImage: () => void;
  onEditData: () => void;
  onRecognizeSingle: () => void;
  onChangeSheetName: (newName: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function ImageCard({
  item,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDelete,
  onPreviewImage,
  onEditData,
  onRecognizeSingle,
  onChangeSheetName,
}: ImageCardProps) {
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [sheetNameInput, setSheetNameInput] = React.useState('');

  const handleStartEdit = () => {
    setSheetNameInput(item.sheetName);
    setIsEditingName(true);
  };

  const handleFinishSheetName = () => {
    setIsEditingName(false);
    if (sheetNameInput.trim()) {
      onChangeSheetName(sheetNameInput.trim());
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm hover:shadow transition-all overflow-hidden flex flex-col justify-between group">
      {/* Top Media & Sheet Badge */}
      <div className="relative aspect-[4/3] bg-slate-950/5 overflow-hidden flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.base64}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Quick Preview Overlay Button */}
        <button
          type="button"
          onClick={onPreviewImage}
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity backdrop-blur-[2px]"
          title="点击查看原图"
        >
          <div className="bg-black/60 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border border-white/20">
            <Eye className="w-3.5 h-3.5" />
            查看原图
          </div>
        </button>

        {/* Order badge & Sheet Tag */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
          <span className="w-6 h-6 rounded-lg bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold flex items-center justify-center shadow">
            {index + 1}
          </span>
          <span className="bg-white/90 backdrop-blur-md text-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-sm border border-slate-200/60 flex items-center gap-1">
            <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
            {item.sheetName}
          </span>
        </div>

        {/* Status Indicator */}
        <div className="absolute top-2 right-2 z-10">
          {item.status === 'pending' && (
            <span className="bg-amber-100/90 text-amber-800 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-amber-200/50 backdrop-blur-md">
              <Clock className="w-3 h-3 text-amber-600" />
              等待识别
            </span>
          )}
          {item.status === 'processing' && (
            <span className="bg-indigo-100/90 text-indigo-800 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-indigo-200/50 backdrop-blur-md animate-pulse">
              <Loader2 className="w-3 h-3 text-indigo-600 animate-spin" />
              AI 识别中...
            </span>
          )}
          {item.status === 'success' && (
            <span className="bg-emerald-100/95 text-emerald-800 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-emerald-200/60 backdrop-blur-md">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              识别成功
            </span>
          )}
          {item.status === 'failed' && (
            <span
              className="bg-red-100/95 text-red-800 text-[11px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm border border-red-200/60 backdrop-blur-md"
              title={item.errorMessage}
            >
              <AlertCircle className="w-3 h-3 text-red-600" />
              识别失败
            </span>
          )}
        </div>
      </div>

      {/* Card Info Body */}
      <div className="p-3.5 flex flex-col gap-2 flex-1 justify-between">
        <div>
          {/* File Name & Size */}
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="truncate max-w-[140px] font-medium text-slate-700" title={item.name}>
              {item.name}
            </span>
            <span className="font-mono text-[11px]">{formatBytes(item.size)}</span>
          </div>

          {/* Sheet Name editable */}
          <div className="flex items-center gap-1 text-xs text-slate-600 mb-2">
            <span className="text-slate-400">Sheet:</span>
            {isEditingName ? (
              <input
                type="text"
                value={sheetNameInput}
                onChange={(e) => setSheetNameInput(e.target.value)}
                onBlur={handleFinishSheetName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleFinishSheetName();
                }}
                autoFocus
                className="w-28 px-1.5 py-0.5 text-xs bg-slate-100 border border-indigo-400 rounded focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={handleStartEdit}
                className="font-semibold text-slate-800 hover:text-indigo-600 flex items-center gap-1 text-xs"
                title="点击修改导出时的 Sheet 标签名"
              >
                <span>{item.sheetName}</span>
                <Edit3 className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100" />
              </button>
            )}
          </div>

          {/* Extracted results pill or error info */}
          {item.status === 'success' && item.extractedData && (
            <div className="bg-emerald-50/70 border border-emerald-100 rounded-lg p-2 text-[11px] text-emerald-900">
              <div className="font-medium flex items-center justify-between">
                <span>{item.extractedData.rows?.length || 0} 行数据</span>
                <span className="text-emerald-700 font-mono">
                  {item.extractedData.headers?.length || 0} 列
                </span>
              </div>
              {item.extractedData.summaryText && (
                <p className="text-[10px] text-emerald-700/80 truncate mt-0.5">
                  {item.extractedData.summaryText}
                </p>
              )}
            </div>
          )}

          {item.status === 'failed' && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-2 text-[11px] text-red-700 leading-tight">
              <span className="line-clamp-2" title={item.errorMessage}>
                {item.errorMessage || '识别发生未知错误'}
              </span>
            </div>
          )}
        </div>

        {/* Card Actions Bottom */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
          {/* Order control */}
          <div className="flex items-center gap-0.5 text-slate-400">
            <button
              type="button"
              disabled={index === 0}
              onClick={onMoveUp}
              className="p-1 rounded hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="前移（调整 Excel Sheet 顺序）"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={index === total - 1}
              onClick={onMoveDown}
              className="p-1 rounded hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="后移（调整 Excel Sheet 顺序）"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Primary card button */}
          <div className="flex items-center gap-1">
            {item.status === 'success' ? (
              <button
                type="button"
                onClick={onEditData}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium transition-colors"
                title="数据预览与手动纠错"
              >
                <Edit3 className="w-3 h-3" />
                数据纠错
              </button>
            ) : item.status === 'failed' ? (
              <button
                type="button"
                onClick={onRecognizeSingle}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-xs font-medium transition-colors"
                title="重试单张识别"
              >
                <RotateCw className="w-3 h-3" />
                重试
              </button>
            ) : item.status === 'pending' ? (
              <button
                type="button"
                onClick={onRecognizeSingle}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium transition-colors"
                title="立即单张识别"
              >
                <Play className="w-3 h-3" />
                识别
              </button>
            ) : null}

            {/* Delete button */}
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1"
              title="移除该图片"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
