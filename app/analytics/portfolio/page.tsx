/**
 * 投资组合优化与回测展示页面
 * 
 * 展示：
 * 1. 协方差矩阵热力图
 * 2. 有效阵容前沿
 * 3. 对冲分析
 * 4. 回测结果
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { PlayerSeasonData } from '@/lib/analytics/athletic-sharpe-ratio';
import { 
  buildCovarianceMatrix, 
  findOptimalLineup,
  analyzeHedgingOpportunities,
  EfficientFrontierPoint,
} from '@/lib/analytics/portfolio-optimization';
import { 
  GameResult,
  runWalkForwardBacktest,
  runABTest,
  BacktestSummary,
} from '@/lib/analytics/backtesting-engine';

// 生成模拟数据
function generateMockData() {
  const positions = ['setter', 'outside', 'opposite', 'middle', 'libero'] as const;
  const names = [
    ['张明', '李强', '王伟'],
    ['陈杰', '杨帆', '黄磊'],
    ['吴昊', '徐飞'],
    ['朱军', '胡斌', '郭亮'],
    ['林峰', '郑凯'],
  ];
  
  const roster: PlayerSeasonData[] = [];
  
  positions.forEach((pos, posIdx) => {
    const count = pos === 'outside' || pos === 'middle' ? 3 : 2;
    
    for (let i = 0; i < count; i++) {
      const playerGames = [];
      const basePerformance = 0.5 + Math.random() * 0.3;
      const volatility = 0.2 + Math.random() * 0.3;
      
      for (let g = 0; g < 20; g++) {
        const form = Math.sin(g / 5) * volatility + basePerformance;
        
        playerGames.push({
          gameId: `game_${g + 1}`,
          date: `2024-${String(Math.floor(g / 4) + 1).padStart(2, '0')}-${String((g % 4) * 7 + 1).padStart(2, '0')}`,
          stats: {
            attackKills: Math.floor(Math.random() * 15 * form) + 3,
            attackErrors: Math.floor(Math.random() * 4),
            attackAttempts: Math.floor(Math.random() * 20) + 10,
            blocks: Math.floor(Math.random() * 4 * form),
            blockErrors: Math.floor(Math.random() * 2),
            digs: Math.floor(Math.random() * 10) + 2,
            receptionErrors: Math.floor(Math.random() * 3),
            aces: Math.floor(Math.random() * 3 * form),
            serviceErrors: Math.floor(Math.random() * 3),
            assists: Math.floor(Math.random() * 20) + 10,
            settingErrors: Math.floor(Math.random() * 3),
          },
          minutesPlayed: 60 + Math.floor(Math.random() * 30),
          opponentStrength: Math.floor(Math.random() * 5) + 5,
          isHome: Math.random() > 0.5,
          isPlayoff: g > 15,
        });
      }
      
      roster.push({
        playerId: `player_${roster.length + 1}`,
        playerName: names[posIdx][i] || `${pos}_${i}`,
        position: pos,
        games: playerGames,
      });
    }
  });
  
  // 生成比赛结果
  const gameResults: GameResult[] = [];
  for (let g = 0; g < 20; g++) {
    const shuffled = [...roster].sort(() => Math.random() - 0.5);
    const startingLineup = shuffled.slice(0, 6).map(p => p.playerId);
    const isWin = Math.random() > 0.4;
    
    gameResults.push({
      gameId: `game_${g + 1}`,
      date: `2024-${String(Math.floor(g / 4) + 1).padStart(2, '0')}-${String((g % 4) * 7 + 1).padStart(2, '0')}`,
      opponent: `对手${g + 1}`,
      isWin,
      setsWon: isWin ? 3 : Math.floor(Math.random() * 2),
      setsLost: isWin ? Math.floor(Math.random() * 2) : 3,
      totalPointsScored: 75 + Math.floor(Math.random() * 20),
      totalPointsConceded: 75 + Math.floor(Math.random() * 20),
      startingLineup,
      playerStats: {},
    });
  }
  
  return { roster, gameResults };
}

// 协方差热力图组件
function CovarianceHeatmap({ matrix, players }: { matrix: any[][]; players: PlayerSeasonData[] }) {
  const size = players.length;
  const maxVal = Math.max(...matrix.flat().map(c => Math.abs(c.covariance)));
  
  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        <div className="flex">
          <div className="w-24"></div>
          {players.map(p => (
            <div key={p.playerId} className="w-12 text-xs text-zinc-500 text-center truncate">
              {p.playerName.slice(0, 2)}
            </div>
          ))}
        </div>
        {matrix.map((row, i) => (
          <div key={i} className="flex items-center">
            <div className="w-24 text-xs text-zinc-400 truncate pr-2">
              {players[i]?.playerName}
            </div>
            {row.map((cell, j) => {
              const intensity = Math.abs(cell.covariance) / (maxVal || 1);
              const isPositive = cell.covariance > 0;
              return (
                <div
                  key={j}
                  className="w-12 h-8 flex items-center justify-center text-xs"
                  style={{
                    backgroundColor: isPositive 
                      ? `rgba(239, 68, 68, ${intensity * 0.6})`  // 红色正相关
                      : `rgba(34, 211, 238, ${intensity * 0.6})`, // 青色负相关
                  }}
                  title={`${players[i]?.playerName} - ${players[j]?.playerName}: ${cell.correlation.toFixed(2)}`}
                >
                  {cell.correlation.toFixed(1)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500/60"></div>
          <span>正相关 (同涨同跌)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-cyan-400/60"></div>
          <span>负相关 (对冲)</span>
        </div>
      </div>
    </div>
  );
}

// 有效前沿图表
function EfficientFrontierChart({ frontier }: { frontier: EfficientFrontierPoint[] }) {
  const maxReturn = Math.max(...frontier.map(p => p.expectedReturn));
  const maxVol = Math.max(...frontier.map(p => p.volatility));
  
  return (
    <div className="relative h-64 bg-zinc-900 rounded-xl p-4">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* 坐标轴 */}
        <line x1="10" y1="90" x2="95" y2="90" stroke="#52525b" strokeWidth="0.5" />
        <line x1="10" y1="90" x2="10" y2="5" stroke="#52525b" strokeWidth="0.5" />
        
        {/* 标签 */}
        <text x="50" y="98" textAnchor="middle" fill="#71717a" fontSize="4">波动率 σ</text>
        <text x="5" y="50" textAnchor="middle" fill="#71717a" fontSize="4" transform="rotate(-90, 5, 50)">预期收益</text>
        
        {/* 数据点 */}
        {frontier.map((p, i) => {
          const x = 10 + (p.volatility / (maxVol || 1)) * 80;
          const y = 90 - (p.expectedReturn / (maxReturn || 1)) * 80;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2"
              fill={p.sharpeRatio > 1.5 ? '#f59e0b' : p.sharpeRatio > 1 ? '#22d3ee' : '#71717a'}
              opacity="0.8"
            />
          );
        })}
        
        {/* 前沿线 */}
        <path
          d={`M ${frontier.map((p, i) => {
            const x = 10 + (p.volatility / (maxVol || 1)) * 80;
            const y = 90 - (p.expectedReturn / (maxReturn || 1)) * 80;
            return `${i === 0 ? '' : 'L '}${x} ${y}`;
          }).join(' ')}`}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="0.5"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}

export default function PortfolioPage() {
  const [data, setData] = useState<{ roster: PlayerSeasonData[]; gameResults: GameResult[] } | null>(null);
  const [covarianceMatrix, setCovarianceMatrix] = useState<any[][] | null>(null);
  const [optimalLineup, setOptimalLineup] = useState<any>(null);
  const [hedgingAnalysis, setHedgingAnalysis] = useState<any>(null);
  const [backtestSummary, setBacktestSummary] = useState<BacktestSummary | null>(null);
  const [abTestResult, setAbTestResult] = useState<any>(null);
  const [frontier, setFrontier] = useState<EfficientFrontierPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { roster, gameResults } = generateMockData();
    setData({ roster, gameResults });
    
    // 计算协方差矩阵
    const matrix = buildCovarianceMatrix(roster);
    setCovarianceMatrix(matrix);
    
    // 最优阵容
    const optimal = findOptimalLineup(roster, matrix, { riskTolerance: 'balanced' });
    setOptimalLineup(optimal);
    
    // 对冲分析
    const hedging = analyzeHedgingOpportunities(roster, matrix);
    setHedgingAnalysis(hedging);
    
    // 回测
    const backtest = runWalkForwardBacktest(roster, gameResults, {
      lookbackGames: 8,
      testGames: 5,
    });
    setBacktestSummary(backtest);
    
    // A/B测试
    const modelGames = gameResults.filter((_, i) => i % 2 === 0);
    const coachGames = gameResults.filter((_, i) => i % 2 === 1);
    const abTest = runABTest(modelGames, coachGames, '模型策略', '教练决策');
    setAbTestResult(abTest);
    
    // 生成有效前沿 (简化版)
    const { generateEfficientFrontier } = require('@/lib/analytics/portfolio-optimization');
    const ef = generateEfficientFrontier(roster, matrix, 500);
    setFrontier(ef);
    
    setLoading(false);
  }, []);

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-zinc-400">正在运行量化分析...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 头部 */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">投资组合优化与回测</h1>
          <p className="text-zinc-500">现代投资组合理论 (Markowitz) 在排球阵容优化中的应用</p>
        </div>

        {/* 核心公式展示 */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 rounded-2xl p-6 border border-zinc-800">
          <p className="text-zinc-400 text-sm mb-4">阵容波动率公式</p>
          <div className="text-center font-mono text-lg text-cyan-400">
            σ²<sub>p</sub> = Σ<sub>i</sub> Σ<sub>j</sub> w<sub>i</sub> · w<sub>j</sub> · Cov(R<sub>i</sub>, R<sub>j</sub>)
          </div>
          <p className="text-zinc-500 text-sm mt-4 text-center">
            通过球员间的协方差矩阵，找到风险调整后收益最高的6人组合
          </p>
        </div>

        {/* 协方差矩阵 */}
        {covarianceMatrix && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <h2 className="text-xl font-bold text-white mb-4">球员表现协方差矩阵</h2>
            <CovarianceHeatmap matrix={covarianceMatrix} players={data.roster} />
          </div>
        )}

        {/* 有效前沿 */}
        {frontier.length > 0 && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <h2 className="text-xl font-bold text-white mb-4">有效阵容前沿</h2>
            <EfficientFrontierChart frontier={frontier} />
            <p className="text-zinc-500 text-sm mt-4">
              每个点代表一种6人阵容组合，橙色为夏普比率&gt;1.5的最优解
            </p>
          </div>
        )}

        {/* 最优阵容 */}
        {optimalLineup && (
          <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl p-6 border border-cyan-500/30">
            <h2 className="text-xl font-bold text-white mb-4">模型推荐最优阵容</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {optimalLineup.players.map((pid: string, i: number) => {
                const player = data.roster.find(p => p.playerId === pid);
                return (
                  <div key={pid} className="bg-zinc-800/50 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-semibold">{player?.playerName}</span>
                      <span className="text-xs text-zinc-500">{(optimalLineup.weights[i] * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-zinc-400 text-sm">{player?.position}</p>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center">
                <p className="text-zinc-400 text-sm">组合夏普比率</p>
                <p className="text-2xl font-bold text-cyan-400">{optimalLineup.sharpeRatio.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-zinc-400 text-sm">组合波动率</p>
                <p className="text-2xl font-bold text-white">{optimalLineup.volatility.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-zinc-400 text-sm">分散化比率</p>
                <p className="text-2xl font-bold text-white">{optimalLineup.diversificationRatio.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* 对冲分析 */}
        {hedgingAnalysis && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <h2 className="text-xl font-bold text-white mb-4">对冲分析</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-zinc-400 text-sm mb-3">最佳对冲组合 (负相关)</p>
                {hedgingAnalysis.bestHedges.slice(0, 3).map((h: any, i: number) => {
                  const p1 = data.roster.find(p => p.playerId === h.pair[0])?.playerName;
                  const p2 = data.roster.find(p => p.playerId === h.pair[1])?.playerName;
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm mb-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span className="text-white">{p1} + {p2}</span>
                      <span className="text-cyan-400">({h.correlation.toFixed(2)})</span>
                    </div>
                  );
                })}
              </div>
              <div>
                <p className="text-zinc-400 text-sm mb-3">高风险组合 (高度正相关)</p>
                {hedgingAnalysis.worstPairs.slice(0, 3).map((h: any, i: number) => {
                  const p1 = data.roster.find(p => p.playerId === h.pair[0])?.playerName;
                  const p2 = data.roster.find(p => p.playerId === h.pair[1])?.playerName;
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm mb-2">
                      <span className="w-2 h-2 rounded-full bg-red-400"></span>
                      <span className="text-white">{p1} + {p2}</span>
                      <span className="text-red-400">({h.correlation.toFixed(2)})</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-zinc-400 text-sm">
                球队分散化评分: 
                <span className={`text-lg font-bold ml-2 ${
                  hedgingAnalysis.diversificationScore > 60 ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {hedgingAnalysis.diversificationScore.toFixed(0)}/100
                </span>
              </p>
            </div>
          </div>
        )}

        {/* 回测结果 */}
        {backtestSummary && (
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <h2 className="text-xl font-bold text-white mb-4">滚动回测结果</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-zinc-800 rounded-xl p-4 text-center">
                <p className="text-zinc-400 text-sm">测试场数</p>
                <p className="text-2xl font-bold text-white">{backtestSummary.totalTests}</p>
              </div>
              <div className="bg-zinc-800 rounded-xl p-4 text-center">
                <p className="text-zinc-400 text-sm">模型准确率</p>
                <p className={`text-2xl font-bold ${backtestSummary.modelAccuracy > 0.6 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {(backtestSummary.modelAccuracy * 100).toFixed(0)}%
                </p>
              </div>
              <div className="bg-zinc-800 rounded-xl p-4 text-center">
                <p className="text-zinc-400 text-sm">夏普提升</p>
                <p className={`text-2xl font-bold ${backtestSummary.sharpeImprovement > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {backtestSummary.sharpeImprovement > 0 ? '+' : ''}{backtestSummary.sharpeImprovement.toFixed(1)}%
                </p>
              </div>
              <div className="bg-zinc-800 rounded-xl p-4 text-center">
                <p className="text-zinc-400 text-sm">质量优势</p>
                <p className={`text-2xl font-bold ${backtestSummary.modelLineupAdvantage > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {backtestSummary.modelLineupAdvantage > 0 ? '+' : ''}{backtestSummary.modelLineupAdvantage.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-zinc-400 text-sm">关键发现：</p>
              {backtestSummary.keyFindings.map((finding, i) => (
                <p key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                  <span className="text-cyan-400 mt-1">•</span>
                  {finding}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* A/B 测试 */}
        {abTestResult && (
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl p-6 border border-amber-500/30">
            <h2 className="text-xl font-bold text-white mb-4">A/B 测试: 模型 vs 教练</h2>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <p className="text-cyan-400 font-semibold">{abTestResult.strategyA.name}</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {abTestResult.strategyA.wins} <span className="text-zinc-500">/</span> {abTestResult.strategyA.losses}
                </p>
                <p className="text-zinc-400 text-sm mt-1">
                  平均分差: {abTestResult.strategyA.avgPointDiff > 0 ? '+' : ''}{abTestResult.strategyA.avgPointDiff.toFixed(1)}
                </p>
              </div>
              <div className="bg-zinc-800/50 rounded-xl p-4">
                <p className="text-zinc-400 font-semibold">{abTestResult.strategyB.name}</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {abTestResult.strategyB.wins} <span className="text-zinc-500">/</span> {abTestResult.strategyB.losses}
                </p>
                <p className="text-zinc-400 text-sm mt-1">
                  平均分差: {abTestResult.strategyB.avgPointDiff > 0 ? '+' : ''}{abTestResult.strategyB.avgPointDiff.toFixed(1)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">统计置信度</p>
                <p className={`text-xl font-bold ${abTestResult.confidence > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {abTestResult.confidence.toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-zinc-400 text-sm">P值</p>
                <p className="text-xl font-bold text-white">{abTestResult.pValue.toFixed(3)}</p>
              </div>
            </div>
            <p className="text-zinc-300 mt-4 text-sm bg-black/20 p-3 rounded-lg">
              {abTestResult.recommendation}
            </p>
          </div>
        )}

        {/* AHA Moment */}
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-2xl p-6 border border-green-500/30">
          <h2 className="text-xl font-bold text-white mb-4">💡 AHA Moment</h2>
          {backtestSummary && backtestSummary.sharpeImprovement > 5 ? (
            <div className="space-y-2">
              <p className="text-green-400 font-semibold">
                ✅ 验证成功！采用模型的阵容优化策略，关键局胜率有望提升 {backtestSummary.sharpeImprovement.toFixed(1)}%！
              </p>
              <p className="text-zinc-400 text-sm">
                通过协方差矩阵识别出的对冲组合，能够有效降低阵容整体波动率，
                在关键局提供更稳定的表现。
              </p>
            </div>
          ) : (
            <p className="text-yellow-400">
              ⚠️ 模型表现尚可，建议继续收集更多比赛数据以提升回测置信度。
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
