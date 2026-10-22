'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Key,
  Server,
  Database,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  Trash2,
  FileSpreadsheet,
  Download,
  Calendar,
  Layers,
  Sparkles,
  Loader2,
  FileText,
  Activity,
  Check,
  X,
} from 'lucide-react';

interface ConfigData {
  baseUrl: string;
  apiKey: string;
  isMasked: boolean;
  textModel: string;
  imageModel: string;
  useGeminiBackup: boolean;
  hasGeminiApiKey: boolean;
  updatedAt: string;
}

interface RecordItemData {
  id: string;
  createdAt: string;
  imageCount: number;
  status: 'completed' | 'partial' | 'failed' | 'pending';
  summary: string;
  promptType: string;
  items: any[];
  exportCount: number;
}

export default function AdminPage() {
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<string>('admin');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active admin tab
  const [activeTab, setActiveTab] = useState<'config' | 'records' | 'password'>('config');

  // Config state
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [textModelInput, setTextModelInput] = useState('');
  const [imageModelInput, setImageModelInput] = useState('');
  const [useBackup, setUseBackup] = useState(true);
  const [isApiKeyRevealed, setIsApiKeyRevealed] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Test connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    details?: string;
  } | null>(null);
  const [detectedModels, setDetectedModels] = useState<string[]>([]);

  // Records state
  const [records, setRecords] = useState<RecordItemData[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Selected Record Detail Modal
  const [selectedRecord, setSelectedRecord] = useState<RecordItemData | null>(null);
  const [isRetryingRecord, setIsRetryingRecord] = useState(false);

  // Change password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ text, type });
  };

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Auth headers helper
  const getAuthHeaders = useCallback(() => {
    const t = token || (typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null);
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${t || ''}`,
    };
  }, [token]);

  // Check auth on mount
  useEffect(() => {
    let active = true;
    const checkToken = async () => {
      const savedToken = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      if (!savedToken) {
        if (active) setIsCheckingAuth(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${savedToken}`,
          },
        });
        const data = await res.json();
        if (active) {
          if (data.success && data.user) {
            setToken(savedToken);
            setAdminUser(data.user.username);
          } else {
            localStorage.removeItem('admin_token');
            setToken(null);
          }
        }
      } catch {
        if (active) {
          localStorage.removeItem('admin_token');
          setToken(null);
        }
      } finally {
        if (active) {
          setIsCheckingAuth(false);
        }
      }
    };

    checkToken();
    return () => {
      active = false;
    };
  }, []);

  // Fetch config
  const fetchConfig = useCallback(
    async (reveal = false) => {
      try {
        const res = await fetch(`/api/admin/config${reveal ? '?reveal=true' : ''}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.success && data.config) {
          setConfig(data.config);
          setBaseUrlInput(data.config.baseUrl);
          setApiKeyInput(data.config.apiKey);
          setTextModelInput(data.config.textModel);
          setImageModelInput(data.config.imageModel);
          setUseBackup(data.config.useGeminiBackup);
          setIsApiKeyRevealed(reveal);
        }
      } catch (err) {
        console.error('Failed to fetch config', err);
      }
    },
    [getAuthHeaders]
  );

  // Fetch records
  const fetchRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status: statusFilter,
        search: searchQuery,
      });

      const res = await fetch(`/api/admin/records?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setRecords(data.records || []);
        setRecordsTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch records', err);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [getAuthHeaders, page, pageSize, statusFilter, searchQuery]);

  // Load active tab data
  useEffect(() => {
    if (!token) return;
    let active = true;
    const loadTabData = async () => {
      if (!active) return;
      if (activeTab === 'config') {
        await fetchConfig(false);
      } else if (activeTab === 'records') {
        await fetchRecords();
      }
    };
    loadTabData();
    return () => {
      active = false;
    };
  }, [token, activeTab, fetchConfig, fetchRecords]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      setLoginError('请输入账号和密码');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '登录失败');
      }

      localStorage.setItem('admin_token', data.token);
      setToken(data.token);
      setAdminUser(data.user?.username || 'admin');
      showToast('管理员认证成功，欢迎进入管理系统！', 'success');
    } catch (err: any) {
      setLoginError(err.message || '用户名或密码错误');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
    showToast('已安全退出后台管理系统', 'info');
  };

  // Handle Save Config
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const payload: any = {
        baseUrl: baseUrlInput.trim(),
        textModel: textModelInput.trim(),
        imageModel: imageModelInput.trim(),
        useGeminiBackup: useBackup,
      };

      // Only send apiKey if user edited it and it doesn't contain mask
      if (apiKeyInput && !apiKeyInput.includes('****')) {
        payload.apiKey = apiKeyInput.trim();
      }

      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '保存失败');
      }

      setConfig(data.config);
      setApiKeyInput(data.config.apiKey);
      setIsApiKeyRevealed(false);
      showToast('大模型参数已成功保存并持久化至系统数据库！', 'success');
    } catch (err: any) {
      showToast(`保存失败: ${err.message}`, 'error');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Handle Test Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/test-connection', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          baseUrl: baseUrlInput,
          apiKey: apiKeyInput,
          textModel: textModelInput,
        }),
      });

      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message,
        latencyMs: data.latencyMs,
        details: data.details,
      });

      if (Array.isArray(data.availableModels) && data.availableModels.length > 0) {
        setDetectedModels(data.availableModels);
      }

      if (data.success) {
        showToast(`测试连接成功！响应延迟: ${data.latencyMs}ms`, 'success');
        if (data.suggestedModel && data.suggestedModel !== textModelInput) {
          setTextModelInput(data.suggestedModel);
          if (imageModelInput.toLowerCase().includes('image-2') || imageModelInput.startsWith('Agnes')) {
            setImageModelInput(data.suggestedModel);
          }
        }
      } else {
        showToast(`测试连接失败: ${data.message}`, 'error');
        if (data.suggestedModel) {
          setTextModelInput(data.suggestedModel);
        }
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: '网络调用失败',
        details: err.message,
      });
      showToast(`测试连接异常: ${err.message}`, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: 'error', text: '两次输入的新密码不一致' });
      return;
    }
    if (newPassword.length < 6) {
      setPwdMsg({ type: 'error', text: '新密码长度至少需要 6 个字符' });
      return;
    }

    setIsChangingPwd(true);
    setPwdMsg(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '修改密码失败');
      }

      setPwdMsg({ type: 'success', text: '密码修改成功，请牢记新密码！' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('密码修改成功！', 'success');
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.message || '原密码错误' });
    } finally {
      setIsChangingPwd(false);
    }
  };

  // Handle Delete Record
  const handleDeleteRecord = async (id: string) => {
    if (!confirm('确认删除该条提交记录及所有关联图片数据吗？')) return;

    try {
      const res = await fetch(`/api/admin/records/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || '删除失败');

      showToast('记录已成功删除', 'success');
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
      fetchRecords();
    } catch (err: any) {
      showToast(`删除失败: ${err.message}`, 'error');
    }
  };

  // Handle Retry Record
  const handleRetryRecord = async (id: string) => {
    setIsRetryingRecord(true);
    try {
      const res = await fetch(`/api/admin/records/${id}/retry`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || '重试失败');

      showToast(data.message || '重试完成', 'success');
      if (data.record) {
        setSelectedRecord(data.record);
      }
      fetchRecords();
    } catch (err: any) {
      showToast(`重试失败: ${err.message}`, 'error');
    } finally {
      setIsRetryingRecord(false);
    }
  };

  // Export Record Excel
  const handleExportRecordExcel = async (record: RecordItemData) => {
    const successItems = record.items.filter((i) => i.status === 'success' && i.extractedData);
    if (successItems.length === 0) {
      showToast('该记录中没有成功的提取结果可供导出', 'error');
      return;
    }

    try {
      const sheets = successItems.map((item, idx) => ({
        sheetName: item.sheetName || `Sheet${idx + 1}`,
        headers: item.extractedData?.headers || ['内容'],
        rows: item.extractedData?.rows || [],
      }));

      const res = await fetch('/api/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: record.id,
          sheets,
          fileName: `记录_${record.id}_数据导出.xlsx`,
        }),
      });

      if (!res.ok) throw new Error('导出失败');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `记录_${record.id}_数据导出.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast('Excel 文件已下载', 'success');
      fetchRecords();
    } catch (err: any) {
      showToast(`导出失败: ${err.message}`, 'error');
    }
  };

  // Loading state
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-sm font-medium">验证管理员安全凭证中...</span>
        </div>
      </div>
    );
  }

  // Login View
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl p-8 backdrop-blur-xl relative overflow-hidden">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-indigo-500/30">
              <Shield className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">系统管理控制台</h1>
            <p className="text-xs text-slate-400 mt-1">
              请输入管理员账号及密码进行身份安全鉴权
            </p>
          </div>

          {loginError && (
            <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                管理员账号
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                管理员密码
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="请输入登录密码"
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full mt-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>安全鉴权验证中...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>进入后台管理系统</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800/80 text-center text-[11px] text-slate-500">
            <span>安全提示：后台入口受严格 JWT 鉴权保护，会话具备时效性</span>
          </div>
        </div>
      </div>
    );
  }

  // Admin Authenticated Dashboard View
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl border text-xs sm:text-sm flex items-center gap-2.5 transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
              : toast.type === 'error'
              ? 'bg-red-950 text-red-200 border-red-800'
              : 'bg-indigo-950 text-indigo-200 border-indigo-800'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-indigo-400" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Admin Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-tight">
                  后台管理中心
                </span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">
                  v1.0.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                大模型多模态参数维护 · 用户提交记录与 Excel 审计
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/50 text-xs text-slate-300">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>当前管理员: <strong className="text-white font-mono">{adminUser}</strong></span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              退出
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('config')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'config'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Server className="w-4 h-4" />
            大模型参数配置
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('records')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'records'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            处理记录管理
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'password'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Key className="w-4 h-4" />
            管理员密码修改
          </button>
        </div>

        {/* Tab 1: Model Configuration */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-400" />
                    视觉与文本大模型调用配置
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    配置项永久保存于后端数据库中，前台所有图片识别将即时生效采用此参数
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isTesting}
                    onClick={handleTestConnection}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {isTesting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                    ) : (
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    测试接口连接
                  </button>
                  <button
                    type="button"
                    disabled={isSavingConfig}
                    onClick={handleSaveConfig}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/30 transition-colors disabled:opacity-50"
                  >
                    {isSavingConfig ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    保存并应用配置
                  </button>
                </div>
              </div>

              {/* Test Result Banner */}
              {testResult && (
                <div
                  className={`mb-6 p-4 rounded-xl border text-xs leading-relaxed ${
                    testResult.success
                      ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-200'
                      : 'bg-red-950/60 border-red-800/80 text-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold mb-1">
                    <span className="flex items-center gap-1.5">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      )}
                      {testResult.message}
                    </span>
                    {testResult.latencyMs !== undefined && (
                      <span className="font-mono bg-black/40 px-2 py-0.5 rounded">
                        延迟: {testResult.latencyMs} ms
                      </span>
                    )}
                  </div>
                  {testResult.details && (
                    <div className="font-mono text-[11px] text-slate-300 mt-1.5 p-2 bg-black/30 rounded">
                      {testResult.details}
                    </div>
                  )}
                </div>
              )}

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Base URL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    接口 Base URL (baseUrl)
                  </label>
                  <input
                    type="text"
                    value={baseUrlInput}
                    onChange={(e) => setBaseUrlInput(e.target.value)}
                    placeholder="https://apihub.agnes-ai.com/v1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    系统默认预设: https://apihub.agnes-ai.com/v1
                  </p>
                </div>

                {/* API Key */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      API 密钥 (apiKey)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!isApiKeyRevealed) {
                          if (confirm('确认查看完整的 API 密钥明文吗？')) {
                            fetchConfig(true);
                          }
                        } else {
                          fetchConfig(false);
                        }
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                    >
                      {isApiKeyRevealed ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          隐藏明文
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          查看明文 (脱敏保护中)
                        </>
                      )}
                    </button>
                  </div>
                  <input
                    type={isApiKeyRevealed ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-vWM7..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    修改时直接输入新密钥即可覆盖保存；在界面展示时默认处于脱敏状态
                  </p>
                </div>

                {/* Text Model */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      文本大模型 (textModel)
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">必须全小写</span>
                  </div>
                  <input
                    type="text"
                    value={textModelInput}
                    onChange={(e) => setTextModelInput(e.target.value)}
                    placeholder="agnes-2.5-flash"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-500">点击快捷填入:</span>
                    {['agnes-2.5-flash', 'agnes-3.0-flash', 'agnes-2.5-pro-beta'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setTextModelInput(m)}
                        className={`text-[10px] px-2 py-0.5 rounded border font-mono transition-colors ${
                          textModelInput === m
                            ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Model */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      视觉图片大模型 (imageModel)
                    </label>
                    <span className="text-[10px] text-emerald-400">视觉多模态识别</span>
                  </div>
                  <input
                    type="text"
                    value={imageModelInput}
                    onChange={(e) => setImageModelInput(e.target.value)}
                    placeholder="agnes-2.5-flash"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-500">点击快捷填入:</span>
                    {['agnes-2.5-flash', 'agnes-3.0-flash'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setImageModelInput(m)}
                        className={`text-[10px] px-2 py-0.5 rounded border font-mono transition-colors ${
                          imageModelInput === m
                            ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50'
                            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {m} (推荐)
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    💡 提示：该接口识别图片表格必须使用多模态对话模型（<code className="text-emerald-400 font-mono">agnes-2.5-flash</code>）；生图模型（<code className="text-amber-400 font-mono">agnes-image-*</code>）不支持图片表格解析。
                  </p>
                </div>
              </div>

              {/* Detected Available Models Pill Bar */}
              {detectedModels.length > 0 && (
                <div className="mt-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    当前 API Key 授权生效的所有可用模型列表（点击可直接选用）：
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setTextModelInput(m);
                          if (!m.includes('image-2') && !m.includes('video')) {
                            setImageModelInput(m);
                          }
                          showToast(`已填入模型: ${m}`, 'info');
                        }}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-slate-700/60 transition-colors"
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Gemini Backup Toggle */}
              <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    自动启用 Gemini 视觉备用通道 (高可用保障)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    当主模型出现超时、无法访问或限流时，自动无缝切换至底层 Google Gemini 视觉引擎，避免用户任务中断
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useBackup}
                    onChange={(e) => setUseBackup(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {config?.updatedAt && (
                <div className="mt-4 text-right text-[11px] text-slate-500">
                  最近更新时间: {new Date(config.updatedAt).toLocaleString('zh-CN')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Record Management */}
        {activeTab === 'records' && (
          <div className="space-y-6">
            {/* Filter Toolbar */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    placeholder="搜索记录 ID / 文件名 / 摘要..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="all">全部识别状态</option>
                  <option value="completed">全部成功 (Completed)</option>
                  <option value="partial">部分成功 (Partial)</option>
                  <option value="failed">全部失败 (Failed)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchRecords}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${isLoadingRecords ? 'animate-spin text-indigo-400' : ''}`}
                  />
                  刷新记录
                </button>
                <div className="text-xs text-slate-400">
                  共计 <span className="text-white font-semibold font-mono">{recordsTotal}</span> 条提交记录
                </div>
              </div>
            </div>

            {/* Records Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">记录编号</th>
                      <th className="py-3.5 px-4 font-semibold">提交时间</th>
                      <th className="py-3.5 px-4 font-semibold">图片数量</th>
                      <th className="py-3.5 px-4 font-semibold">识别状态</th>
                      <th className="py-3.5 px-4 font-semibold">识别结果摘要</th>
                      <th className="py-3.5 px-4 font-semibold">导出次数</th>
                      <th className="py-3.5 px-4 text-right font-semibold">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {records.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-slate-500">
                          {isLoadingRecords ? '正在加载处理记录...' : '暂无用户提交的处理记录'}
                        </td>
                      </tr>
                    ) : (
                      records.map((rec) => {
                        return (
                          <tr
                            key={rec.id}
                            className="hover:bg-slate-800/40 transition-colors group"
                          >
                            <td className="py-3 px-4 font-mono text-slate-300 font-medium">
                              {rec.id}
                            </td>
                            <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                              {new Date(rec.createdAt).toLocaleString('zh-CN')}
                            </td>
                            <td className="py-3 px-4">
                              <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-md font-mono text-[11px] border border-slate-700/60">
                                {rec.imageCount} 张
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {rec.status === 'completed' && (
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 w-fit">
                                  <CheckCircle2 className="w-3 h-3" />
                                  全部成功
                                </span>
                              )}
                              {rec.status === 'partial' && (
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" />
                                  部分成功
                                </span>
                              )}
                              {rec.status === 'failed' && (
                                <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-medium flex items-center gap-1 w-fit">
                                  <X className="w-3 h-3" />
                                  处理失败
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={rec.summary}>
                              {rec.summary || '无摘要说明'}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400">
                              {rec.exportCount || 0} 次
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedRecord(rec)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-medium transition-colors"
                                  title="查看记录详情与原图对比"
                                >
                                  查看详情
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleExportRecordExcel(rec)}
                                  className="p-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-colors"
                                  title="直接导出该记录为 Excel"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(rec.id)}
                                  className="p-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors"
                                  title="删除此记录"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {recordsTotal > pageSize && (
                <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
                  <div>
                    显示第 {(page - 1) * pageSize + 1} 至{' '}
                    {Math.min(page * pageSize, recordsTotal)} 条，共 {recordsTotal} 条
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(p - 1, 1))}
                      className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-30 hover:bg-slate-800"
                    >
                      上一页
                    </button>
                    <span className="px-3 font-mono text-white">第 {page} 页</span>
                    <button
                      type="button"
                      disabled={page * pageSize >= recordsTotal}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-30 hover:bg-slate-800"
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Change Password */}
        {activeTab === 'password' && (
          <div className="max-w-xl mx-auto w-full">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="mb-6 pb-4 border-b border-slate-800">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-indigo-400" />
                  修改管理员登录密码
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  密码使用安全散列算法（bcrypt）加密存储于数据库，请妥善保存新密码
                </p>
              </div>

              {pwdMsg && (
                <div
                  className={`mb-5 p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    pwdMsg.type === 'success'
                      ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
                      : 'bg-red-950 border-red-800 text-red-300'
                  }`}
                >
                  {pwdMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  )}
                  <span>{pwdMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    当前原密码
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="请输入当前正在使用的密码"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    新密码 (至少 6 位)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="请输入新的管理员密码"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    确认新密码
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="请再次确认新密码"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isChangingPwd}
                  className="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isChangingPwd ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  确认修改密码
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden text-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      记录详情: {selectedRecord.id}
                    </h3>
                    <span className="text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      {selectedRecord.items.length} 张图片
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    提交时间: {new Date(selectedRecord.createdAt).toLocaleString('zh-CN')} · 规则模板: {selectedRecord.promptType}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isRetryingRecord}
                  onClick={() => handleRetryRecord(selectedRecord.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 text-xs font-medium transition-colors"
                >
                  {isRetryingRecord ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCw className="w-3.5 h-3.5" />
                  )}
                  重新识别失败项
                </button>
                <button
                  type="button"
                  onClick={() => handleExportRecordExcel(selectedRecord)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  导出 Excel
                </button>
                <div className="w-[1px] h-5 bg-slate-800 mx-1" />
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {selectedRecord.items.map((item, idx) => {
                return (
                  <div
                    key={item.id || idx}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 text-xs font-mono flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-xs text-white">
                          {item.fileName}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          (Sheet: {item.sheetName})
                        </span>
                        {item.modelUsed && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                            {item.modelUsed}
                          </span>
                        )}
                      </div>

                      <div>
                        {item.status === 'success' ? (
                          <span className="text-emerald-400 text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 识别成功
                          </span>
                        ) : (
                          <span className="text-red-400 text-xs flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> 识别失败: {item.errorMessage}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Original image thumbnail */}
                      <div className="aspect-[4/3] bg-black/50 rounded-lg border border-slate-800 overflow-hidden flex items-center justify-center">
                        {item.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumbnailUrl}
                            alt={item.fileName}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-xs text-slate-500">原图缩略图</div>
                        )}
                      </div>

                      {/* Extracted table preview */}
                      <div className="md:col-span-2 overflow-x-auto max-h-[220px] bg-slate-900 rounded-lg border border-slate-800 p-2">
                        {item.extractedData?.rows ? (
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                              <tr>
                                {(item.extractedData.headers || []).map((h: string, hIdx: number) => (
                                  <th key={hIdx} className="p-2 whitespace-nowrap font-medium">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 font-mono text-slate-300">
                              {item.extractedData.rows.slice(0, 10).map((r: any, rIdx: number) => (
                                <tr key={rIdx} className="hover:bg-slate-800/30">
                                  {(item.extractedData.headers || []).map(
                                    (h: string, colIdx: number) => {
                                      const val = Array.isArray(r) ? r[colIdx] : r[h];
                                      return (
                                        <td key={colIdx} className="p-2 whitespace-nowrap max-w-[200px] truncate">
                                          {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')}
                                        </td>
                                      );
                                    }
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="h-full flex items-center justify-center text-xs text-slate-500">
                            暂无结构化提取数据
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
