/**
 * 第一层：从"单点定价"到"投资组合优化" (Portfolio Optimization)
 * 
 * 核心洞察：把六个夏普比率最高的球员扔上场，大概率会翻车。
 * 教练需要的不仅是"谁最强"，而是"哪六个人搭档最稳"。
 * 
 * 引入现代投资组合理论 (Markowitz Portfolio Theory)
 * 
 * 阵容波动率公式：
 *                 n     n
 *     σ²_p  =   Σ     Σ   w_i * w_j * Cov(R_i, R_j)
 *               i=1   j=1
 * 
 * 其中：
 *   - w_i: 球权分配比例 / 上场时间权重
 *   - R_i: 球员期望得分贡献 (xP)
 *   - Cov(R_i, R_j): 球员 i 和 j 表现的协方差
 * 
 * AHA Moment:
 * 如果主攻手张三和接应李四的表现高度负相关（对冲），
 * 同时派他们上场反而能降低整套阵容的波动率。
 */

import { PlayerSeasonData, calculateAthleticSharpeRatio, VolleyballStats, calculateExpectedPoints } from './athletic-sharpe-ratio';

// 球员在单场比赛的表现向量
export interface PlayerGameVector {
  playerId: string;
  gameId: string;
  xP: number;           // 该场比赛的期望得分贡献
  minutesPlayed: number;
  normalizedXP: number; // 按时间标准化后的表现
}

// 协方差矩阵单元
export interface CovarianceCell {
  playerA: string;
  playerB: string;
  covariance: number;
  correlation: number;  // 相关系数 [-1, 1]
  sampleSize: number;   // 共同出场样本数
}

// 投资组合优化配置
export interface PortfolioConfig {
  positionConstraints: {
    setter: [number, number];      // [min, max] 二传手数量
    outside: [number, number];     // 主攻手
    opposite: [number, number];    // 接应
    middle: [number, number];      // 副攻
    libero: [number, number];      // 自由人
  };
  minSharpeRatio: number;          // 最低夏普比率门槛
  maxVolatility: number;           // 最大接受波动率
  riskTolerance: 'conservative' | 'balanced' | 'aggressive';
}

const DEFAULT_CONFIG: PortfolioConfig = {
  positionConstraints: {
    setter: [1, 1],
    outside: [1, 2],
    opposite: [0, 1],
    middle: [2, 3],
    libero: [1, 1],
  },
  minSharpeRatio: 0.5,
  maxVolatility: 2.0,
  riskTolerance: 'balanced',
};

/**
 * 计算两个球员表现的协方差
 * Cov(X,Y) = E[(X - μ_x)(Y - μ_y)]
 */
function calculateCovariance(
  playerAVectors: PlayerGameVector[],
  playerBVectors: PlayerGameVector[]
): CovarianceCell {
  // 找到共同出场的比赛
  const commonGames = new Map<string, { a: PlayerGameVector; b: PlayerGameVector }>();
  
  playerAVectors.forEach(v => commonGames.set(v.gameId, { a: v, b: null as any }));
  playerBVectors.forEach(v => {
    const existing = commonGames.get(v.gameId);
    if (existing) {
      existing.b = v;
    }
  });
  
  const pairs = Array.from(commonGames.values()).filter(p => p.b !== null);
  
  if (pairs.length < 3) {
    return {
      playerA: playerAVectors[0]?.playerId || '',
      playerB: playerBVectors[0]?.playerId || '',
      covariance: 0,
      correlation: 0,
      sampleSize: pairs.length,
    };
  }
  
  // 计算均值
  const meanA = pairs.reduce((s, p) => s + p.a.normalizedXP, 0) / pairs.length;
  const meanB = pairs.reduce((s, p) => s + p.b.normalizedXP, 0) / pairs.length;
  
  // 计算协方差
  let covariance = 0;
  pairs.forEach(p => {
    covariance += (p.a.normalizedXP - meanA) * (p.b.normalizedXP - meanB);
  });
  covariance /= pairs.length;
  
  // 计算标准差
  const stdA = Math.sqrt(
    pairs.reduce((s, p) => s + Math.pow(p.a.normalizedXP - meanA, 2), 0) / pairs.length
  );
  const stdB = Math.sqrt(
    pairs.reduce((s, p) => s + Math.pow(p.b.normalizedXP - meanB, 2), 0) / pairs.length
  );
  
  // 皮尔逊相关系数
  const correlation = stdA > 0 && stdB > 0 ? covariance / (stdA * stdB) : 0;
  
  return {
    playerA: playerAVectors[0].playerId,
    playerB: playerBVectors[0].playerId,
    covariance,
    correlation,
    sampleSize: pairs.length,
  };
}

/**
 * 构建全队的协方差矩阵
 */
export function buildCovarianceMatrix(
  players: PlayerSeasonData[]
): CovarianceCell[][] {
  const matrix: CovarianceCell[][] = [];
  
  // 先为每个球员构建比赛表现向量
  const playerVectors = players.map(p => 
    p.games.map(g => ({
      playerId: p.playerId,
      gameId: g.gameId,
      xP: calculateExpectedPoints(g.stats),
      minutesPlayed: g.minutesPlayed,
      normalizedXP: calculateExpectedPoints(g.stats) / (g.minutesPlayed / 60),
    }))
  );
  
  // 构建对称矩阵
  for (let i = 0; i < players.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < players.length; j++) {
      if (i === j) {
        // 对角线：方差
        const vectors = playerVectors[i];
        const values = vectors.map(v => v.normalizedXP);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
        
        matrix[i][j] = {
          playerA: players[i].playerId,
          playerB: players[j].playerId,
          covariance: variance,
          correlation: 1,
          sampleSize: vectors.length,
        };
      } else if (j < i) {
        // 下三角：复制上三角
        matrix[i][j] = matrix[j][i];
      } else {
        // 上三角：计算协方差
        matrix[i][j] = calculateCovariance(playerVectors[i], playerVectors[j]);
      }
    }
  }
  
  return matrix;
}

/**
 * 阵容 (投资组合) 的预期收益和波动率
 */
export interface LineupMetrics {
  players: string[];
  weights: number[];           // 球权/时间权重
  expectedReturn: number;      // 预期总得分贡献
  volatility: number;          // 组合波动率 σ_p
  sharpeRatio: number;         // 组合夏普比率
  diversificationRatio: number; // 分散化比率
  positionBreakdown: Record<string, number>;
}

/**
 * 计算给定阵容的投资组合指标
 */
export function calculateLineupMetrics(
  lineup: PlayerSeasonData[],
  covarianceMatrix: CovarianceCell[][],
  weights?: number[]
): LineupMetrics {
  // 默认等权重
  const w = weights || lineup.map(() => 1 / lineup.length);
  
  // 计算预期收益 (加权平均)
  let expectedReturn = 0;
  lineup.forEach((p, i) => {
    const metrics = calculateAthleticSharpeRatio(p);
    expectedReturn += metrics.avgXP * w[i];
  });
  
  // 找到球员在矩阵中的索引
  const playerIds = lineup.map(p => p.playerId);
  const matrixSize = covarianceMatrix.length;
  const indices = lineup.map(p => {
    for (let i = 0; i < matrixSize; i++) {
      if (covarianceMatrix[i][0].playerA === p.playerId) return i;
    }
    return -1;
  });
  
  // 计算组合方差 σ²_p = ΣΣ w_i * w_j * Cov(i,j)
  let portfolioVariance = 0;
  for (let i = 0; i < lineup.length; i++) {
    for (let j = 0; j < lineup.length; j++) {
      const idxI = indices[i];
      const idxJ = indices[j];
      if (idxI >= 0 && idxJ >= 0) {
        portfolioVariance += w[i] * w[j] * covarianceMatrix[idxI][idxJ].covariance;
      }
    }
  }
  
  const volatility = Math.sqrt(Math.max(0, portfolioVariance));
  
  // 组合夏普比率 (简化：使用平均无风险收益率)
  const avgRiskFree = lineup.reduce((s, p) => {
    const metrics = calculateAthleticSharpeRatio(p);
    return s + metrics.riskFreeRate;
  }, 0) / lineup.length;
  
  const sharpeRatio = volatility > 0 ? (expectedReturn - avgRiskFree) / volatility : 0;
  
  // 分散化比率 = 组合波动率 / 加权平均个体波动率
  const weightedIndividualVol = lineup.reduce((s, p, i) => {
    const idx = indices[i];
    if (idx >= 0) {
      return s + w[i] * Math.sqrt(covarianceMatrix[idx][idx].covariance);
    }
    return s;
  }, 0);
  
  const diversificationRatio = weightedIndividualVol > 0 ? volatility / weightedIndividualVol : 1;
  
  // 位置分布
  const positionBreakdown: Record<string, number> = {};
  lineup.forEach((p, i) => {
    positionBreakdown[p.position] = (positionBreakdown[p.position] || 0) + w[i];
  });
  
  return {
    players: playerIds,
    weights: w,
    expectedReturn,
    volatility,
    sharpeRatio,
    diversificationRatio,
    positionBreakdown,
  };
}

/**
 * 有效的阵容前沿 (Efficient Lineup Frontier)
 * 在给定风险水平下收益最高，或给定收益水平下风险最低的阵容集合
 */
export interface EfficientFrontierPoint {
  expectedReturn: number;
  volatility: number;
  lineup: string[];
  sharpeRatio: number;
}

/**
 * 生成有效阵容前沿
 * 使用蒙特卡洛模拟探索不同权重组合
 */
export function generateEfficientFrontier(
  roster: PlayerSeasonData[],
  covarianceMatrix: CovarianceCell[][],
  numPortfolios = 1000
): EfficientFrontierPoint[] {
  const validLineups: LineupMetrics[] = [];
  
  // 生成随机阵容组合
  for (let n = 0; n < numPortfolios; n++) {
    // 随机选择6人 (排球标准阵容)
    const shuffled = [...roster].sort(() => Math.random() - 0.5);
    const lineup = shuffled.slice(0, 6);
    
    // 检查位置约束
    const positionCounts: Record<string, number> = {};
    lineup.forEach(p => {
      positionCounts[p.position] = (positionCounts[p.position] || 0) + 1;
    });
    
    // 简单约束检查：至少1个二传，1-2个主攻，1个接应，2个副攻，1个自由人
    const valid = 
      (positionCounts['setter'] || 0) >= 1 &&
      (positionCounts['outside'] || 0) >= 1 &&
      (positionCounts['middle'] || 0) >= 2;
    
    if (!valid) continue;
    
    // 生成随机权重 (Dirichlet 分布)
    const randomWeights = Array(6).fill(0).map(() => Math.random());
    const weightSum = randomWeights.reduce((a, b) => a + b, 0);
    const weights = randomWeights.map(w => w / weightSum);
    
    const metrics = calculateLineupMetrics(lineup, covarianceMatrix, weights);
    
    // 过滤掉波动率过高的
    if (metrics.volatility < 3) {
      validLineups.push(metrics);
    }
  }
  
  // 按夏普比率排序，取前沿
  validLineups.sort((a, b) => b.sharpeRatio - a.sharpeRatio);
  
  // 构建有效前沿 (帕累托最优)
  const frontier: EfficientFrontierPoint[] = [];
  let minVolatility = Infinity;
  
  validLineups.forEach(l => {
    if (l.volatility < minVolatility) {
      frontier.push({
        expectedReturn: l.expectedReturn,
        volatility: l.volatility,
        lineup: l.players,
        sharpeRatio: l.sharpeRatio,
      });
      minVolatility = l.volatility;
    }
  });
  
  return frontier;
}

/**
 * 寻找最优阵容
 * 根据风险偏好选择最佳投资组合
 */
export function findOptimalLineup(
  roster: PlayerSeasonData[],
  covarianceMatrix: CovarianceCell[][],
  config: Partial<PortfolioConfig> = {}
): LineupMetrics | null {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // 生成候选阵容
  const candidates: LineupMetrics[] = [];
  
  // 穷举所有6人组合 (如果阵容不大)
  if (roster.length <= 12) {
    // 生成所有组合 (C(n,6))
    const combinations = generateCombinations(roster, 6);
    
    for (const lineup of combinations) {
      // 检查位置约束
      if (!satisfyPositionConstraints(lineup, cfg.positionConstraints)) {
        continue;
      }
      
      // 检查最低夏普比率
      const avgSharpe = lineup.reduce((s, p) => {
        const m = calculateAthleticSharpeRatio(p);
        return s + m.sharpeRatio;
      }, 0) / lineup.length;
      
      if (avgSharpe < cfg.minSharpeRatio) continue;
      
      const metrics = calculateLineupMetrics(lineup, covarianceMatrix);
      
      if (metrics.volatility > cfg.maxVolatility) continue;
      
      candidates.push(metrics);
    }
  }
  
  if (candidates.length === 0) return null;
  
  // 根据风险偏好选择
  switch (cfg.riskTolerance) {
    case 'conservative':
      // 最小化波动率
      return candidates.sort((a, b) => a.volatility - b.volatility)[0];
    
    case 'aggressive':
      // 最大化预期收益
      return candidates.sort((a, b) => b.expectedReturn - a.expectedReturn)[0];
    
    case 'balanced':
    default:
      // 最大化夏普比率
      return candidates.sort((a, b) => b.sharpeRatio - a.sharpeRatio)[0];
  }
}

/**
 * 生成所有 k 人组合
 */
function generateCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  
  const result: T[][] = [];
  
  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  
  backtrack(0, []);
  return result;
}

/**
 * 检查是否满足位置约束
 */
function satisfyPositionConstraints(
  lineup: PlayerSeasonData[],
  constraints: PortfolioConfig['positionConstraints']
): boolean {
  const counts: Record<string, number> = {};
  lineup.forEach(p => {
    counts[p.position] = (counts[p.position] || 0) + 1;
  });
  
  return Object.entries(constraints).every(([pos, [min, max]]) => {
    const count = counts[pos] || 0;
    return count >= min && count <= max;
  });
}

/**
 * 阵容对冲分析报告
 * 识别哪些球员组合能互相降低风险
 */
export interface HedgingAnalysis {
  bestHedges: Array<{
    pair: [string, string];
    correlation: number;
    explanation: string;
  }>;
  worstPairs: Array<{
    pair: [string, string];
    correlation: number;
    warning: string;
  }>;
  diversificationScore: number;
}

export function analyzeHedgingOpportunities(
  roster: PlayerSeasonData[],
  covarianceMatrix: CovarianceCell[][]
): HedgingAnalysis {
  const correlations: Array<{ pair: [string, string]; correlation: number }> = [];
  
  // 提取所有相关关系
  for (let i = 0; i < covarianceMatrix.length; i++) {
    for (let j = i + 1; j < covarianceMatrix.length; j++) {
      const cell = covarianceMatrix[i][j];
      if (cell.sampleSize >= 3) {
        correlations.push({
          pair: [cell.playerA, cell.playerB],
          correlation: cell.correlation,
        });
      }
    }
  }
  
  // 排序
  correlations.sort((a, b) => a.correlation - b.correlation);
  
  // 最佳对冲 (负相关)
  const bestHedges = correlations
    .filter(c => c.correlation < -0.3)
    .slice(0, 5)
    .map(c => ({
      pair: c.pair,
      correlation: c.correlation,
      explanation: `高度负相关(${c.correlation.toFixed(2)})，适合同时上场对冲风险`,
    }));
  
  // 最差组合 (高度正相关)
  const worstPairs = correlations
    .filter(c => c.correlation > 0.7)
    .slice(-5)
    .map(c => ({
      pair: c.pair,
      correlation: c.correlation,
      warning: `高度正相关(${c.correlation.toFixed(2)})，表现同涨同跌，风险集中`,
    }));
  
  // 分散化评分 (0-100)
  const avgCorrelation = correlations.reduce((s, c) => s + Math.abs(c.correlation), 0) 
    / correlations.length;
  const diversificationScore = Math.max(0, 100 * (1 - avgCorrelation));
  
  return {
    bestHedges,
    worstPairs,
    diversificationScore,
  };
}
