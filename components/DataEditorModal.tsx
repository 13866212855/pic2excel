'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Code,
  Table as TableIcon,
  Check,
  Download,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export interface EditableTableData {
  headers: string[];
  rows: (Record<string, any> | any[])[];
  summaryText?: string;
}

interface DataEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheetName: string;
  initialData: EditableTableData;
  onSave: (updatedSheetName: string, updatedData: EditableTableData) => void;
  onExportSingle?: (sheetName: string, data: EditableTableData) => void;
}

function EditorModalInner({
  sheetName,
  initialData,
  onClose,
  onSave,
  onExportSingle,
}: {
  sheetName: string;
  initialData: EditableTableData;
  onClose: () => void;
  onSave: (updatedSheetName: string, updatedData: EditableTableData) => void;
  onExportSingle?: (sheetName: string, data: EditableTableData) => void;
}) {
  const [currentSheetName, setCurrentSheetName] = useState(sheetName);
  const [headers, setHeaders] = useState<string[]>(initialData?.headers || []);
  const [rows, setRows] = useState<any[]>(() => {
    if (!initialData?.rows) return [];
    return JSON.parse(JSON.stringify(initialData.rows));
  });
  const [summary, setSummary] = useState(initialData?.summaryText || '');
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [newColName, setNewColName] = useState('');
  const [showAddCol, setShowAddCol] = useState(false);

  // Toggle JSON mode
  const handleToggleMode = (toJson: boolean) => {
    if (toJson) {
      setJsonText(JSON.stringify({ headers, rows, summaryText: summary }, null, 2));
      setJsonError(null);
      setIsJsonMode(true);
    } else {
      try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) {
          setHeaders(parsed.headers);
          setRows(parsed.rows);
          if (parsed.summaryText) setSummary(parsed.summaryText);
          setJsonError(null);
          setIsJsonMode(false);
        } else if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === 'object') {
            setHeaders(Object.keys(parsed[0]));
            setRows(parsed);
            setJsonError(null);
            setIsJsonMode(false);
          } else {
            setJsonError('JSON 必须为包含 headers 和 rows 的对象，或对象数组');
          }
        } else {
          setJsonError('JSON 格式不符合表格规范 (需要 headers 和 rows 数组)');
        }
      } catch (e: any) {
        setJsonError('JSON 解析错误: ' + e.message);
      }
    }
  };

  // Cell change
  const handleCellChange = (rowIndex: number, headerKey: string, val: string) => {
    const updated = [...rows];
    if (Array.isArray(updated[rowIndex])) {
      const colIdx = headers.indexOf(headerKey);
      if (colIdx >= 0) {
        updated[rowIndex][colIdx] = val;
      }
    } else {
      updated[rowIndex] = {
        ...updated[rowIndex],
        [headerKey]: val,
      };
    }
    setRows(updated);
  };

  // Header change
  const handleHeaderRename = (idx: number, newName: string) => {
    const oldName = headers[idx];
    const newHeaders = [...headers];
    newHeaders[idx] = newName;
    setHeaders(newHeaders);

    // update rows
    const updatedRows = rows.map((r) => {
      if (!Array.isArray(r) && typeof r === 'object') {
        const rowCopy = { ...r };
        rowCopy[newName] = rowCopy[oldName];
        delete rowCopy[oldName];
        return rowCopy;
      }
      return r;
    });
    setRows(updatedRows);
  };

  // Add column
  const handleAddColumn = () => {
    if (!newColName.trim()) return;
    const name = newColName.trim();
    if (headers.includes(name)) {
      alert('已存在同名列！');
      return;
    }
    setHeaders([...headers, name]);
    const updatedRows = rows.map((r) => {
      if (Array.isArray(r)) return [...r, ''];
      return { ...r, [name]: '' };
    });
    setRows(updatedRows);
    setNewColName('');
    setShowAddCol(false);
  };

  // Delete column
  const handleDeleteColumn = (colIdx: number) => {
    if (headers.length <= 1) {
      alert('至少需要保留一列！');
      return;
    }
    const colName = headers[colIdx];
    const newHeaders = headers.filter((_, i) => i !== colIdx);
    setHeaders(newHeaders);
    const updatedRows = rows.map((r) => {
      if (Array.isArray(r)) {
        return r.filter((_, i) => i !== colIdx);
      }
      const copy = { ...r };
      delete copy[colName];
      return copy;
    });
    setRows(updatedRows);
  };

  // Add row
  const handleAddRow = () => {
    const newRow: Record<string, string> = {};
    headers.forEach((h) => {
      newRow[h] = '';
    });
    setRows([...rows, newRow]);
  };

  // Delete row
  const handleDeleteRow = (idx: number) => {
    setRows(rows.filter((_, i) => i !== idx));
  };

  // Save handler
  const handleSaveAndClose = () => {
    if (isJsonMode) {
      try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed.headers) && Array.isArray(parsed.rows)) {
          onSave(currentSheetName, {
            headers: parsed.headers,
            rows: parsed.rows,
            summaryText: parsed.summaryText || summary,
          });
          onClose();
          return;
        }
      } catch {
        setJsonError('请先修复 JSON 语法错误后再保存');
        return;
      }
    }

    onSave(currentSheetName, {
      headers,
      rows,
      summaryText: summary,
    });
    onClose();
  };

  return (
    <div className="relative w-full max-w-6xl max-h-[92vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
      {/* Modal Top Bar */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Sheet 名称：</span>
              <input
                type="text"
                value={currentSheetName}
                onChange={(e) => setCurrentSheetName(e.target.value)}
                className="font-semibold text-slate-800 text-sm px-2.5 py-1 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder="如 Sheet1 或 微信聊天记录"
              />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              支持自由纠错编辑、调整单元格、增减行列，导出时将直接采用此处修改后的内容
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode switch */}
          <div className="bg-slate-200/80 p-0.5 rounded-lg flex items-center text-xs font-medium">
            <button
              type="button"
              onClick={() => handleToggleMode(false)}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                !isJsonMode
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              表格视图
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode(true)}
              className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                isJsonMode
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              JSON 源码
            </button>
          </div>

          <div className="w-[1px] h-6 bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toolbar in Table View */}
      {!isJsonMode && (
        <div className="px-6 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              添加数据行
            </button>
            <button
              type="button"
              onClick={() => setShowAddCol(!showAddCol)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              添加列 (表头)
            </button>

            {showAddCol && (
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-lg">
                <input
                  type="text"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  placeholder="输入新列名..."
                  className="px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn();
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddColumn}
                  className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-medium"
                >
                  确认
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCol(false)}
                  className="px-1.5 py-1 text-slate-500 hover:text-slate-800"
                >
                  取消
                </button>
              </div>
            )}
          </div>

          <div className="text-slate-500">
            共 <span className="font-semibold text-slate-700">{rows.length}</span> 行数据，
            <span className="font-semibold text-slate-700">{headers.length}</span> 列字段
          </div>
        </div>
      )}

      {/* Modal Main Content */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
        {isJsonMode ? (
          <div className="h-full flex flex-col">
            {jsonError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}
            <textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setJsonError(null);
              }}
              className="w-full flex-1 min-h-[400px] p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-none leading-relaxed"
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-slate-100/90 sticky top-0 z-10 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-12 text-center text-slate-400 font-medium">
                      #
                    </th>
                    {headers.map((header, colIdx) => (
                      <th key={colIdx} className="py-2 px-3 min-w-[140px] text-slate-700">
                        <div className="flex items-center justify-between gap-1 group">
                          <input
                            type="text"
                            value={header}
                            onChange={(e) => handleHeaderRename(colIdx, e.target.value)}
                            className="w-full font-semibold bg-transparent hover:bg-white focus:bg-white px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteColumn(colIdx)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 text-slate-400 rounded transition-all"
                            title="删除此列"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 w-12 text-center text-slate-400 font-medium">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={headers.length + 2}
                        className="py-12 text-center text-slate-400"
                      >
                        暂无表格数据，点击上方“添加数据行”开始录入
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, rIdx) => {
                      return (
                        <tr key={rIdx} className="hover:bg-indigo-50/20 group transition-colors">
                          <td className="py-2 px-3 text-center text-slate-400 font-mono select-none">
                            {rIdx + 1}
                          </td>
                          {headers.map((header, colIdx) => {
                            const cellValue = Array.isArray(row)
                              ? row[colIdx] ?? ''
                              : row[header] ?? '';
                            return (
                              <td key={colIdx} className="p-1">
                                <textarea
                                  value={
                                    typeof cellValue === 'object'
                                      ? JSON.stringify(cellValue)
                                      : cellValue
                                  }
                                  onChange={(e) =>
                                    handleCellChange(rIdx, header, e.target.value)
                                  }
                                  rows={1}
                                  className="w-full text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white rounded px-2 py-1.5 border border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none resize-none leading-relaxed"
                                />
                              </td>
                            );
                          })}
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(rIdx)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="删除该行"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Box */}
        <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            识别总结 / 摘要说明：
          </label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="如：提取成功，共15条聊天记录..."
            className="w-full text-xs text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Modal Footer */}
      <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <div>
          {onExportSingle && (
            <button
              type="button"
              onClick={() =>
                onExportSingle(currentSheetName, { headers, rows, summaryText: summary })
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              仅导出本张 Sheet
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            保存更改
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DataEditorModal({
  isOpen,
  onClose,
  sheetName,
  initialData,
  onSave,
  onExportSingle,
}: DataEditorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <EditorModalInner
        key={`${sheetName}_${initialData?.headers?.join(',')}`}
        sheetName={sheetName}
        initialData={initialData}
        onClose={onClose}
        onSave={onSave}
        onExportSingle={onExportSingle}
      />
    </div>
  );
}
