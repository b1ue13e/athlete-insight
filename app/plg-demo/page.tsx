/**
 * PLG (Product-Led Growth) 完整演示页面
 * 
 * 整合三层商业化实战：
 * 1. 剧本式引导 (driver.js)
 * 2. 柔性门槛转化 (Soft Gating)
 * 3. 健壮 Excel 解析 (xlsx + Zod)
 */

'use client';

import { useState, useEffect } from 'react';
import { GuidedTour, TourStartButton } from '@/components/onboarding/guided-tour';
import { ProcessingProgress, SoftGateModal } from '@/components/conversion/soft-gate-modal';
import { ExcelParser, PlayerData } from '@/components/import/excel-parser';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Sparkles, Upload, CheckCircle, TrendingUp, Shield, Zap } from 'lucide-react';

// 模拟球员数据
const DEMO_PLAYER = {
  name: "张三",
  stats: { attack: 88, block: 52, serve: 72, defense: 65, set: 45, receive: 78 },
  aiPrescription: [
    { type: 'warning', text: '防守能力明显短板 (65分)，低于同位置平均水平' },
    { type: 'action', text: '建议增加下肢侧向移动训练，每周2次' },
    { type: 'tip', text: '参考训练：横向滑步+倒地救球组合，每组15次' },
  ],
};

export default function PLGDemoPage() {
  const [showTour, setShowTour] = useState(false);
  const [showSoftGate, setShowSoftGate] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showExcelParser, setShowExcelParser] = useState(false);
  const [parsedData, setParsedData] = useState<PlayerData[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 自动触发引导（首次访问）
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenTour');
    if (!hasSeenTour) {
      setTimeout(() => setShowTour(true), 1000);
    }
  }, []);

  const handleTourComplete = () => {
    localStorage.setItem('hasSeenTour', 'true');
    setShowTour(false);
  };

  const handleUploadClick = () => {
    setShowProgress(true);
  };

  const handleProgressComplete = () => {
    setShowProgress(false);
    setShowSoftGate(true);
  };

  const handleLogin = (email: string) => {
    setIsLoggedIn(true);
    setShowSoftGate(false);
    // 模拟登录成功后的处理
    alert(`欢迎！已使用 ${email} 登录成功`);
  };

  const handleParsedData = (data: PlayerData[]) => {
    setParsedData(data);
    setShowExcelParser(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* 引导组件 */}
      <GuidedTour 
        isActive={showTour} 
        onComplete={handleTourComplete}
        onSkip={handleTourComplete}
      />

      {/* 进度条组件 */}
      {showProgress && (
        <ProcessingProgress onComplete={handleProgressComplete} />
      )}

      {/* 柔性门槛模态框 */}
      <SoftGateModal
        isOpen={showSoftGate}
        onClose={() => setShowSoftGate(false)}
        onLogin={handleLogin}
        parsedData={{
          playerCount: 12,
          insights: [
            '发现 2 处隐藏的伤病代偿风险',
            '识别 1 个黄金轮换阵容组合',
            '检测到 3 名球员的夏普比率异常',
          ],
        }}
      />

      {/* 头部 */}
      <header className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Athlete Insight</h1>
              <p className="text-zinc-500 text-sm">AI 驱动的运动表现分析</p>
            </div>
          </div>
          
          {!isLoggedIn ? (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowSoftGate(true)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                登录
              </button>
              <button 
                onClick={() => setShowSoftGate(true)}
                className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors"
              >
                免费试用
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span>已登录</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* 英雄区 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 text-cyan-400 px-4 py-2 rounded-full text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            无需注册，一键体验完整功能
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            发现你球队里的隐藏漏洞
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto">
            基于夏普比率和协方差矩阵的 AI 分析，
            帮助你在关键局做出数据驱动的决策
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 左侧：Demo 报告 */}
          <div className="space-y-6">
            {/* 雷达图 */}
            <div id="radar-chart-defense" className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-4">能力雷达图</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={[
                    { subject: '进攻', A: DEMO_PLAYER.stats.attack, fullMark: 100 },
                    { subject: '拦网', A: DEMO_PLAYER.stats.block, fullMark: 100 },
                    { subject: '发球', A: DEMO_PLAYER.stats.serve, fullMark: 100 },
                    { subject: '防守', A: DEMO_PLAYER.stats.defense, fullMark: 100 },
                    { subject: '传球', A: DEMO_PLAYER.stats.set, fullMark: 100 },
                    { subject: '接发', A: DEMO_PLAYER.stats.receive, fullMark: 100 },
                  ]}>
                    <PolarGrid stroke="#27272a" />
                    <PolarAngleAxis tick={{ fill: '#71717a', fontSize: 12 }} />
                    <Radar
                      name={DEMO_PLAYER.name}
                      dataKey="A"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fill="#06b6d4"
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center gap-2 text-amber-400 bg-amber-500/10 rounded-lg p-3">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm">防守能力 (65) 低于同位置平均 (78)，存在明显短板</span>
              </div>
            </div>

            {/* AI 处方卡片 */}
            <div id="ai-prescription-card" className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl p-6 border border-cyan-500/30">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-cyan-400" />
                AI 训练处方
              </h3>
              <div className="space-y-3">
                {DEMO_PLAYER.aiPrescription.map((item, i) => (
                  <div 
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      item.type === 'warning' ? 'bg-amber-500/10 border border-amber-500/30' :
                      item.type === 'action' ? 'bg-cyan-500/10 border border-cyan-500/30' :
                      'bg-zinc-800/50'
                    }`}
                  >
                    <span className={
                      item.type === 'warning' ? 'text-amber-400' :
                      item.type === 'action' ? 'text-cyan-400' :
                      'text-zinc-400'
                    }>
                      {item.type === 'warning' ? '⚠️' : item.type === 'action' ? '💪' : '💡'}
                    </span>
                    <span className="text-zinc-300 text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：导入区域 */}
          <div className="space-y-6">
            {showExcelParser ? (
              <ExcelParser 
                onParsed={handleParsedData}
                onError={(errors) => alert(errors.join('\n'))}
              />
            ) : parsedData.length > 0 ? (
              <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  导入成功
                </h3>
                <p className="text-zinc-400 mb-4">已成功导入 {parsedData.length} 名球员的数据</p>
                <div className="space-y-2">
                  {parsedData.slice(0, 5).map((player, i) => (
                    <div key={i} className="flex items-center gap-3 bg-zinc-800 rounded-lg p-3">
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                        {player.number}
                      </div>
                      <span className="text-white">{player.name}</span>
                      <span className="text-zinc-500 text-sm">{player.position}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setParsedData([])}
                  className="mt-4 text-cyan-400 text-sm hover:underline"
                >
                  重新导入
                </button>
              </div>
            ) : (
              <>
                {/* 导入按钮 */}
                <div id="import-data-button" className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                  <h3 className="text-lg font-semibold text-white mb-4">导入你的数据</h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleUploadClick}
                      className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                    >
                      <Upload className="w-5 h-5" />
                      上传 Excel/CSV 文件
                    </button>
                    <button
                      onClick={() => setShowExcelParser(true)}
                      className="w-full py-4 bg-zinc-800 text-white rounded-xl font-semibold hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Shield className="w-5 h-5" />
                      使用高级导入工具
                    </button>
                  </div>
                  <p className="text-zinc-500 text-sm mt-4 text-center">
                    支持 .xlsx, .csv 格式，自动字段映射
                  </p>
                </div>

                {/* 功能亮点 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-3">
                      <TrendingUp className="w-5 h-5 text-cyan-400" />
                    </div>
                    <p className="text-white font-medium mb-1">夏普比率</p>
                    <p className="text-zinc-500 text-sm">量化评估球员稳定性</p>
                  </div>
                  <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
                      <Shield className="w-5 h-5 text-purple-400" />
                    </div>
                    <p className="text-white font-medium mb-1">协方差矩阵</p>
                    <p className="text-zinc-500 text-sm">发现最佳阵容组合</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* 引导按钮 */}
      {!showTour && <TourStartButton onClick={() => setShowTour(true)} />}

      {/* 底部 CTA */}
      <footer className="border-t border-zinc-800 mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-zinc-400 mb-4">准备好提升你的球队了吗？</p>
          <button
            onClick={handleUploadClick}
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            免费开始分析
            <TrendingUp className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
