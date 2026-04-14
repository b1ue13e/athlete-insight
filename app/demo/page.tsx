/**
 * Demo 体验页面
 * 
 * 三层功能展示：
 * 1. 史诗级比赛故事线 (破冰)
 * 2. OCR + Excel 导入 (降低摩擦)
 * 3. H2H 球员对比 (社交货币)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Camera, FileSpreadsheet, Swords, ChevronRight, Sparkles } from 'lucide-react';
import { RosterOCR, OCRPlayer } from '@/components/import/roster-ocr';
import { ExcelDropzone } from '@/components/import/excel-dropzone';
import { HeadToHeadDashboard } from '@/components/compare/head-to-head';
import { 
  EPIC_VOLLEYBALL_STORY, 
  EPIC_VOLLEYBALL_GAME,
  EPIC_RUNNER_STORY,
  DEMO_GUIDE_STEPS,
} from '@/lib/demo/epic-game-data';

// 模拟球员数据
const MOCK_PLAYERS = [
  {
    id: 'p1',
    name: '李强',
    number: '8',
    position: '主攻手',
    stats: { attack: 88, block: 65, serve: 72, defense: 75, set: 45, receive: 82 },
    overall: 82,
    tier: 'ELITE' as const,
  },
  {
    id: 'p2',
    name: '王浩',
    number: '12',
    position: '接应',
    stats: { attack: 75, block: 80, serve: 90, defense: 60, set: 40, receive: 55 },
    overall: 78,
    tier: 'ELITE' as const,
  },
  {
    id: 'p3',
    name: '张磊',
    number: '6',
    position: '接应',
    stats: { attack: 82, block: 55, serve: 68, defense: 70, set: 50, receive: 65 },
    overall: 75,
    tier: 'RARE' as const,
  },
];

export default function DemoPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'story' | 'import' | 'compare'>('story');
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [showH2H, setShowH2H] = useState(false);
  const [importedPlayers, setImportedPlayers] = useState<OCRPlayer[]>([]);

  const handlePlayerToggle = (id: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(id)) {
        return prev.filter(p => p !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const getSelectedPlayerData = () => {
    return MOCK_PLAYERS.filter(p => selectedPlayers.includes(p.id));
  };

  if (showH2H && selectedPlayers.length === 2) {
    const [playerA, playerB] = getSelectedPlayerData();
    return (
      <HeadToHeadDashboard 
        playerA={playerA} 
        playerB={playerB}
        onBack={() => setShowH2H(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* 英雄区 */}
      <div className="bg-gradient-to-b from-cyan-500/10 to-transparent py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-full text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            无需注册，一键体验
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            体验运动员洞察的力量
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            基于真实比赛数据的 AI 分析系统，让每一滴汗水都有数据支撑
          </p>
        </div>
      </div>

      {/* 导航标签 */}
      <div className="max-w-6xl mx-auto px-4 mb-8">
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { id: 'story', label: '🏆 史诗逆转', icon: Play },
            { id: 'import', label: '📸 快速录入', icon: Camera },
            { id: 'compare', label: '⚔️ 球员对决', icon: Swords },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {activeTab === 'story' && (
          <div className="space-y-8">
            {/* 故事卡片 */}
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-950 rounded-2xl p-8 border border-zinc-800">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">🏐</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-2">{EPIC_VOLLEYBALL_STORY.title}</h2>
                  <p className="text-cyan-400 mb-4">{EPIC_VOLLEYBALL_STORY.subtitle}</p>
                  <p className="text-zinc-400 leading-relaxed mb-4">{EPIC_VOLLEYBALL_STORY.background}</p>
                  
                  <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
                    <p className="text-amber-400 font-medium mb-2">🔥 转折点</p>
                    <p className="text-zinc-300 text-sm">{EPIC_VOLLEYBALL_STORY.turningPoint}</p>
                  </div>
                  
                  <p className="text-zinc-400 leading-relaxed mb-4">{EPIC_VOLLEYBALL_STORY.outcome}</p>
                  
                  <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                    <p className="text-cyan-400 font-medium mb-2">💡 AI 洞察</p>
                    <p className="text-zinc-300 text-sm">{EPIC_VOLLEYBALL_STORY.keyInsight}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 数据亮点 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 text-center">
                <p className="text-4xl font-bold text-cyan-400 mb-2">-0.42</p>
                <p className="text-zinc-400">王浩-李强相关系数</p>
                <p className="text-zinc-500 text-sm mt-1">完美对冲组合</p>
              </div>
              <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 text-center">
                <p className="text-4xl font-bold text-amber-400 mb-2">4</p>
                <p className="text-zinc-400">王浩发球直接得分</p>
                <p className="text-zinc-500 text-sm mt-1">上场仅45分钟</p>
              </div>
              <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 text-center">
                <p className="text-4xl font-bold text-green-400 mb-2">3-2</p>
                <p className="text-zinc-400">最终比分</p>
                <p className="text-zinc-500 text-sm mt-1">0-2落后逆转夺冠</p>
              </div>
            </div>

            <div className="text-center">
              <button 
                onClick={() => router.push('/share/player-card')}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2"
              >
                查看完整分析报告
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'import' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <RosterOCR onPlayersDetected={setImportedPlayers} />
            <ExcelDropzone onDataImported={(data) => console.log('Imported:', data)} />
            
            {importedPlayers.length > 0 && (
              <div className="md:col-span-2 bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
                <h3 className="text-lg font-semibold text-white mb-4">已导入球员</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {importedPlayers.map((player, i) => (
                    <div key={i} className="bg-zinc-800 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                          {player.number}
                        </div>
                        <div>
                          <p className="text-white font-medium">{player.name}</p>
                          <p className="text-zinc-500 text-sm">{player.position}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="space-y-8">
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-4">选择两名球员进行对决</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MOCK_PLAYERS.map(player => (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerToggle(player.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedPlayers.includes(player.id)
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                        selectedPlayers.includes(player.id)
                          ? 'bg-cyan-500 text-white'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {player.name[0]}
                      </div>
                      <div>
                        <p className="text-white font-semibold">{player.name}</p>
                        <p className="text-zinc-400 text-sm">{player.position} · #{player.number}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-2xl font-bold text-white">{player.overall}</span>
                      {selectedPlayers.includes(player.id) && (
                        <span className="text-cyan-400 text-sm">已选择</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {selectedPlayers.length === 2 && (
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowH2H(true)}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-2"
                  >
                    <Swords className="w-5 h-5" />
                    开始对决
                  </button>
                </div>
              )}
            </div>

            {/* 说明卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  重叠雷达图
                </h4>
                <p className="text-zinc-400 text-sm">
                  一红一蓝两张网叠在一起，重叠区域越大说明能力分布越相似，差异明显的维度是决策关键。
                </p>
              </div>
              <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span className="text-2xl">📈</span>
                  能力极值条
                </h4>
                <p className="text-zinc-400 text-sm">
                  中间是零轴，张三的优势向左伸展，李四的优势向右伸展，差距一目了然。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 底部 CTA */}
      <div className="border-t border-zinc-800 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">准备好开始了吗？</h2>
          <p className="text-zinc-400 mb-6">注册账号，导入你的第一场比赛数据</p>
          <div className="flex justify-center gap-4">
            <button className="px-8 py-3 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 transition-colors">
              免费注册
            </button>
            <button 
              onClick={() => router.push('/analytics/portfolio')}
              className="px-8 py-3 bg-zinc-800 text-white rounded-xl font-semibold hover:bg-zinc-700 transition-colors"
            >
              查看投资组合分析
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
