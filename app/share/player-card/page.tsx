/**
 * 球星卡生成页面 - 完整演示
 * 集成三层深度优化：
 * 1. 行为埋点 (Telemetry)
 * 2. 数据清洗 (Data Pipeline)  
 * 3. 夏普比率 (Sharpe Ratio)
 */

'use client';

import { useState, useEffect } from 'react';
import { PlayerCardV2 } from '@/components/share-cards/player-card-v2';
import { analytics } from '@/lib/telemetry/analytics-client';
import { calculateAthleticSharpeRatio, PlayerSeasonData, LineupOptimization, optimizeLineup } from '@/lib/analytics/athletic-sharpe-ratio';
import { analyzeRunningWorkout, RunningDataPoint, RunningAnalysisResult } from '@/lib/running-advanced-metrics';
import { Tab } from '@headlessui/react';

// 示例排球数据 - 用于夏普比率计算
const samplePlayerData: PlayerSeasonData = {
  playerId: 'player_001',
  playerName: '李明',
  position: 'outside',
  games: [
    {
      gameId: 'g1',
      date: '2024-03-01',
      stats: { attackKills: 15, attackErrors: 3, attackAttempts: 28, blocks: 2, blockErrors: 0, digs: 8, receptionErrors: 1, aces: 1, serviceErrors: 2, assists: 0, settingErrors: 0 },
      minutesPlayed: 90,
      opponentStrength: 7,
      isHome: true,
      isPlayoff: false,
    },
    {
      gameId: 'g2',
      date: '2024-03-08',
      stats: { attackKills: 12, attackErrors: 2, attackAttempts: 22, blocks: 1, blockErrors: 1, digs: 10, receptionErrors: 2, aces: 0, serviceErrors: 1, assists: 1, settingErrors: 0 },
      minutesPlayed: 85,
      opponentStrength: 8,
      isHome: false,
      isPlayoff: false,
    },
    {
      gameId: 'g3',
      date: '2024-03-15',
      stats: { attackKills: 18, attackErrors: 4, attackAttempts: 35, blocks: 3, blockErrors: 0, digs: 6, receptionErrors: 0, aces: 2, serviceErrors: 3, assists: 0, settingErrors: 0 },
      minutesPlayed: 95,
      opponentStrength: 6,
      isHome: true,
      isPlayoff: false,
    },
    {
      gameId: 'g4',
      date: '2024-03-22',
      stats: { attackKills: 8, attackErrors: 5, attackAttempts: 20, blocks: 1, blockErrors: 1, digs: 12, receptionErrors: 3, aces: 0, serviceErrors: 2, assists: 0, settingErrors: 0 },
      minutesPlayed: 70,
      opponentStrength: 9,
      isHome: false,
      isPlayoff: true,
    },
    {
      gameId: 'g5',
      date: '2024-03-29',
      stats: { attackKills: 20, attackErrors: 2, attackAttempts: 32, blocks: 2, blockErrors: 0, digs: 9, receptionErrors: 1, aces: 3, serviceErrors: 1, assists: 1, settingErrors: 0 },
      minutesPlayed: 100,
      opponentStrength: 5,
      isHome: true,
      isPlayoff: false,
    },
    {
      gameId: 'g6',
      date: '2024-04-05',
      stats: { attackKills: 14, attackErrors: 3, attackAttempts: 25, blocks: 2, blockErrors: 0, digs: 11, receptionErrors: 2, aces: 1, serviceErrors: 2, assists: 0, settingErrors: 0 },
      minutesPlayed: 88,
      opponentStrength: 7,
      isHome: false,
      isPlayoff: false,
    },
  ],
};

// 示例跑步数据 - 用于四层分析
function generateMockRunningData(): RunningDataPoint[] {
  const data: RunningDataPoint[] = [];
  const startTime = Date.now();
  let distance = 0;
  
  // 模拟21km半马，每10秒一个数据点
  for (let i = 0; i < 7560; i++) {
    const time = i * 10; // 秒
    const pace = 5.0 + Math.sin(i / 1000) * 0.5 + (i > 5000 ? 0.3 : 0); // 逐渐降速
    const heartRate = 140 + (i / 7560) * 30 + Math.random() * 5; // 逐渐上升
    distance += (1000 / pace) * (10 / 60); // 米
    
    data.push({
      timestamp: startTime + time * 1000,
      pace,
      heartRate: Math.round(heartRate),
      distance,
      cadence: 175 - (i > 6000 ? 8 : 0), // 后期步频下降
      groundContactTime: 220 + (i > 6000 ? 20 : 0), // 后期触地时间增加
      strideLength: 1.2 + Math.random() * 0.1,
    });
  }
  
  // 添加一些异常值模拟隧道GPS丢失
  data[2000].pace = 1.5; // 异常快
  data[2001].pace = 1.8;
  data[5000].heartRate = 250; // 异常心率
  
  return data;
}

export default function PlayerCardPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [sharpeResult, setSharpeResult] = useState<ReturnType<typeof calculateAthleticSharpeRatio> | null>(null);
  const [runningAnalysis, setRunningAnalysis] = useState<RunningAnalysisResult | null>(null);
  const tier: "LEGENDARY" | "ELITE" | "RARE" | "COMMON" = sharpeResult
    ? sharpeResult.tier === 'FUNDAMENTAL'
      ? 'LEGENDARY'
      : sharpeResult.tier === 'HIGH_BETA'
        ? 'ELITE'
        : sharpeResult.tier === 'VOLATILE'
          ? 'RARE'
          : 'COMMON'
    : 'ELITE';

  // 初始化埋点
  useEffect(() => {
    analytics.init();
    
    // 计算夏普比率
    try {
      const result = calculateAthleticSharpeRatio(samplePlayerData);
      setSharpeResult(result);
    } catch (e) {
      console.error('Sharpe calculation failed:', e);
    }
    
    // 分析跑步数据
    const mockData = generateMockRunningData();
    const analysis = analyzeRunningWorkout(mockData, 'threshold');
    setRunningAnalysis(analysis);
  }, []);

  const cardData = {
    name: samplePlayerData.playerName,
    number: '8',
    position: '主攻手',
    team: '北京排球队',
    tier,
    overall: sharpeResult ? Math.round(sharpeResult.sharpeRatio * 20 + 50) : 82,
    stats: {
      attack: sharpeResult ? Math.round(sharpeResult.avgXP * 5 + 60) : 75,
      block: 68,
      serve: 72,
      defense: 80,
      set: 45,
      receive: 78,
    },
    analysisId: 'analysis_001',
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* 头部导航 */}
      <div className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-white">运动员洞察分析平台</h1>
          <p className="text-zinc-500 text-sm mt-1">v2.0 - 量化金融视角的体育分析</p>
        </div>
      </div>

      <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
        <Tab.List className="flex space-x-1 bg-zinc-900/50 p-1 max-w-6xl mx-auto mt-6 rounded-xl">
          {['球星卡生成', '夏普比率分析', '跑步数据分析'].map((tab) => (
            <Tab
              key={tab}
              className={({ selected }) =>
                `w-full py-2.5 text-sm font-medium leading-5 rounded-lg transition-colors
                ${selected 
                  ? 'bg-cyan-500 text-white shadow' 
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`
              }
            >
              {tab}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="max-w-6xl mx-auto mt-6">
          {/* Panel 1: 球星卡 */}
          <Tab.Panel>
            <PlayerCardV2 data={cardData} />
          </Tab.Panel>

          {/* Panel 2: 夏普比率分析 */}
          <Tab.Panel>
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <h2 className="text-xl font-bold text-white mb-6">运动场夏普比率分析</h2>
              
              {sharpeResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 核心指标卡片 */}
                  <div className="space-y-4">
                    <div className={`p-4 rounded-xl border ${
                      sharpeResult.tier === 'FUNDAMENTAL' ? 'bg-amber-500/10 border-amber-500/30' :
                      sharpeResult.tier === 'HIGH_BETA' ? 'bg-cyan-500/10 border-cyan-500/30' :
                      sharpeResult.tier === 'VOLATILE' ? 'bg-orange-500/10 border-orange-500/30' :
                      'bg-zinc-800 border-zinc-700'
                    }`}>
                      <p className="text-zinc-400 text-sm">运动员等级</p>
                      <p className={`text-2xl font-bold ${
                        sharpeResult.tier === 'FUNDAMENTAL' ? 'text-amber-400' :
                        sharpeResult.tier === 'HIGH_BETA' ? 'text-cyan-400' :
                        sharpeResult.tier === 'VOLATILE' ? 'text-orange-400' :
                        'text-zinc-400'
                      }`}>
                        {sharpeResult.tier === 'FUNDAMENTAL' && '核心基本盘'}
                        {sharpeResult.tier === 'HIGH_BETA' && '高Beta球员'}
                        {sharpeResult.tier === 'VOLATILE' && '神经刀'}
                        {sharpeResult.tier === 'UNDERPERFORMER' && '待提升'}
                      </p>
                      <p className="text-zinc-500 text-sm mt-2">{sharpeResult.recommendation}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-800 rounded-xl p-4">
                        <p className="text-zinc-400 text-sm">夏普比率</p>
                        <p className="text-2xl font-bold text-white">{sharpeResult.sharpeRatio.toFixed(2)}</p>
                        <p className="text-zinc-500 text-xs mt-1">风险调整后收益</p>
                      </div>
                      <div className="bg-zinc-800 rounded-xl p-4">
                        <p className="text-zinc-400 text-sm">波动率 σ</p>
                        <p className="text-2xl font-bold text-white">{sharpeResult.volatility.toFixed(2)}</p>
                        <p className="text-zinc-500 text-xs mt-1">表现稳定性</p>
                      </div>
                    </div>

                    <div className="bg-zinc-800 rounded-xl p-4">
                      <p className="text-zinc-400 text-sm">95% VaR (风险价值)</p>
                      <p className="text-xl font-bold text-white">{sharpeResult.var95.toFixed(2)} xP</p>
                      <p className="text-zinc-500 text-xs mt-1">有5%概率表现低于此值</p>
                    </div>
                  </div>

                  {/* 详细指标 */}
                  <div className="space-y-4">
                    <div className="bg-zinc-800 rounded-xl p-4">
                      <p className="text-zinc-400 text-sm mb-3">详细指标</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">平均期望得分</span>
                          <span className="text-white font-mono">{sharpeResult.avgXP.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">无风险收益率 (Rf)</span>
                          <span className="text-white font-mono">{sharpeResult.riskFreeRate.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">超额收益</span>
                          <span className="text-cyan-400 font-mono">+{sharpeResult.excessReturn.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">稳定性评分</span>
                          <span className={`font-mono ${sharpeResult.consistencyScore > 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                            {sharpeResult.consistencyScore.toFixed(0)}/100
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">关键局表现</span>
                          <span className={`font-mono ${sharpeResult.clutchPerformance > 1 ? 'text-green-400' : 'text-zinc-400'}`}>
                            {(sharpeResult.clutchPerformance * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-zinc-800 to-zinc-900 rounded-xl p-4 border border-zinc-700">
                      <p className="text-zinc-400 text-sm mb-2">公式解读</p>
                      <div className="font-mono text-sm text-zinc-300 bg-black/30 p-3 rounded-lg">
                        <p>SR = (xP̄ - Rf) / σ</p>
                        <p className="text-zinc-500 mt-2 text-xs">
                          = ({sharpeResult.avgXP.toFixed(2)} - {sharpeResult.riskFreeRate.toFixed(2)}) / {sharpeResult.volatility.toFixed(2)}
                        </p>
                        <p className="text-cyan-400 mt-1">
                          = {sharpeResult.sharpeRatio.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Tab.Panel>

          {/* Panel 3: 跑步数据分析 */}
          <Tab.Panel>
            {runningAnalysis && (
              <div className="space-y-6">
                {/* 数据质量指示器 */}
                <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <p className="text-zinc-400 text-sm">数据质量评分</p>
                    <p className={`text-xl font-bold ${
                      runningAnalysis.dataQuality.confidenceScore > 90 ? 'text-green-400' :
                      runningAnalysis.dataQuality.confidenceScore > 70 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {runningAnalysis.dataQuality.confidenceScore}/100
                    </p>
                  </div>
                  <div className="text-right text-sm text-zinc-500">
                    <p>清洗: {runningAnalysis.dataQuality.outliersRemoved} 异常值剔除</p>
                    <p>插值: {runningAnalysis.dataQuality.gapsInterpolated} 间隙填补</p>
                  </div>
                </div>

                {/* 基础数据 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-400 text-sm">距离</p>
                    <p className="text-xl font-bold text-white">{(runningAnalysis.summary.totalDistance / 1000).toFixed(2)} km</p>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-400 text-sm">时长</p>
                    <p className="text-xl font-bold text-white">{Math.floor(runningAnalysis.summary.duration / 60)}:{String(Math.floor(runningAnalysis.summary.duration % 60)).padStart(2, '0')}</p>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-400 text-sm">平均配速</p>
                    <p className="text-xl font-bold text-white">{Math.floor(runningAnalysis.summary.avgPace)}:{String(Math.floor((runningAnalysis.summary.avgPace % 1) * 60)).padStart(2, '0')} /km</p>
                  </div>
                  <div className="bg-zinc-800 rounded-xl p-4">
                    <p className="text-zinc-400 text-sm">平均心率</p>
                    <p className="text-xl font-bold text-white">{runningAnalysis.summary.avgHeartRate} bpm</p>
                  </div>
                </div>

                {/* 四层分析 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Layer 1: 心率脱钩 */}
                  <div className={`p-4 rounded-xl border ${
                    runningAnalysis.layers.cardiac.status === 'excellent' ? 'bg-green-500/10 border-green-500/30' :
                    runningAnalysis.layers.cardiac.status === 'good' ? 'bg-cyan-500/10 border-cyan-500/30' :
                    runningAnalysis.layers.cardiac.status === 'fair' ? 'bg-yellow-500/10 border-yellow-500/30' :
                    'bg-red-500/10 border-red-500/30'
                  }`}>
                    <p className="text-zinc-400 text-sm">心率脱钩</p>
                    <p className="text-2xl font-bold text-white">{runningAnalysis.layers.cardiac.decouplingPercent}%</p>
                    <p className="text-zinc-500 text-xs mt-1">{runningAnalysis.layers.cardiac.insight}</p>
                  </div>

                  {/* Layer 2: 乳酸阈值 */}
                  <div className={`p-4 rounded-xl border ${
                    runningAnalysis.layers.threshold.detected ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-zinc-800 border-zinc-700'
                  }`}>
                    <p className="text-zinc-400 text-sm">乳酸阈值</p>
                    {runningAnalysis.layers.threshold.detected ? (
                      <>
                        <p className="text-2xl font-bold text-white">{runningAnalysis.layers.threshold.thresholdHR} bpm</p>
                        <p className="text-zinc-500 text-xs mt-1">置信度 {runningAnalysis.layers.threshold.confidence}%</p>
                      </>
                    ) : (
                      <p className="text-zinc-500">未检测到明显阈值</p>
                    )}
                  </div>

                  {/* Layer 3: 生物力学 */}
                  <div className={`p-4 rounded-xl border ${
                    runningAnalysis.layers.biomechanical.severity === 'low' ? 'bg-green-500/10 border-green-500/30' :
                    runningAnalysis.layers.biomechanical.severity === 'moderate' ? 'bg-yellow-500/10 border-yellow-500/30' :
                    'bg-red-500/10 border-red-500/30'
                  }`}>
                    <p className="text-zinc-400 text-sm">跑姿分析</p>
                    <p className="text-lg font-bold text-white">
                      {runningAnalysis.layers.biomechanical.compensationPattern === 'none' && '跑姿稳定'}
                      {runningAnalysis.layers.biomechanical.compensationPattern === 'mild' && '轻度疲劳'}
                      {runningAnalysis.layers.biomechanical.compensationPattern === 'overstriding' && '过度跨步'}
                      {runningAnalysis.layers.biomechanical.compensationPattern === 'dangerous_overstriding' && '危险步态'}
                    </p>
                    <p className="text-zinc-500 text-xs mt-1">步频下降 {runningAnalysis.layers.biomechanical.cadenceDrop}%</p>
                  </div>
                </div>

                {/* AI 训练处方 */}
                <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl p-6 border border-cyan-500/30">
                  <h3 className="text-lg font-bold text-white mb-4">AI 训练处方</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-zinc-400 text-sm">训练重点</p>
                      <p className="text-xl font-bold text-cyan-400">{runningAnalysis.prescription.primaryFocus}</p>
                      <p className="text-zinc-500 text-sm mt-2">{runningAnalysis.prescription.rationale}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">强度</span>
                        <span className="text-white">{runningAnalysis.prescription.intensity}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">时长</span>
                        <span className="text-white">{runningAnalysis.prescription.duration}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">目标心率</span>
                        <span className="text-white">{runningAnalysis.prescription.targetZone.min}-{runningAnalysis.prescription.targetZone.max} bpm</span>
                      </div>
                    </div>
                  </div>
                  {runningAnalysis.prescription.constraints.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-cyan-500/20">
                      <p className="text-yellow-400 text-sm flex items-center gap-2">
                        <span>⚠️</span>
                        {runningAnalysis.prescription.constraints.join(' | ')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}
