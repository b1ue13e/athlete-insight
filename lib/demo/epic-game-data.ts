/**
 * 第一层：破冰与 AHA Moment (Onboarding Experience)
 * 
 * 内置一场"史诗级比赛"的完整数据
 * 故事线：惊天大逆转的排球决赛
 */

import { PlayerSeasonData } from '../analytics/athletic-sharpe-ratio';

export interface EpicGameStory {
  title: string;
  subtitle: string;
  background: string;
  turningPoint: string;
  outcome: string;
  keyInsight: string;
}

export const EPIC_VOLLEYBALL_STORY: EpicGameStory = {
  title: "0-2 到 3-2：不可能完成的逆转",
  subtitle: "2024 全国大学生排球联赛决赛",
  background: "北京理工大学排球队在决赛中对战卫冕冠军上海交通大学。前两局北理工状态低迷，失误连连，以 23:25 和 21:25 连丢两局，眼看就要被横扫。",
  turningPoint: "第三局 12:15 落后时，主教练李明做出关键换人：用替补接应王浩换下主力张磊。数据显示王浩的 Sharpe Ratio 虽然不高，但与主攻手李强呈现 -0.42 的负相关性——当李强被对手重点盯防时，王浩往往能抓住机会。",
  outcome: "换人后局势逆转。王浩连续三个发球直接得分，李强在进攻端压力减轻后爆发，两人形成完美对冲。最终北理工连扳三局，以 3-2 完成惊天逆转，夺得队史首个全国冠军。",
  keyInsight: "AI 系统提前识别出王浩-李强组合的负相关性，建议作为'秘密武器'在关键局使用。当李强在前两局被对手研究透后，王浩的上场彻底打乱了对手的防守部署。",
};

export const EPIC_RUNNER_STORY = {
  title: "1:48:32 的突破",
  subtitle: "无锡马拉松半马破纪录之旅",
  background: "32 岁的软件工程师陈明，目标打破 1:50 的半马 PB。赛前他的 AI 训练处方显示：有氧基础稳固（心率脱钩 4.2%），但乳酸阈值边缘模糊，建议以 5:05/km 配速匀速推进。",
  turningPoint: "比赛进行到 15km，陈明感觉良好试图加速。但实时遥测数据显示心率已开始非线性上升，触地时间从 218ms 增加到 235ms，步频从 178 降至 171——这是典型的'技术变形'前兆。AI 系统发出警告：'检测到跑姿衰退，建议维持当前配速'。",
  outcome: "陈明听从建议放弃加速，保持 5:05/km 配速完赛。最终成绩 1:48:32，成功 PB 1 分 28 秒。赛后数据显示，如果他在 15km 加速，后 6km 的配速可能跌至 5:40/km，总成绩反而会慢 2-3 分钟。",
  keyInsight: "人类的'感觉良好'往往是崩溃的前兆。AI 通过实时监测跑姿微观变化（GCT 增加 17ms，步频下降 7spm），在主观感受出现之前就预判了体力拐点。",
};

// 史诗级排球比赛 - 完整遥测数据
export const EPIC_VOLLEYBALL_GAME: PlayerSeasonData[] = [
  {
    playerId: "li_qiang",
    playerName: "李强",
    position: "outside",
    games: [
      {
        gameId: "final_epic",
        date: "2024-05-20",
        stats: {
          attackKills: 18, attackErrors: 5, attackAttempts: 35,
          blocks: 2, blockErrors: 1, digs: 8,
          receptionErrors: 3, aces: 1, serviceErrors: 2,
          assists: 0, settingErrors: 0,
        },
        minutesPlayed: 120,
        opponentStrength: 10,
        isHome: false,
        isPlayoff: true,
      },
    ],
  },
  {
    playerId: "wang_hao",
    playerName: "王浩",
    position: "opposite",
    games: [
      {
        gameId: "final_epic",
        date: "2024-05-20",
        stats: {
          attackKills: 12, attackErrors: 1, attackAttempts: 18,
          blocks: 3, blockErrors: 0, digs: 5,
          receptionErrors: 0, aces: 4, serviceErrors: 0,
          assists: 0, settingErrors: 0,
        },
        minutesPlayed: 45, // 第三局才上场
        opponentStrength: 10,
        isHome: false,
        isPlayoff: true,
      },
    ],
  },
  {
    playerId: "zhang_lei",
    playerName: "张磊",
    position: "opposite",
    games: [
      {
        gameId: "final_epic",
        date: "2024-05-20",
        stats: {
          attackKills: 8, attackErrors: 4, attackAttempts: 20,
          blocks: 1, blockErrors: 1, digs: 4,
          receptionErrors: 2, aces: 0, serviceErrors: 1,
          assists: 0, settingErrors: 0,
        },
        minutesPlayed: 75, // 前两局首发，第三局被换下
        opponentStrength: 10,
        isHome: false,
        isPlayoff: true,
      },
    ],
  },
  {
    playerId: "chen_jie",
    playerName: "陈杰",
    position: "setter",
    games: [
      {
        gameId: "final_epic",
        date: "2024-05-20",
        stats: {
          attackKills: 2, attackErrors: 0, attackAttempts: 4,
          blocks: 1, blockErrors: 0, digs: 12,
          receptionErrors: 1, aces: 2, serviceErrors: 1,
          assists: 45, settingErrors: 3,
        },
        minutesPlayed: 120,
        opponentStrength: 10,
        isHome: false,
        isPlayoff: true,
      },
    ],
  },
  {
    playerId: "liu_wei",
    playerName: "刘伟",
    position: "middle",
    games: [
      {
        gameId: "final_epic",
        date: "2024-05-20",
        stats: {
          attackKills: 10, attackErrors: 2, attackAttempts: 15,
          blocks: 6, blockErrors: 1, digs: 3,
          receptionErrors: 0, aces: 0, serviceErrors: 0,
          assists: 0, settingErrors: 0,
        },
        minutesPlayed: 120,
        opponentStrength: 10,
        isHome: false,
        isPlayoff: true,
      },
    ],
  },
  {
    playerId: "zhou_peng",
    playerName: "周鹏",
    position: "middle",
    games: [
      {
        gameId: "final_epic",
        date: "2024-05-20",
        stats: {
          attackKills: 8, attackErrors: 1, attackAttempts: 12,
          blocks: 4, blockErrors: 0, digs: 5,
          receptionErrors: 0, aces: 1, serviceErrors: 1,
          assists: 0, settingErrors: 0,
        },
        minutesPlayed: 120,
        opponentStrength: 10,
        isHome: false,
        isPlayoff: true,
      },
    ],
  },
];

// 史诗级跑步数据 - 完整遥测
export const EPIC_RUNNER_TELEMETRY = {
  runner: {
    name: "陈明",
    age: 32,
    target: "半马破 1:50",
    pb: "1:48:32 (新)",
    previousPb: "1:50:00",
  },
  raceData: {
    distance: 21097.5, // 半马距离
    duration: 6512,    // 1:48:32 in seconds
    avgPace: 5.08,     // min/km
    avgHeartRate: 168,
    maxHeartRate: 182,
  },
  splits: [
    { km: 1, pace: 5.05, hr: 155, gct: 218, cadence: 178 },
    { km: 2, pace: 5.03, hr: 160, gct: 219, cadence: 177 },
    { km: 3, pace: 5.06, hr: 162, gct: 218, cadence: 178 },
    { km: 4, pace: 5.04, hr: 163, gct: 219, cadence: 177 },
    { km: 5, pace: 5.05, hr: 164, gct: 220, cadence: 177 },
    { km: 6, pace: 5.04, hr: 165, gct: 219, cadence: 178 },
    { km: 7, pace: 5.06, hr: 166, gct: 220, cadence: 176 },
    { km: 8, pace: 5.05, hr: 167, gct: 221, cadence: 177 },
    { km: 9, pace: 5.07, hr: 167, gct: 221, cadence: 176 },
    { km: 10, pace: 5.05, hr: 168, gct: 222, cadence: 176 },
    { km: 11, pace: 5.06, hr: 169, gct: 222, cadence: 175 },
    { km: 12, pace: 5.08, hr: 170, gct: 223, cadence: 175 },
    { km: 13, pace: 5.07, hr: 170, gct: 224, cadence: 175 },
    { km: 14, pace: 5.09, hr: 171, gct: 225, cadence: 174 },
    { km: 15, pace: 5.10, hr: 172, gct: 226, cadence: 173 }, // 拐点预警点
    { km: 16, pace: 5.12, hr: 174, gct: 230, cadence: 172 },
    { km: 17, pace: 5.14, hr: 176, gct: 232, cadence: 171 },
    { km: 18, pace: 5.15, hr: 178, gct: 233, cadence: 171 },
    { km: 19, pace: 5.13, hr: 179, gct: 232, cadence: 172 },
    { km: 20, pace: 5.12, hr: 180, gct: 231, cadence: 172 },
    { km: 21.0975, pace: 5.10, hr: 181, gct: 230, cadence: 173 },
  ],
  aiInsights: [
    {
      km: 5,
      type: "positive",
      message: "心率控制优秀，有氧基础稳固 (脱钩率 4.2%)",
    },
    {
      km: 10,
      type: "info",
      message: "配速稳定，步频维持在 176-178 理想区间",
    },
    {
      km: 15,
      type: "warning",
      message: "⚠️ 检测到跑姿衰退信号：GCT 从 218ms 增至 226ms，步频下降至 173",
    },
    {
      km: 16,
      type: "critical",
      message: "🚨 系统建议：放弃加速，维持当前配速。强行提速可能导致后 5km 配速跌至 5:40+/km",
    },
    {
      km: 21,
      type: "success",
      message: "🎉 完美执行！PB 提升 1:28，节省能量约 3.2%",
    },
  ],
};

// Demo 引导步骤
export const DEMO_GUIDE_STEPS = [
  {
    target: "stats-overview",
    title: "核心指标一览",
    content: "这里展示了比赛的关键统计数据。注意看心率脱钩率——它是评估有氧基础的金标准。",
  },
  {
    target: "sharpe-analysis",
    title: "夏普比率分层",
    content: "王浩的 Sharpe Ratio 虽然只有 1.2，但他是 HIGH_BETA 类型，适合在关键时刻改变局势。",
  },
  {
    target: "correlation-heatmap",
    title: "协方差矩阵",
    content: "王浩和李强的相关系数为 -0.42——负相关意味着他们可以互相'对冲'风险。",
  },
  {
    target: "ai-prescription",
    title: "AI 训练处方",
    content: "基于这次比赛的数据，AI 生成了个性化的训练建议，针对性强化薄弱环节。",
  },
  {
    target: "player-card",
    title: "生成球星卡",
    content: "点击这里生成你的专属球星卡，分享到社交媒体！",
  },
];
