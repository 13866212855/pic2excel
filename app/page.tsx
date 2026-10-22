'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Play,
  RotateCw,
  Trash2,
  ClipboardPaste,
  Sparkles,
  Download,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
  Zap,
} from 'lucide-react';
import ImageCard, { ImageQueueItem } from '@/components/ImageCard';
import PromptSelector, { PROMPT_PRESETS } from '@/components/PromptSelector';
import DataEditorModal, { EditableTableData } from '@/components/DataEditorModal';
import ImagePreviewModal from '@/components/ImagePreviewModal';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export default function HomePage() {
  const [items, setItems] = useState<ImageQueueItem[]>([]);
  const [selectedPromptType, setSelectedPromptType] = useState<string>('auto');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Editor Modal
  const [editorItem, setEditorItem] = useState<{
    item: ImageQueueItem;
    index: number;
  } | null>(null);

  // Preview Image Modal
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-hide toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
  };

  // Helper: File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Add files to queue
  const addFilesToQueue = useCallback(
    async (files: File[], source: 'upload' | 'drop' | 'paste') => {
      const validFiles: { file: File; base64: string }[] = [];
      const errors: string[] = [];

      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
          errors.push(`文件 "${file.name}" 格式不支持，仅限 JPG / PNG / WEBP`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`文件 "${file.name}" 超过 10MB 限制`);
          continue;
        }

        try {
          const base64 = await fileToBase64(file);
          validFiles.push({ file, base64 });
        } catch {
          errors.push(`文件 "${file.name}" 读取失败`);
        }
      }

      if (errors.length > 0) {
        showToast(errors[0], 'error');
      }

      if (validFiles.length > 0) {
        setItems((prev) => {
          const newItems: ImageQueueItem[] = validFiles.map((vf, i) => {
            const nextIdx = prev.length + i + 1;
            return {
              id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${i}`,
              file: vf.file,
              name: vf.file.name,
              size: vf.file.size,
              type: vf.file.type,
              base64: vf.base64,
              sheetName: `Sheet${nextIdx}`,
              status: 'pending',
              extractedData: null,
            };
          });
          return [...prev, ...newItems];
        });

        const sourceLabel =
          source === 'paste'
            ? '剪贴板粘贴'
            : source === 'drop'
            ? '拖拽上传'
            : '本地选择';
        showToast(
          `已通过【${sourceLabel}】成功添加 ${validFiles.length} 张图片到队列！`,
          'success'
        );
      }
    },
    []
  );

  // Global Clipboard Paste Listener (Ctrl+V anywhere on page)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // If user is currently editing in an input or textarea, let default text paste work
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') &&
        !(activeEl as HTMLElement).dataset.allowImagePaste
      ) {
        return;
      }

      const clipboardData = e.clipboardData;
      if (!clipboardData || !clipboardData.items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < clipboardData.items.length; i++) {
        const item = clipboardData.items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            // Rename pasted image with friendly name
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(11, 19);
            const renamed = new File([file], `剪贴板截图_${timestamp}.png`, {
              type: file.type || 'image/png',
            });
            imageFiles.push(renamed);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        addFilesToQueue(imageFiles, 'paste');
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [addFilesToQueue]);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      addFilesToQueue(filesArray, 'drop');
    }
  };

  // Reordering
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setItems((prev) => {
      const next = [...prev];
      const temp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number) => {
    setItems((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[index + 1];
      next[index + 1] = next[index];
      next[index] = temp;
      return next;
    });
  };

  const handleDelete = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    showToast('已从队列中移除图片', 'info');
  };

  const handleChangeSheetName = (index: number, newName: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], sheetName: newName };
      return next;
    });
  };

  // Single item recognition
  const handleRecognizeSingle = async (index: number) => {
    const item = items[index];
    if (!item) return;

    // Update status to processing
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], status: 'processing', errorMessage: undefined };
      return next;
    });

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: [
            {
              id: item.id,
              name: item.name,
              size: item.size,
              type: item.type,
              base64: item.base64,
              sheetName: item.sheetName,
              promptType: selectedPromptType,
              customPrompt,
            },
          ],
          promptType: selectedPromptType,
          customPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '识别失败');
      }

      const processedItem = data.items?.[0];
      setItems((prev) => {
        const next = [...prev];
        if (processedItem && processedItem.status === 'success') {
          next[index] = {
            ...next[index],
            status: 'success',
            extractedData: processedItem.extractedData,
            modelUsed: processedItem.modelUsed,
          };
        } else {
          next[index] = {
            ...next[index],
            status: 'failed',
            errorMessage: processedItem?.errorMessage || '识别失败',
          };
        }
        return next;
      });

      if (processedItem?.status === 'success') {
        showToast(`【${item.name}】识别完成！`, 'success');
      } else {
        showToast(`【${item.name}】识别失败: ${processedItem?.errorMessage || ''}`, 'error');
      }
    } catch (err: any) {
      setItems((prev) => {
        const next = [...prev];
        next[index] = {
          ...next[index],
          status: 'failed',
          errorMessage: err.message || '网络请求错误',
        };
        return next;
      });
      showToast(`识别异常: ${err.message}`, 'error');
    }
  };

  // Batch recognition
  const handleRecognizeAll = async (onlyFailedOrPending = false) => {
    const targets = items.filter((item) =>
      onlyFailedOrPending
        ? item.status === 'pending' || item.status === 'failed'
        : true
    );

    if (targets.length === 0) {
      showToast('当前没有待识别或失败的图片', 'info');
      return;
    }

    setIsProcessingBatch(true);
    showToast(`正在批量调用 AI 大模型识别 ${targets.length} 张图片，请稍候...`, 'info');

    // Mark as processing
    setItems((prev) =>
      prev.map((item) => {
        const isTarget = targets.some((t) => t.id === item.id);
        if (isTarget) {
          return { ...item, status: 'processing', errorMessage: undefined };
        }
        return item;
      })
    );

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: targets.map((t) => ({
            id: t.id,
            name: t.name,
            size: t.size,
            type: t.type,
            base64: t.base64,
            sheetName: t.sheetName,
            promptType: selectedPromptType,
            customPrompt,
          })),
          promptType: selectedPromptType,
          customPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '批量识别请求失败');
      }

      const resultsMap = new Map<string, any>();
      (data.items || []).forEach((it: any) => {
        resultsMap.set(it.id, it);
      });

      setItems((prev) =>
        prev.map((item) => {
          const result = resultsMap.get(item.id);
          if (result) {
            return {
              ...item,
              status: result.status,
              errorMessage: result.errorMessage,
              extractedData: result.extractedData,
              modelUsed: result.modelUsed,
            };
          }
          return item;
        })
      );

      const successCount = (data.items || []).filter((i: any) => i.status === 'success').length;
      showToast(
        `批量识别完成！成功 ${successCount} 张，失败 ${targets.length - successCount} 张`,
        successCount === targets.length ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast(`批量识别发生错误: ${err.message}`, 'error');
      setItems((prev) =>
        prev.map((item) =>
          item.status === 'processing'
            ? { ...item, status: 'failed', errorMessage: err.message }
            : item
        )
      );
    } finally {
      setIsProcessingBatch(false);
    }
  };

  // Export Excel
  const handleExportExcel = async () => {
    const successItems = items.filter((i) => i.status === 'success' && i.extractedData);
    if (successItems.length === 0) {
      showToast('暂无可导出的识别数据，请先点击"识别"解析图片', 'error');
      return;
    }

    showToast('正在生成多 Sheet 结构的 Excel 文件...', 'info');

    try {
      const sheets = successItems.map((item, idx) => ({
        sheetName: item.sheetName || `Sheet${idx + 1}`,
        headers: item.extractedData?.headers || ['内容'],
        rows: item.extractedData?.rows || [],
      }));

      const dateStr = new Date().toISOString().slice(0, 10);
      const res = await fetch('/api/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheets,
          fileName: `智能数据提取导出_${dateStr}.xlsx`,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || '导出服务响应异常');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `智能数据提取导出_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(`Excel 导出成功！已包含 ${sheets.length} 个工作表 (Sheets)`, 'success');
    } catch (err: any) {
      showToast(`导出失败: ${err.message}`, 'error');
    }
  };

  // Quick single sheet export
  const handleExportSingleSheet = async (sheetName: string, data: EditableTableData) => {
    try {
      const res = await fetch('/api/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheets: [
            {
              sheetName,
              headers: data.headers,
              rows: data.rows,
            },
          ],
          fileName: `${sheetName}.xlsx`,
        }),
      });

      if (!res.ok) throw new Error('导出失败');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sheetName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(`单表【${sheetName}】已导出下载`, 'success');
    } catch (err: any) {
      showToast(`单表导出失败: ${err.message}`, 'error');
    }
  };

  // Statistics
  const totalCount = items.length;
  const successCount = items.filter((i) => i.status === 'success').length;
  const processingCount = items.filter((i) => i.status === 'processing').length;
  const failedCount = items.filter((i) => i.status === 'failed').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50/80 to-slate-100/60 text-slate-900 flex flex-col font-sans">
      {/* Toast Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm flex items-center gap-2.5 transition-all animate-bounceIn ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : toastMessage.type === 'error'
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-indigo-50 text-indigo-800 border-indigo-200'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0" />
          )}
          <span className="font-medium">{toastMessage.text}</span>
        </div>
      )}

      {/* Top Header (Zero Admin links as strictly constrained) */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                智能图片数据提取与 Excel 导出系统
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium border border-indigo-200/50">
                  多 Sheet 聚合
                </span>
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                支持微信聊天记录、表格、单据截图，一键识别并分别写入独立 Sheet 导出
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600">
            <div className="hidden md:flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200/60">
              <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
              <span>支持页面任意位置直接按 <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-800 font-semibold shadow-xs">Ctrl + V</kbd> 粘贴</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Upload Hero Section */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative rounded-3xl border-2 border-dashed p-8 transition-all flex flex-col items-center justify-center text-center cursor-pointer group ${
            isDragging
              ? 'border-indigo-600 bg-indigo-50/80 scale-[1.005] shadow-xl'
              : 'border-slate-300 hover:border-indigo-400 bg-white/90 hover:bg-slate-50/60 shadow-sm'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                addFilesToQueue(Array.from(e.target.files), 'upload');
                e.target.value = '';
              }
            }}
          />

          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h2 className="text-lg font-semibold text-slate-800 mb-1">
            点击选择本地图片，或将图片文件拖放至此
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mb-4 leading-relaxed">
            支持同时选择或拖拽多张图片（微信聊天截图、报表截屏、单据凭证等）<br className="hidden sm:inline" />
            支持在页面任何位置按下 <span className="font-semibold text-indigo-600">Ctrl + V</span> 自动读取剪贴板图片并加入队列
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
            <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              单文件 ≤ 10MB
            </span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              格式：JPG / PNG / WEBP
            </span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              多图将自动分别写入 Sheet1、Sheet2...
            </span>
          </div>
        </div>

        {/* Prompt Presets & Custom Configuration */}
        <PromptSelector
          selectedType={selectedPromptType}
          onSelectType={setSelectedPromptType}
          customPrompt={customPrompt}
          onChangeCustomPrompt={setCustomPrompt}
        />

        {/* Queue & Action Header */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">图片处理队列与预览</h3>
                <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-medium">
                  共 {totalCount} 张
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                支持上下调整顺序以改变 Excel Sheet 排序，可针对单张或全部批量发起 AI 提取
              </p>
            </div>

            {/* Batch Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={totalCount === 0 || isProcessingBatch}
                onClick={() => handleRecognizeAll(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40 disabled:hover:bg-indigo-600"
              >
                <Play className="w-3.5 h-3.5" />
                全部识别
              </button>

              {failedCount > 0 && (
                <button
                  type="button"
                  disabled={isProcessingBatch}
                  onClick={() => handleRecognizeAll(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/60 text-xs font-medium transition-all"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-600" />
                  重试失败项 ({failedCount})
                </button>
              )}

              <button
                type="button"
                disabled={successCount === 0}
                onClick={handleExportExcel}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-40 disabled:hover:bg-emerald-600"
              >
                <Download className="w-3.5 h-3.5" />
                导出 Excel ({successCount} 张 Sheet)
              </button>

              {totalCount > 0 && (
                <button
                  type="button"
                  disabled={isProcessingBatch}
                  onClick={() => {
                    if (confirm('确认清空待处理图片队列吗？')) {
                      setItems([]);
                      showToast('已清空队列', 'info');
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  title="全部清除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Status Bar */}
          {totalCount > 0 && (
            <div className="pt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>已就绪: {successCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>等待中: {pendingCount}</span>
              </div>
              {processingCount > 0 && (
                <div className="flex items-center gap-1.5 text-indigo-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                  <span>处理中: {processingCount}</span>
                </div>
              )}
              {failedCount > 0 && (
                <div className="flex items-center gap-1.5 text-red-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>失败: {failedCount}</span>
                </div>
              )}
            </div>
          )}

          {/* Queue Cards Grid */}
          {totalCount === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                <FileCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-600 mb-1">图片队列为空</p>
              <p className="text-xs text-slate-400 max-w-sm">
                可以通过上方上传区上传，或直接在任何软件截图后按 Ctrl+V 粘贴到此处
              </p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item, index) => (
                <ImageCard
                  key={item.id}
                  item={item}
                  index={index}
                  total={totalCount}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  onDelete={() => handleDelete(index)}
                  onPreviewImage={() =>
                    setPreviewImage({ url: item.base64, title: item.name })
                  }
                  onEditData={() => setEditorItem({ item, index })}
                  onRecognizeSingle={() => handleRecognizeSingle(index)}
                  onChangeSheetName={(newName) => handleChangeSheetName(index, newName)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Feature Highlights Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">三重便捷输入体验</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                无论是微信截图直接 Ctrl+V 粘贴、窗口拖拽，还是批量点击上传，全无缝衔接。
              </p>
            </div>
          </div>

          <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">独立 Sheet 多表合一</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                无需分别导出多个 Excel，系统将多张图片的识别表格严格按顺序依次写入同一个 .xlsx 文件的多个 Sheet 中。
              </p>
            </div>
          </div>

          <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">智能纠错与预览</h4>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                导出前可在线编辑任意单元格、重命名 Sheet 标签、增减行列，确保最终导出的财务及聊天数据 100% 准确。
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer (Zero Admin Link) */}
      <footer className="border-t border-slate-200/80 bg-white/60 py-6 mt-12 text-center text-xs text-slate-400">
        <p>© 2026 智能图片数据提取与 Excel 导出系统 · 基于视觉大模型构建</p>
      </footer>

      {/* Editor Modal for error correction */}
      {editorItem && editorItem.item.extractedData && (
        <DataEditorModal
          isOpen={true}
          sheetName={editorItem.item.sheetName}
          initialData={editorItem.item.extractedData}
          onClose={() => setEditorItem(null)}
          onSave={(updatedSheetName, updatedData) => {
            const idx = editorItem.index;
            setItems((prev) => {
              const next = [...prev];
              next[idx] = {
                ...next[idx],
                sheetName: updatedSheetName,
                extractedData: updatedData,
              };
              return next;
            });
            showToast(`已保存【${updatedSheetName}】的数据修改！`, 'success');
          }}
          onExportSingle={(sheetName, data) => handleExportSingleSheet(sheetName, data)}
        />
      )}

      {/* High-Res Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={true}
          imageUrl={previewImage.url}
          title={previewImage.title}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
