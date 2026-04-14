/**
 * 第三层：雷达对冲面板 (Head-to-Head Dashboard)
 * 
 * 交互设计：勾选两个球员，进入对比视图
 * 视觉呈现：重叠雷达图 + 能力极值条
 * 
 * 情绪价值：球员会截图发给队友互喷，
 * 教练会用来做首发决定的残酷证据。
 */

'use client';

import { useState, useMemo } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { Swords, ChevronLeft, Trophy, TrendingUp, TrendingDown } from 'lucide-react';

interface PlayerData {
  id: string;
  name: string;
  number: string;
  position: string;
  avatar?: string;
  stats: {
    attack: number;
    block: number;
    serve: number;
    defense: number;
    set: number;
    receive: number;
  };
  overall: number;
  tier: 'LEGENDARY' | 'ELITE' | 'RARE' | 'COMMON';
}

interface HeadToHeadProps {
  playerA: PlayerData;
  playerB: PlayerData;
  onBack?: () => void;
}

// 计算能力差异
function calculateStatDiff(a: number, b: number): { diff: number; winner: 'A' | 'B' | 'tie' } {
  const diff = a - b;
  if (Math.abs(diff) < 2) return { diff: 0, winner: 'tie' };
  return { diff: Math.abs(diff), winner: diff > 0 ? 'A' : 'B' };
}

// 能力极值条组件
function DivergingBar({ 
  label, 
  valueA, 
  valueB, 
  max = 100 
}: { 
  label: string; 
  valueA: number; 
  valueB: number; 
  max?: number;
}) {
  const diff = calculateStatDiff(valueA, valueB);
  const percentageA = (valueA / max) * 50;
  const percentageB = (valueB / max) * 50;
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-cyan-400 font-medium">{valueA}</span>
        <span className="text-zinc-500">{label}</span>
        <span className="text-rose-400 font-medium">{valueB}</span>
      </div>
      <div className="flex items-center h-6 bg-zinc-800 rounded-full overflow-hidden">
        {/* Player A (左侧) */}
        <div className="flex-1 flex justify-end pr-1">
          <div 
            className="h-4 bg-cyan-500 rounded-l-full transition-all duration-500"
            style={{ width: `${percentageA}%` }}
          />
        </div>
        
        {/* 中心线 */}
        <div className="w-px h-full bg-zinc-700" />
        
        {/* Player B (右侧) */}
        <div className="flex-1 flex justify-start pl-1">
          <div 
            className="h-4 bg-rose-500 rounded-r-full transition-all duration-500"
            style={{ width: `${percentageB}%` }}
          />
        </div>
      </div>
      {diff.winner !== 'tie' && (
        <p className="text-xs text-center">
          <span className={diff.winner === 'A' ? 'text-cyan-400' : 'text-rose-400'}>
            {diff.winner === 'A' ? '▲' : '▼'} {diff.diff} 点优势
          </span>
        </p>
      )}
    </div>
  );
}

export function HeadToHeadDashboard({ playerA, playerB, onBack }: HeadToHeadProps) {
  // 雷达图数据
  const radarData = useMemo(() => [
    { subject: '进攻', A: playerA.stats.attack, B: playerB.stats.attack, fullMark: 100 },
    { subject: '拦网', A: playerA.stats.block, B: playerB.stats.block, fullMark: 100 },
    { subject: '发球', A: playerA.stats.serve, B: playerB.stats.serve, fullMark: 100 },
    { subject: '防守', A: playerA.stats.defense, B: playerB.stats.defense, fullMark: 100 },
    { subject: '传球', A: playerA.stats.set, B: playerB.stats.set, fullMark: 100 },
    { subject: '接发', A: playerA.stats.receive, B: playerB.stats.receive, fullMark: 100 },
  ], [playerA, playerB]);

  // 计算胜负统计
  const stats = useMemo(() => {
    let aWins = 0;
    let bWins = 0;
    let ties = 0;
    
    Object.entries(playerA.stats).forEach(([key, valA]) => {
      const valB = playerB.stats[key as keyof typeof playerB.stats];
      const result = calculateStatDiff(valA, valB);
      if (result.winner === 'A') aWins++;
      else if (result.winner === 'B') bWins++;
      else ties++;
    });
    
    return { aWins, bWins, ties };
  }, [playerA, playerB]);

  const overallWinner = playerA.overall > playerB.overall ? 'A' : 'B';
  const overallDiff = Math.abs(playerA.overall - playerB.overall);

  return (
    <div className="min-h-screen bg-zinc-950 py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* 头部导航 */}
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-zinc-400" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Swords className="w-7 h-7 text-cyan-400" />
            球员对决
          </h1>
        </div>

        {/* 选手卡片 */}
        <div className="grid grid-cols-3 gap-6">
          {/* Player A */}
          <div className={`bg-zinc-900 rounded-2xl p-6 border-2 ${
            overallWinner === 'A' ? 'border-cyan-500/50' : 'border-zinc-800'
          }`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                {playerA.name[0]}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{playerA.name}</h3>
                <p className="text-zinc-400">{playerA.position} · #{playerA.number}</p>
              </div>
            </div>
            <div className="text-center py-4">
              <span className={`text-5xl font-black ${
                overallWinner === 'A' ? 'text-cyan-400' : 'text-zinc-500'
              }`}>
                {playerA.overall}
              </span>
              <p className="text-zinc-500 text-sm mt-1">综合评分</p>
            </div>
            {overallWinner === 'A' && (
              <div className="flex items-center justify-center gap-2 text-cyan-400 bg-cyan-500/10 rounded-lg py-2">
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium">胜出 +{overallDiff}</span>
              </div>
            )}
          </div>

          {/* VS 标识 */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
              <span className="text-3xl font-black text-zinc-500">VS</span>
            </div>
            <div className="text-center">
              <p className="text-zinc-400 text-sm">胜负统计</p>
              <p className="text-2xl font-bold text-white mt-1">
                <span className="text-cyan-400">{stats.aWins}</span>
                <span className="text-zinc-600 mx-2">-</span>
                <span className="text-rose-400">{stats.bWins}</span>
              </p>
              <p className="text-zinc-500 text-xs mt-1">{stats.ties} 项持平</p>
            </div>
          </div>

          {/* Player B */}
          <div className={`bg-zinc-900 rounded-2xl p-6 border-2 ${
            overallWinner === 'B' ? 'border-rose-500/50' : 'border-zinc-800'
          }`}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-orange-600 flex items-center justify-center text-white text-2xl font-bold">
                {playerB.name[0]}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{playerB.name}</h3>
                <p className="text-zinc-400">{playerB.position} · #{playerB.number}</p>
              </div>
            </div>
            <div className="text-center py-4">
              <span className={`text-5xl font-black ${
                overallWinner === 'B' ? 'text-rose-400' : 'text-zinc-500'
              }`}>
                {playerB.overall}
              </span>
              <p className="text-zinc-500 text-sm mt-1">综合评分</p>
            </div>
            {overallWinner === 'B' && (
              <div className="flex items-center justify-center gap-2 text-rose-400 bg-rose-500/10 rounded-lg py-2">
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium">胜出 +{overallDiff}</span>
              </div>
            )}
          </div>
        </div>

        {/* 雷达图对比 */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-6">能力雷达对比</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#27272a" />
                  <PolarAngleAxis tick={{ fill: '#71717a', fontSize: 12 }} />
                  <Radar
                    name={playerA.name}
                    dataKey="A"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fill="#06b6d4"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name={playerB.name}
                    dataKey="B"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fill="#f43f5e"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            {/* 图例说明 */}
            <div className="flex flex-col justify-center space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-cyan-500" />
                <span className="text-white">{playerA.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-rose-500" />
                <span className="text-white">{playerB.name}</span>
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <p className="text-zinc-400 text-sm">💡 解读：</p>
                <p className="text-zinc-500 text-sm mt-1">
                  重叠区域越大，说明两名球员能力分布越相似。
                  差异明显的维度是决策关键。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 能力极值条 */}
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-6">能力极值对比</h3>
          <div className="space-y-6 max-w-2xl mx-auto">
            <DivergingBar 
              label="进攻能力" 
              valueA={playerA.stats.attack} 
              valueB={playerB.stats.attack} 
            />
            <DivergingBar 
              label="拦网能力" 
              valueA={playerA.stats.block} 
              valueB={playerB.stats.block} 
            />
            <DivergingBar 
              label="发球能力" 
              valueA={playerA.stats.serve} 
              valueB={playerB.stats.serve} 
            />
            <DivergingBar 
              label="防守能力" 
              valueA={playerA.stats.defense} 
              valueB={playerB.stats.defense} 
            />
            <DivergingBar 
              label="传球能力" 
              valueA={playerA.stats.set} 
              valueB={playerB.stats.set} 
            />
            <DivergingBar 
              label="接发能力" 
              valueA={playerA.stats.receive} 
              valueB={playerB.stats.receive} 
            />
          </div>
        </div>

        {/* AI 分析结论 */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 rounded-2xl p-6 border border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-4">AI 分析结论</h3>
          <div className="space-y-3">
            {stats.aWins > stats.bWins ? (
              <p className="text-zinc-300">
                <span className="text-cyan-400 font-semibold">{playerA.name}</span> 在 
                {Object.entries(playerA.stats)
                  .filter(([key, val]) => val > (playerB.stats[key as keyof typeof playerB.stats] || 0) + 2)
                  .slice(0, 3)
                  .map(([key]) => key === 'attack' ? '进攻' : key === 'block' ? '拦网' : key === 'serve' ? '发球' : key === 'defense' ? '防守' : key === 'set' ? '传球' : '接发')
                  .join('、')} 
                方面具有明显优势，适合作为主攻点使用。
              </p>
            ) : stats.bWins > stats.aWins ? (
              <p className="text-zinc-300">
                <span className="text-rose-400 font-semibold">{playerB.name}</span> 在 
                {Object.entries(playerB.stats)
                  .filter(([key, val]) => val > (playerA.stats[key as keyof typeof playerA.stats] || 0) + 2)
                  .slice(0, 3)
                  .map(([key]) => key === 'attack' ? '进攻' : key === 'block' ? '拦网' : key === 'serve' ? '发球' : key === 'defense' ? '防守' : key === 'set' ? '传球' : '接发')
                  .join('、')} 
                方面具有明显优势，适合作为主攻点使用。
              </p>
            ) : (
              <p className="text-zinc-300">
                两名球员能力分布非常接近，可根据对手特点灵活选择。
              </p>
            )}
            
            <p className="text-zinc-500 text-sm mt-4">
              💡 提示：截图分享给队友，或作为首发决策的参考依据。
            </p>
          </div>
        </div>

        {/* 分享按钮 */}
        <div className="flex justify-center gap-4">
          <button className="px-6 py-3 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            生成对比卡片
          </button>
          <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
            <Swords className="w-4 h-4" />
            换一组对比
          </button>
        </div>
      </div>
    </div>
  );
}
