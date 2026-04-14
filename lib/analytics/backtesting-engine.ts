/**
 * 第二层：量化回测引擎 (Backtesting Framework)
 * 
 * 在金融领域，没有经过历史数据回测的指标就是耍流氓。
 * 
 * 回测逻辑闭环：
 * 1. 用前 N 场比赛的数据，计算协方差矩阵和夏普比率
 * 2. 根据模型，生成第 N+1 场比赛的"理论最优首发阵容"
 * 3. 对比第 N+1 场比赛的真实赛果和教练的实际排兵布阵
 * 
 * AHA Moment:
 * 如果你能证明"当教练使用了你的 HIGH_BETA 换人策略时，关键局胜率提升了 15%"，
 * 这个系统就彻底封神了。
 */

import { 
  PlayerSeasonData, 
  calculateAthleticSharpeRatio,
  LineupOptimization,
  optimizeLineup 
} from './athletic-sharpe-ratio';
import { 
  buildCovarianceMatrix, 
  findOptimalLineup,
  calculateLineupMetrics,
  LineupMetrics,
  EfficientFrontierPoint,
  CovarianceCell,
} from './portfolio-optimization';

// 比赛结果数据
export interface GameResult {
  gameId: string;
  date: string;
  opponent: string;
  isWin: boolean;
  setsWon: number;
  setsLost: number;
  totalPointsScored: number;
  totalPointsConceded: number;
  startingLineup: string[];      // 球员ID列表
  keyMomentLineup?: string[];    // 关键局阵容 (23-23, 24-24等)
  playerStats: Record<string, {
    xP: number;
    minutesPlayed: number;
  }>;
}

// 回测配置
export interface BacktestConfig {
  lookbackGames: number;         // 回看比赛场数
  testGames: number;             // 测试场数
  minSampleSize: number;         // 最小样本量
  walkForward: boolean;          // 是否滚动回测
}

const DEFAULT_BACKTEST_CONFIG: BacktestConfig = {
  lookbackGames: 10,
  testGames: 5,
  minSampleSize: 5,
  walkForward: true,
};

// 单次回测结果
export interface BacktestResult {
  testGameId: string;
  date: string;
  
  // 模型预测
  predictedOptimal: LineupMetrics | null;
  predictedLineup: string[];
  
  // 实际情况
  actualLineup: string[];
  actualResult: GameResult;
  
  // 对比指标
  modelWouldWin: boolean;        // 如果按模型排阵，预测能否获胜
  actualWin: boolean;            // 实际是否获胜
  
  // 阵容质量对比
  predictedLineupQuality: number; // 模型阵容的夏普比率
  actualLineupQuality: number;    // 实际阵容的夏普比率
  
  // 策略建议命中
  suggestedChanges: string[];     // 模型建议的改动
  actualChanges: string[];        // 教练实际做的改动
  overlap: number;                // 建议命中率 (0-1)
}

// 汇总统计
export interface BacktestSummary {
  totalTests: number;
  modelAccuracy: number;          // 模型预测胜率
  actualWinRate: number;          // 实际胜率
  
  // 策略效果
  modelLineupAdvantage: number;   // 模型阵容 vs 实际阵容的质量差
  sharpeImprovement: number;      // 夏普比率平均提升
  
  // 关键发现
  keyFindings: string[];
  
  // 不同场景的表现
  byScenario: {
    criticalGames: { tested: number; modelWins: number; actualWins: number };
    regularGames: { tested: number; modelWins: number; actualWins: number };
  };
}

/**
 * 执行单次回测
 * 用 historyGames 预测 nextGame 的最优阵容
 */
export function runSingleBacktest(
  allPlayers: PlayerSeasonData[],
  historyGames: PlayerSeasonData[], // 每个球员的历史数据
  nextGame: GameResult,
  config: Partial<BacktestConfig> = {}
): BacktestResult {
  const cfg = { ...DEFAULT_BACKTEST_CONFIG, ...config };
  
  // 构建协方差矩阵 (基于历史数据)
  const covarianceMatrix = buildCovarianceMatrix(historyGames);
  
  // 计算每个球员的夏普比率 (基于历史数据)
  const playerMetrics = historyGames.map(p => ({
    player: p,
    metrics: calculateAthleticSharpeRatio(p, historyGames),
  }));
  
  // 生成模型推荐阵容
  const predictedOptimal = findOptimalLineup(historyGames, covarianceMatrix, {
    riskTolerance: 'balanced',
  });
  
  const predictedLineup = predictedOptimal?.players || [];
  
  // 计算实际阵容的质量
  const actualLineupPlayers = allPlayers.filter(p => 
    nextGame.startingLineup.includes(p.playerId)
  );
  
  let actualLineupQuality = 0;
  if (actualLineupPlayers.length > 0) {
    const actualMetrics = calculateLineupMetrics(
      actualLineupPlayers, 
      covarianceMatrix
    );
    actualLineupQuality = actualMetrics.sharpeRatio;
  }
  
  // 对比阵容差异
  const suggestedChanges: string[] = [];
  const actualChanges: string[] = [];
  
  // 找出模型推荐但教练没上的
  predictedLineup.forEach(pid => {
    if (!nextGame.startingLineup.includes(pid)) {
      const player = allPlayers.find(p => p.playerId === pid);
      if (player) {
        suggestedChanges.push(`建议上 ${player.playerName}`);
      }
    }
  });
  
  // 找出教练上了但模型没推荐的
  nextGame.startingLineup.forEach(pid => {
    if (!predictedLineup.includes(pid)) {
      const player = allPlayers.find(p => p.playerId === pid);
      if (player) {
        actualChanges.push(`实际上了 ${player.playerName}`);
      }
    }
  });
  
  // 计算重叠度
  const overlap = predictedLineup.filter(pid => 
    nextGame.startingLineup.includes(pid)
  ).length / 6;
  
  // 简化胜率预测 (基于阵容质量)
  const modelWouldWin = predictedOptimal ? predictedOptimal.sharpeRatio > 1.0 : false;
  
  return {
    testGameId: nextGame.gameId,
    date: nextGame.date,
    predictedOptimal,
    predictedLineup,
    actualLineup: nextGame.startingLineup,
    actualResult: nextGame,
    modelWouldWin,
    actualWin: nextGame.isWin,
    predictedLineupQuality: predictedOptimal?.sharpeRatio || 0,
    actualLineupQuality,
    suggestedChanges,
    actualChanges,
    overlap,
  };
}

/**
 * 执行滚动回测
 * 模拟真实场景：每场比赛后用更新后的数据预测下一场
 */
export function runWalkForwardBacktest(
  allPlayers: PlayerSeasonData[],
  gameResults: GameResult[],
  config: Partial<BacktestConfig> = {}
): BacktestSummary {
  const cfg = { ...DEFAULT_BACKTEST_CONFIG, ...config };
  
  const results: BacktestResult[] = [];
  
  // 按时间排序
  const sortedGames = [...gameResults].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // 滚动窗口回测
  for (let i = cfg.lookbackGames; i < sortedGames.length && results.length < cfg.testGames; i++) {
    const historyGames = sortedGames.slice(i - cfg.lookbackGames, i);
    const nextGame = sortedGames[i];
    
    // 提取球员历史数据 (简化处理：从 allPlayers 中过滤)
    const historyPlayerData = allPlayers.map(p => ({
      ...p,
      games: p.games.filter(g => 
        historyGames.some(hg => hg.gameId === g.gameId)
      ),
    })).filter(p => p.games.length >= cfg.minSampleSize);
    
    if (historyPlayerData.length < 6) continue;
    
    const result = runSingleBacktest(
      allPlayers,
      historyPlayerData,
      nextGame,
      cfg
    );
    
    results.push(result);
  }
  
  return summarizeBacktestResults(results);
}

/**
 * 汇总回测结果
 */
function summarizeBacktestResults(results: BacktestResult[]): BacktestSummary {
  const totalTests = results.length;
  
  if (totalTests === 0) {
    return {
      totalTests: 0,
      modelAccuracy: 0,
      actualWinRate: 0,
      modelLineupAdvantage: 0,
      sharpeImprovement: 0,
      keyFindings: ['数据不足，无法进行回测'],
      byScenario: {
        criticalGames: { tested: 0, modelWins: 0, actualWins: 0 },
        regularGames: { tested: 0, modelWins: 0, actualWins: 0 },
      },
    };
  }
  
  // 基础统计
  const modelCorrect = results.filter(r => r.modelWouldWin === r.actualWin).length;
  const modelAccuracy = modelCorrect / totalTests;
  
  const actualWins = results.filter(r => r.actualWin).length;
  const actualWinRate = actualWins / totalTests;
  
  // 阵容质量对比
  const qualityDiffs = results.map(r => r.predictedLineupQuality - r.actualLineupQuality);
  const modelLineupAdvantage = qualityDiffs.reduce((a, b) => a + b, 0) / totalTests;
  
  const sharpeImprovement = results
    .filter(r => r.predictedLineupQuality > 0 && r.actualLineupQuality > 0)
    .reduce((s, r) => s + (r.predictedLineupQuality - r.actualLineupQuality) / r.actualLineupQuality, 0) 
    / totalTests * 100;
  
  // 场景分析 (简化：假设所有都是常规赛)
  const byScenario = {
    criticalGames: { tested: 0, modelWins: 0, actualWins: 0 },
    regularGames: { 
      tested: totalTests, 
      modelWins: results.filter(r => r.modelWouldWin).length,
      actualWins,
    },
  };
  
  // 关键发现
  const keyFindings: string[] = [];
  
  if (modelLineupAdvantage > 0.2) {
    keyFindings.push(`模型阵容平均质量优于实际阵容 ${(modelLineupAdvantage * 100).toFixed(1)}%`);
  }
  
  if (sharpeImprovement > 10) {
    keyFindings.push(`采用模型建议可提升夏普比率 ${sharpeImprovement.toFixed(1)}%`);
  }
  
  const avgOverlap = results.reduce((s, r) => s + r.overlap, 0) / totalTests;
  if (avgOverlap > 0.8) {
    keyFindings.push(`教练与模型共识度高达 ${(avgOverlap * 100).toFixed(0)}%，基础判断一致`);
  } else if (avgOverlap < 0.5) {
    keyFindings.push(`教练与模型分歧较大 (共识度 ${(avgOverlap * 100).toFixed(0)}%)，建议深入分析`);
  }
  
  // 误判分析
  const falsePositives = results.filter(r => r.modelWouldWin && !r.actualWin).length;
  const falseNegatives = results.filter(r => !r.modelWouldWin && r.actualWin).length;
  
  if (falsePositives > totalTests * 0.3) {
    keyFindings.push('模型存在过度乐观倾向，需调整胜率预测阈值');
  }
  
  if (falseNegatives > totalTests * 0.3) {
    keyFindings.push('模型存在过度悲观倾向，可能低估了某些因素');
  }
  
  return {
    totalTests,
    modelAccuracy,
    actualWinRate,
    modelLineupAdvantage,
    sharpeImprovement,
    keyFindings,
    byScenario,
  };
}

/**
 * A/B 测试框架
 * 比较两种策略的历史表现
 */
export interface ABTestResult {
  strategyA: {
    name: string;
    wins: number;
    losses: number;
    avgPointDiff: number;
  };
  strategyB: {
    name: string;
    wins: number;
    losses: number;
    avgPointDiff: number;
  };
  winner: 'A' | 'B' | 'tie';
  confidence: number;
  pValue: number;
  recommendation: string;
}

export function runABTest(
  gamesWithStrategyA: GameResult[],
  gamesWithStrategyB: GameResult[],
  strategyAName = '模型策略',
  strategyBName = '传统策略'
): ABTestResult {
  // 计算胜率
  const aWins = gamesWithStrategyA.filter(g => g.isWin).length;
  const bWins = gamesWithStrategyB.filter(g => g.isWin).length;
  
  const aWinRate = aWins / gamesWithStrategyA.length;
  const bWinRate = bWins / gamesWithStrategyB.length;
  
  // 计算平均分差
  const aPointDiff = gamesWithStrategyA.reduce(
    (s, g) => s + (g.totalPointsScored - g.totalPointsConceded), 0
  ) / gamesWithStrategyA.length;
  
  const bPointDiff = gamesWithStrategyB.reduce(
    (s, g) => s + (g.totalPointsScored - g.totalPointsConceded), 0
  ) / gamesWithStrategyB.length;
  
  // 简化的显著性检验 (t检验近似)
  const pooledStd = Math.sqrt(
    (aWinRate * (1 - aWinRate) + bWinRate * (1 - bWinRate)) / 2
  );
  const se = pooledStd * Math.sqrt(2 / Math.min(gamesWithStrategyA.length, gamesWithStrategyB.length));
  const tStat = Math.abs(aWinRate - bWinRate) / (se || 0.001);
  
  // p值近似 (简化)
  const pValue = Math.exp(-0.5 * tStat * tStat);
  const confidence = (1 - pValue) * 100;
  
  // 判定胜者
  let winner: ABTestResult['winner'];
  let recommendation: string;
  
  if (pValue < 0.05) {
    if (aWinRate > bWinRate) {
      winner = 'A';
      recommendation = `${strategyAName} 显著优于 ${strategyBName} (p=${pValue.toFixed(3)})，建议全面采用`;
    } else {
      winner = 'B';
      recommendation = `${strategyBName} 表现更好，模型需重新调参`;
    }
  } else {
    winner = 'tie';
    recommendation = `两种策略无显著差异 (p=${pValue.toFixed(3)})，可继续使用当前策略`;
  }
  
  return {
    strategyA: {
      name: strategyAName,
      wins: aWins,
      losses: gamesWithStrategyA.length - aWins,
      avgPointDiff: aPointDiff,
    },
    strategyB: {
      name: strategyBName,
      wins: bWins,
      losses: gamesWithStrategyB.length - bWins,
      avgPointDiff: bPointDiff,
    },
    winner,
    confidence,
    pValue,
    recommendation,
  };
}

/**
 * 生成回测报告
 */
export function generateBacktestReport(summary: BacktestSummary): string {
  const lines: string[] = [];
  
  lines.push('# 量化回测报告');
  lines.push('');
  lines.push(`## 测试概况`);
  lines.push(`- 总测试场数: ${summary.totalTests}`);
  lines.push(`- 模型预测准确率: ${(summary.modelAccuracy * 100).toFixed(1)}%`);
  lines.push(`- 实际胜率: ${(summary.actualWinRate * 100).toFixed(1)}%`);
  lines.push('');
  
  lines.push(`## 阵容质量分析`);
  lines.push(`- 模型阵容 vs 实际阵容质量差: ${summary.modelLineupAdvantage.toFixed(2)}`);
  lines.push(`- 夏普比率平均提升: ${summary.sharpeImprovement.toFixed(1)}%`);
  lines.push('');
  
  lines.push(`## 关键发现`);
  summary.keyFindings.forEach(finding => {
    lines.push(`- ${finding}`);
  });
  lines.push('');
  
  lines.push(`## 结论`);
  if (summary.sharpeImprovement > 15) {
    lines.push('✅ **模型通过回测验证**：采用模型建议可显著提升阵容质量和胜率。');
  } else if (summary.sharpeImprovement > 5) {
    lines.push('⚠️ **模型表现尚可**：有一定提升但需继续优化参数。');
  } else {
    lines.push('❌ **模型未通过回测**：建议重新审视模型假设和特征工程。');
  }
  
  return lines.join('\n');
}
