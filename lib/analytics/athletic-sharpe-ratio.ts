/**
 * 第三层（深）：降维打击 —— 运动员的"量化金融"定价模型
 * 
 * 核心痛点：教练往往偏爱"神经刀"球员（偶尔一场爆砍 30 分），
 * 但忽视了其极高的失误率（方差大）。
 * 我们需要一个极其客观的指标来衡量球员的"真实价值"。
 * 
 * 硬核公式：运动场夏普比率 (Athletic Sharpe Ratio)
 * 
 *                    xP̄ - Rf
 *     SR = ------------------------
 *           σ_xP (风险/波动率)
 * 
 * 其中:
 *   - xP̄: 球员本赛季的平均期望得分贡献 (Expected Points)
 *   - Rf: 无风险收益率 (同位置边缘替补球员的平均底线得分)
 *   - σ_xP: 球员表现的标准差（波动率）
 * 
 * 通过这个模型，系统可以直接告诉教练：
 * "虽然张三今天拿了 20 分，但他的波动率 σ 太高，关键局派他上场等于赌博；
 *  而李四虽然场均只有 12 分，但他的 SR（风险调整后收益）是全队最高的，
 *  他才是真正的基本盘。"
 */

export interface VolleyballStats {
  attackKills: number;
  attackErrors: number;
  attackAttempts: number;
  blocks: number;
  blockErrors: number;
  digs: number;
  receptionErrors: number;
  aces: number;
  serviceErrors: number;
  assists: number;
  settingErrors: number;
}

/**
 * 计算期望得分贡献 (Expected Points)
 * 简化版，实际应该根据得分权重计算
 */
export function calculateExpectedPoints(stats: VolleyballStats): number {
  // 扣球得分效率
  const attackEfficiency = stats.attackAttempts > 0 
    ? (stats.attackKills - stats.attackErrors) / stats.attackAttempts 
    : 0;
  
  // 各项贡献权重 (根据排球统计学的得分价值)
  const weights = {
    attack: 1.0,
    block: 0.8,
    ace: 1.0,
    dig: 0.3,
    assist: 0.4,
  };
  
  const xp = 
    stats.attackKills * weights.attack +
    stats.blocks * weights.block +
    stats.aces * weights.ace +
    stats.digs * weights.dig +
    stats.assists * weights.assist -
    (stats.attackErrors + stats.blockErrors + stats.receptionErrors + stats.serviceErrors + stats.settingErrors) * 0.5;
  
  return Math.max(0, xp);
}

export interface GamePerformance {
  gameId: string;
  date: string;
  stats: VolleyballStats;
  minutesPlayed: number;
  opponentStrength: number; // 1-10 对手强度
  isHome: boolean;
  isPlayoff: boolean;
}

export interface PlayerSeasonData {
  playerId: string;
  playerName: string;
  position: 'setter' | 'outside' | 'opposite' | 'middle' | 'libero';
  games: GamePerformance[];
  // 同位置基准球员数据 (用于计算 Rf)
  positionBaseline?: {
    avgXP: number;
    stdXP: number;
  };
}

export interface SharpeRatioResult {
  // 核心指标
  sharpeRatio: number;           // 运动场夏普比率
  riskAdjustedXP: number;        // 风险调整后期望得分
  
  // 原始数据
  avgXP: number;                 // 平均期望得分 xP̄
  volatility: number;            // 标准差 σ
  var95: number;                 // 95% 风险价值 (VaR)
  
  // 基准对比
  riskFreeRate: number;          // Rf
  excessReturn: number;          // xP̄ - Rf
  
  // 稳定性指标
  consistencyScore: number;      // 0-100，稳定性评分
  clutchPerformance: number;     // 关键局表现加成
  
  // 解释
  tier: 'FUNDAMENTAL' | 'HIGH_BETA' | 'VOLATILE' | 'UNDERPERFORMER';
  recommendation: string;
}

/**
 * 计算单场表现的期望得分贡献
 */
function calculateGameXP(game: GamePerformance): number {
  const baseXP = calculateExpectedPoints(game.stats);
  
  // 对手强度调整 (打强队表现更好应该加分)
  const strengthAdjustment = 1 + (game.opponentStrength - 5) * 0.05;
  
  // 季后赛加成
  const playoffMultiplier = game.isPlayoff ? 1.15 : 1.0;
  
  // 出场时间标准化 (防止垃圾时间刷数据)
  const minutesFactor = Math.min(game.minutesPlayed / 60, 1);
  
  return baseXP * strengthAdjustment * playoffMultiplier * minutesFactor;
}

/**
 * 计算同位置基准 Rf (无风险收益率)
 * 使用联盟该位置倒数 20% 球员的平均表现作为"底线"
 */
function calculateRiskFreeRate(
  positionPlayers: PlayerSeasonData[]
): number {
  const allXPs: number[] = [];
  
  positionPlayers.forEach(player => {
    player.games.forEach(game => {
      allXPs.push(calculateGameXP(game));
    });
  });
  
  // 取倒数 20% 的平均值
  const sorted = allXPs.sort((a, b) => a - b);
  const bottom20Count = Math.ceil(sorted.length * 0.2);
  const bottom20 = sorted.slice(0, bottom20Count);
  
  return bottom20.reduce((a, b) => a + b, 0) / bottom20.length;
}

/**
 * 计算关键局表现 (Clutch Performance)
 * 统计季后赛/强强对话的表现稳定性
 */
function calculateClutchPerformance(
  games: GamePerformance[],
  overallAvg: number
): number {
  const highPressureGames = games.filter(g => 
    g.isPlayoff || g.opponentStrength >= 8
  );
  
  if (highPressureGames.length < 3) return 1.0; // 数据不足
  
  const clutchXPs = highPressureGames.map(calculateGameXP);
  const clutchAvg = clutchXPs.reduce((a, b) => a + b, 0) / clutchXPs.length;
  const clutchStd = Math.sqrt(
    clutchXPs.reduce((sq, n) => sq + Math.pow(n - clutchAvg, 2), 0) / clutchXPs.length
  );
  
  // 关键局表现系数 = 关键局均值 / 整体均值 * 稳定性系数
  const stabilityFactor = 1 / (1 + clutchStd / overallAvg);
  return (clutchAvg / overallAvg) * stabilityFactor;
}

/**
 * 计算 95% VaR (风险价值)
 * "该球员有 5% 的概率表现低于这个值"
 */
function calculateVaR(values: number[], confidence = 0.05): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * confidence);
  return sorted[index];
}

/**
 * 核心：计算运动场夏普比率
 */
export function calculateAthleticSharpeRatio(
  player: PlayerSeasonData,
  leagueBaseline?: PlayerSeasonData[]
): SharpeRatioResult {
  if (player.games.length < 5) {
    throw new Error('Insufficient data (min 5 games required)');
  }
  
  // 计算每场比赛的 XP
  const gameXPs = player.games.map(calculateGameXP);
  
  // 平均期望得分 xP̄
  const avgXP = gameXPs.reduce((a, b) => a + b, 0) / gameXPs.length;
  
  // 标准差 σ (波动率)
  const variance = gameXPs.reduce((sq, n) => sq + Math.pow(n - avgXP, 2), 0) / gameXPs.length;
  const volatility = Math.sqrt(variance);
  
  // 无风险收益率 Rf
  let riskFreeRate: number;
  if (player.positionBaseline) {
    riskFreeRate = player.positionBaseline.avgXP;
  } else if (leagueBaseline) {
    riskFreeRate = calculateRiskFreeRate(
      leagueBaseline.filter(p => p.position === player.position)
    );
  } else {
    // 使用联盟平均的 60% 作为保守估计
    riskFreeRate = avgXP * 0.6;
  }
  
  // 夏普比率
  const excessReturn = avgXP - riskFreeRate;
  const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0;
  
  // 风险调整后 XP
  const riskAdjustedXP = avgXP - 0.5 * variance; // 惩罚方差
  
  // VaR
  const var95 = calculateVaR(gameXPs, 0.05);
  
  // 稳定性评分 (0-100)
  // CV = σ/μ，越小越稳定
  const coefficientOfVariation = volatility / avgXP;
  const consistencyScore = Math.max(0, Math.min(100, 100 * (1 - coefficientOfVariation)));
  
  // 关键局表现
  const clutchPerformance = calculateClutchPerformance(player.games, avgXP);
  
  // 分层
  let tier: SharpeRatioResult['tier'];
  let recommendation: string;
  
  if (sharpeRatio > 1.5 && consistencyScore > 70) {
    tier = 'FUNDAMENTAL';
    recommendation = '核心基本盘。风险调整后收益最高，关键局值得信任。';
  } else if (sharpeRatio > 1.0) {
    tier = 'HIGH_BETA';
    recommendation = '高Beta球员。收益不错但波动大，适合顺风局扩大优势。';
  } else if (avgXP > riskFreeRate * 1.5) {
    tier = 'VOLATILE';
    recommendation = '神经刀。偶有爆发但极不稳定，关键局使用需谨慎。';
  } else {
    tier = 'UNDERPERFORMER';
    recommendation = '表现低于预期。建议评估位置适配性或轮换安排。';
  }
  
  return {
    sharpeRatio,
    riskAdjustedXP,
    avgXP,
    volatility,
    var95,
    riskFreeRate,
    excessReturn,
    consistencyScore,
    clutchPerformance,
    tier,
    recommendation,
  };
}

/**
 * 阵容优化建议
 * 根据夏普比率给出轮换建议
 */
export interface LineupOptimization {
  starters: string[];           // 首发建议
  sixthMan: string;             // 第六人
  clutchRotation: string[];     // 关键局轮换
  riskAnalysis: string;
}

export function optimizeLineup(
  roster: PlayerSeasonData[],
  context: {
    isPlayoffGame: boolean;
    opponentStrength: number;
    gameImportance: 'critical' | 'important' | 'regular';
  }
): LineupOptimization {
  // 计算所有球员的夏普比率
  const playerRatios = roster.map(p => ({
    player: p,
    metrics: calculateAthleticSharpeRatio(p, roster),
  }));
  
  // 排序
  const sorted = playerRatios.sort((a, b) => b.metrics.sharpeRatio - a.metrics.sharpeRatio);
  
  // 根据比赛重要性选择策略
  let starters: string[];
  let riskAnalysis: string;
  
  if (context.gameImportance === 'critical') {
    // 关键局：优先夏普比率，宁要稳不要爆
    starters = sorted
      .filter(p => p.metrics.tier === 'FUNDAMENTAL' || p.metrics.consistencyScore > 75)
      .slice(0, 6)
      .map(p => p.player.playerName);
    riskAnalysis = '关键局采用保守策略，优先选择稳定性高的球员。';
  } else if (context.gameImportance === 'important') {
    // 重要比赛：平衡夏普比率和关键局表现
    starters = sorted
      .sort((a, b) => b.metrics.clutchPerformance - a.metrics.clutchPerformance)
      .slice(0, 6)
      .map(p => p.player.playerName);
    riskAnalysis = '重要比赛优先关键局表现，兼顾稳定性。';
  } else {
    // 常规赛：可以尝试高Beta球员
    starters = sorted
      .filter(p => p.metrics.avgXP > p.metrics.riskFreeRate)
      .slice(0, 6)
      .map(p => p.player.playerName);
    riskAnalysis = '常规赛可适当尝试高潜力球员。';
  }
  
  // 第六人选择：高夏普比但没进首发
  const sixthMan = sorted.find(
    p => !starters.includes(p.player.playerName) && p.metrics.sharpeRatio > 1.0
  )?.player.playerName || sorted[6]?.player.playerName || '';
  
  // 关键局轮换：夏普比率前4
  const clutchRotation = sorted
    .slice(0, 4)
    .map(p => p.player.playerName);
  
  return {
    starters,
    sixthMan,
    clutchRotation,
    riskAnalysis,
  };
}

/**
 * 投资组合视角的球队构建
 * 把球队看作一个投资组合，优化整体夏普比率
 */
export function analyzeTeamPortfolio(
  roster: PlayerSeasonData[]
): {
  portfolioSharpe: number;
  diversificationScore: number;
  riskConcentration: string[];
  suggestedMoves: string[];
} {
  const playerMetrics = roster.map(p => calculateAthleticSharpeRatio(p, roster));
  
  // 计算组合夏普 (简化：等权平均)
  const portfolioSharpe = playerMetrics.reduce((sum, p) => sum + p.sharpeRatio, 0) / playerMetrics.length;
  
  // 分散度：夏普比率的变异系数
  const avgSharpe = portfolioSharpe;
  const sharpeStd = Math.sqrt(
    playerMetrics.reduce((sq, p) => sq + Math.pow(p.sharpeRatio - avgSharpe, 2), 0) / playerMetrics.length
  );
  const diversificationScore = 100 * (1 - sharpeStd / avgSharpe);
  
  // 风险集中点：夏普比率最低的
  const riskConcentration = playerMetrics
    .filter(p => p.sharpeRatio < 0.5)
    .map(p => p.recommendation.split('。')[0]);
  
  // 建议
  const suggestedMoves: string[] = [];
  
  if (diversificationScore < 50) {
    suggestedMoves.push('球队表现过于依赖少数球员，建议引入稳定性高的角色球员。');
  }
  
  const fundamentalCount = playerMetrics.filter(p => p.tier === 'FUNDAMENTAL').length;
  if (fundamentalCount < 3) {
    suggestedMoves.push('缺乏核心基本盘球员，建议培养或引进稳定的首发。');
  }
  
  const highBetaCount = playerMetrics.filter(p => p.tier === 'HIGH_BETA').length;
  if (highBetaCount > 4) {
    suggestedMoves.push('高波动球员过多，阵容稳定性存疑。');
  }
  
  return {
    portfolioSharpe,
    diversificationScore,
    riskConcentration,
    suggestedMoves,
  };
}
