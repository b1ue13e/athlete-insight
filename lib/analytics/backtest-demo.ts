/**
 * 回测引擎演示
 * 
 * 模拟一个完整的回测流程：
 * 1. 创建虚拟球队数据 (12名球员，20场比赛)
 * 2. 执行滚动回测
 * 3. 输出回测报告
 * 4. 验证 AHA Moment
 */

import { PlayerSeasonData, VolleyballStats } from './athletic-sharpe-ratio';
import { GameResult, runWalkForwardBacktest, runABTest, generateBacktestReport } from './backtesting-engine';
import { analyzeHedgingOpportunities, buildCovarianceMatrix, findOptimalLineup } from './portfolio-optimization';

// 生成随机比赛数据
function generateRandomStats(): VolleyballStats {
  return {
    attackKills: Math.floor(Math.random() * 15) + 5,
    attackErrors: Math.floor(Math.random() * 5),
    attackAttempts: Math.floor(Math.random() * 25) + 15,
    blocks: Math.floor(Math.random() * 4),
    blockErrors: Math.floor(Math.random() * 2),
    digs: Math.floor(Math.random() * 12) + 3,
    receptionErrors: Math.floor(Math.random() * 3),
    aces: Math.floor(Math.random() * 3),
    serviceErrors: Math.floor(Math.random() * 3),
    assists: Math.floor(Math.random() * 20) + 10,
    settingErrors: Math.floor(Math.random() * 3),
  };
}

// 生成球员数据
function generateMockRoster(): PlayerSeasonData[] {
  const positions = ['setter', 'outside', 'opposite', 'middle', 'libero'] as const;
  const names = [
    ['张明', '李强', '王伟', '刘洋'],
    ['陈杰', '杨帆', '黄磊', '周鹏'],
    ['吴昊', '徐飞', '孙涛', '马超'],
    ['朱军', '胡斌', '郭亮', '何伟'],
    ['林峰', '郑凯', '谢宇', '韩冰'],
  ];
  
  const roster: PlayerSeasonData[] = [];
  let nameIdx = 0;
  
  positions.forEach((pos, posIdx) => {
    const count = pos === 'outside' || pos === 'middle' ? 3 : pos === 'setter' || pos === 'libero' ? 2 : 2;
    
    for (let i = 0; i < count; i++) {
      const playerGames = [];
      
      // 生成 20 场比赛数据
      for (let g = 0; g < 20; g++) {
        // 为每个球员创建"性格"特征
        // 有些球员稳定，有些波动大，有些慢热
        const basePerformance = Math.random();
        const volatility = Math.random() * 0.5 + 0.2;
        const form = Math.sin(g / 5) * volatility + basePerformance;
        
        playerGames.push({
          gameId: `game_${g + 1}`,
          date: `2024-${String(Math.floor(g / 4) + 1).padStart(2, '0')}-${String((g % 4) * 7 + 1).padStart(2, '0')}`,
          stats: generateRandomStats(),
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
  
  return roster;
}

// 生成比赛结果
function generateMockGameResults(roster: PlayerSeasonData[]): GameResult[] {
  const results: GameResult[] = [];
  
  for (let g = 0; g < 20; g++) {
    const gameId = `game_${g + 1}`;
    
    // 模拟教练的排兵布阵 (随机但有偏好)
    const shuffled = [...roster].sort(() => Math.random() - 0.5);
    const startingLineup = shuffled.slice(0, 6).map(p => p.playerId);
    
    // 模拟比赛结果 (简化：阵容质量越高，胜率越高)
    const avgQuality = startingLineup.reduce((sum, pid) => {
      const p = roster.find(x => x.playerId === pid);
      if (!p) return sum;
      const game = p.games.find(x => x.gameId === gameId);
      return sum + (game ? 1 : 0);
    }, 0) / 6;
    
    const isWin = Math.random() < (0.4 + avgQuality * 0.2);
    
    results.push({
      gameId,
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
  
  return results;
}

/**
 * 运行完整演示
 */
export function runBacktestDemo() {
  console.log('🏐 排球阵容优化回测演示\n');
  console.log('='.repeat(60));
  
  // 1. 生成数据
  console.log('\n📊 生成模拟数据...');
  const roster = generateMockRoster();
  const gameResults = generateMockGameResults(roster);
  console.log(`   - 球员数量: ${roster.length}`);
  console.log(`   - 比赛场数: ${gameResults.length}`);
  
  // 2. 协方差矩阵分析
  console.log('\n📈 构建协方差矩阵...');
  const covarianceMatrix = buildCovarianceMatrix(roster);
  
  // 3. 对冲分析
  console.log('\n🔍 分析球员对冲关系...');
  const hedgingAnalysis = analyzeHedgingOpportunities(roster, covarianceMatrix);
  console.log(`   - 分散化评分: ${hedgingAnalysis.diversificationScore.toFixed(1)}/100`);
  
  if (hedgingAnalysis.bestHedges.length > 0) {
    console.log('   - 最佳对冲组合:');
    hedgingAnalysis.bestHedges.slice(0, 3).forEach(h => {
      const p1 = roster.find(p => p.playerId === h.pair[0])?.playerName;
      const p2 = roster.find(p => p.playerId === h.pair[1])?.playerName;
      console.log(`     · ${p1} + ${p2} (相关性: ${h.correlation.toFixed(2)})`);
    });
  }
  
  // 4. 寻找最优阵容
  console.log('\n🎯 寻找最优阵容...');
  const optimalLineup = findOptimalLineup(roster, covarianceMatrix, {
    riskTolerance: 'balanced',
  });
  
  if (optimalLineup) {
    console.log('   - 推荐首发:');
    optimalLineup.players.forEach((pid, i) => {
      const p = roster.find(x => x.playerId === pid);
      console.log(`     ${i + 1}. ${p?.playerName} (${p?.position}) - 权重: ${(optimalLineup.weights[i] * 100).toFixed(0)}%`);
    });
    console.log(`   - 组合夏普比率: ${optimalLineup.sharpeRatio.toFixed(2)}`);
    console.log(`   - 组合波动率: ${optimalLineup.volatility.toFixed(2)}`);
    console.log(`   - 分散化比率: ${optimalLineup.diversificationRatio.toFixed(2)}`);
  }
  
  // 5. 执行回测
  console.log('\n🔄 执行滚动回测...');
  const backtestSummary = runWalkForwardBacktest(roster, gameResults, {
    lookbackGames: 8,
    testGames: 5,
  });
  
  // 6. 输出报告
  console.log('\n📋 回测报告');
  console.log('-'.repeat(60));
  console.log(`总测试场数: ${backtestSummary.totalTests}`);
  console.log(`模型预测准确率: ${(backtestSummary.modelAccuracy * 100).toFixed(1)}%`);
  console.log(`实际胜率: ${(backtestSummary.actualWinRate * 100).toFixed(1)}%`);
  console.log(`模型阵容质量优势: ${backtestSummary.modelLineupAdvantage.toFixed(2)}`);
  console.log(`夏普比率平均提升: ${backtestSummary.sharpeImprovement.toFixed(1)}%`);
  
  console.log('\n关键发现:');
  backtestSummary.keyFindings.forEach(finding => {
    console.log(`  ✓ ${finding}`);
  });
  
  // 7. A/B 测试 (模拟)
  console.log('\n🧪 A/B 测试 (模型 vs 教练决策)');
  const modelStrategyGames = gameResults.filter((_, i) => i % 2 === 0);
  const coachStrategyGames = gameResults.filter((_, i) => i % 2 === 1);
  
  const abTest = runABTest(modelStrategyGames, coachStrategyGames, '模型策略', '教练决策');
  
  console.log(`模型策略: ${abTest.strategyA.wins}胜 ${abTest.strategyA.losses}负, 平均分差 ${abTest.strategyA.avgPointDiff.toFixed(1)}`);
  console.log(`教练决策: ${abTest.strategyB.wins}胜 ${abTest.strategyB.losses}负, 平均分差 ${abTest.strategyB.avgPointDiff.toFixed(1)}`);
  console.log(`置信度: ${abTest.confidence.toFixed(1)}%`);
  console.log(`结论: ${abTest.recommendation}`);
  
  // 8. AHA Moment
  console.log('\n💡 AHA Moment');
  console.log('='.repeat(60));
  
  if (backtestSummary.sharpeImprovement > 10) {
    console.log(`🎉 验证成功！采用模型的 HIGH_BETA 换人策略，`);
    console.log(`   关键局胜率提升了 ${backtestSummary.sharpeImprovement.toFixed(1)}%！`);
    console.log(`   这个系统通过了回测验证，可以封神了！`);
  } else {
    console.log(`⚠️ 模型有一定提升 (${backtestSummary.sharpeImprovement.toFixed(1)}%)，`);
    console.log(`   建议继续收集数据优化参数。`);
  }
  
  console.log('\n' + '='.repeat(60));
  
  return {
    roster,
    gameResults,
    covarianceMatrix,
    hedgingAnalysis,
    optimalLineup,
    backtestSummary,
    abTest,
  };
}

// 如果直接运行此文件
if (require.main === module) {
  runBacktestDemo();
}
