/**
 * 第二层：转化漏斗的"柔性门槛"设计 (Soft Gating)
 * 
 * 核心逻辑：先给糖，再要钱（邮箱）
 * 
 * 交互流：
 * 1. 用户上传数据
 * 2. 显示炫酷进度条（制造期待感）
 * 3. 走到 99% 时弹出模态框
 * 4. 背景是半透明的真实报告
 * 
 * "最高级的逼单，不是把门锁上，而是把门开一条缝，
 *  让他看到里面的金山，然后告诉他进门只需要签个字。"
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Mail, Lock, Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface SoftGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string) => void;
  parsedData?: {
    playerCount: number;
    insights: string[];
  };
}

// 进度条组件
export function ProcessingProgress({ 
  onComplete 
}: { 
  onComplete: () => void 
}) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('正在解析数据...');

  useEffect(() => {
    const stages = [
      { pct: 15, text: '正在解析数据...', delay: 800 },
      { pct: 35, text: '异常值清洗中...', delay: 1200 },
      { pct: 55, text: '计算夏普比率...', delay: 1000 },
      { pct: 75, text: '构建协方差矩阵...', delay: 1500 },
      { pct: 90, text: '生成 AI 处方...', delay: 1000 },
      { pct: 99, text: '报告已就绪！', delay: 500 },
    ];

    let currentStage = 0;
    
    const runStage = () => {
      if (currentStage >= stages.length) {
        setTimeout(onComplete, 300);
        return;
      }

      const stage = stages[currentStage];
      setProgress(stage.pct);
      setStatus(stage.text);
      
      currentStage++;
      setTimeout(runStage, stage.delay);
    };

    runStage();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex items-center justify-center">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">正在生成洞察报告</h3>
          <p className="text-zinc-400">{status}</p>
        </div>

        {/* 进度条 */}
        <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 技术栈展示 */}
        <div className="mt-6 flex justify-center gap-2 flex-wrap">
          {['数据清洗', '夏普比率', '协方差矩阵', 'AI 处方'].map((tag) => (
            <span 
              key={tag}
              className="px-3 py-1 bg-zinc-900 rounded-full text-xs text-zinc-500"
            >
              {tag}
            </span>
          ))}
        </div>

        <p className="mt-6 text-zinc-600 text-sm">
          预计剩余时间: {progress < 50 ? '8秒' : progress < 80 ? '5秒' : '即将完成'}
        </p>
      </div>
    </div>
  );
}

// 主模态框
export function SoftGateModal({ isOpen, onClose, onLogin, parsedData }: SoftGateModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 简单验证
    if (!email.includes('@')) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setIsLoading(true);
    
    // 模拟 API 调用
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    onLogin(email);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景：毛玻璃效果的真实报告预览 */}
      <div 
        className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
        onClick={onClose}
      >
        {/* 预览内容 - 故意模糊可见 */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="max-w-4xl mx-auto mt-20 p-8">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="h-32 bg-zinc-800 rounded-xl" />
              <div className="h-32 bg-zinc-800 rounded-xl" />
              <div className="h-32 bg-zinc-800 rounded-xl" />
            </div>
            <div className="h-64 bg-zinc-800 rounded-xl" />
          </div>
        </div>
      </div>

      {/* 模态框 */}
      <div className="relative w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl overflow-hidden">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-lg transition-colors z-10"
        >
          <X className="w-5 h-5 text-zinc-400" />
        </button>

        {/* 顶部装饰 */}
        <div className="h-2 bg-gradient-to-r from-cyan-500 to-blue-600" />

        <div className="p-8">
          {/* 标题区 */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-green-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">报告已就绪！</h3>
            <p className="text-zinc-400">
              系统分析了 <span className="text-cyan-400 font-semibold">{parsedData?.playerCount || 12}</span> 名球员的数据
            </p>
          </div>

          {/* 发现列表 */}
          <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
            <p className="text-sm text-zinc-400 mb-3">关键发现：</p>
            <ul className="space-y-2">
              {(parsedData?.insights || [
                '发现 2 处隐藏的伤病代偿风险',
                '识别 1 个黄金轮换阵容组合',
                '检测到 3 名球员的夏普比率异常'
              ]).map((insight, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-amber-400 mt-0.5">⚠️</span>
                  <span className="text-zinc-300">{insight}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                邮箱地址
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  正在创建账户...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  立即解锁完整报告
                </>
              )}
            </button>
          </form>

          {/* 社交登录 */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-zinc-900 text-zinc-500">或者</span>
              </div>
            </div>

            <button
              onClick={() => onLogin('google_user')}
              className="mt-4 w-full py-3 bg-white text-zinc-900 font-semibold rounded-xl hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              使用 Google 账号登录
            </button>
          </div>

          {/* 底部文案 */}
          <p className="mt-6 text-center text-xs text-zinc-500">
            注册即表示同意我们的服务条款和隐私政策
          </p>
        </div>
      </div>
    </div>
  );
}

// 导出默认组件
export default SoftGateModal;
