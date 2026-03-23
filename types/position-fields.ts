/**
 * 位置自适应表单配置
 * 
 * 不同位置显示不同的字段顺序和分组
 */

import { VolleyballPosition } from "./input"

// 字段分组
export type FieldGroup = 
  | "basic"      // 基础信息
  | "scoring"    // 得分贡献
  | "attack"     // 进攻
  | "serve"      // 发球
  | "block"      // 拦网
  | "reception"  // 一传/防守
  | "set"        // 二传组织
  | "clutch"     // 关键分
  | "context"    // 出场上下文
  | "notes"      // 备注

// 字段配置
export interface FieldConfig {
  id: string
  label: string
  group: FieldGroup
  priority: number  // 1-10，越大越靠前显示
  showFor: VolleyballPosition[]  // 哪些位置显示此字段
  required?: boolean
  hint?: string
}

// 各位置字段配置
export const positionFieldConfigs: Record<VolleyballPosition, FieldConfig[]> = {
  // 主攻
  outside_hitter: [
    { id: "matchName", label: "比赛名称", group: "basic", priority: 10, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "opponent", label: "对手", group: "basic", priority: 9, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    
    // 主攻核心：进攻
    { id: "attackKills", label: "进攻得分", group: "attack", priority: 10, showFor: ["outside_hitter", "opposite"], hint: "扣球直接得分" },
    { id: "attackErrors", label: "进攻失误", group: "attack", priority: 9, showFor: ["outside_hitter", "opposite", "middle_blocker"] },
    { id: "blockedTimes", label: "被拦死", group: "attack", priority: 8, showFor: ["outside_hitter", "opposite", "middle_blocker"] },
    
    // 主攻次要：发球
    { id: "serveAces", label: "发球ACE", group: "serve", priority: 7, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter"] },
    { id: "serveErrors", label: "发球失误", group: "serve", priority: 6, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter"] },
    
    // 主攻需要：一传
    { id: "receptionRating", label: "接发表现", group: "reception", priority: 8, showFor: ["outside_hitter", "libero"], hint: "一传到位率和稳定性" },
    { id: "digs", label: "防守起球", group: "reception", priority: 6, showFor: ["outside_hitter", "libero", "opposite"] },
    
    // 拦网（主攻次要）
    { id: "blockPoints", label: "拦网得分", group: "block", priority: 5, showFor: ["outside_hitter", "middle_blocker", "opposite"] },
    
    // 关键分
    { id: "clutchRating", label: "关键分表现", group: "clutch", priority: 9, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter"], hint: "局末、关键球的处理" },
    
    // 上下文
    { id: "starterStatus", label: "首发/替补", group: "context", priority: 8, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "participationLevel", label: "出场比例", group: "context", priority: 7, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "matchImportance", label: "比赛重要性", group: "context", priority: 6, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "opponentStrength", label: "对手强度", group: "context", priority: 5, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    
    { id: "notes", label: "备注", group: "notes", priority: 1, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
  ],
  
  // 副攻
  middle_blocker: [
    { id: "matchName", label: "比赛名称", group: "basic", priority: 10, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "opponent", label: "对手", group: "basic", priority: 9, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    
    // 副攻核心：拦网
    { id: "blockPoints", label: "拦网得分", group: "block", priority: 10, showFor: ["middle_blocker"], hint: "拦网是副攻首要任务" },
    
    // 副攻次要：快攻
    { id: "attackKills", label: "快攻得分", group: "attack", priority: 9, showFor: ["middle_blocker"], hint: "快攻、半快、背飞等" },
    { id: "attackErrors", label: "快攻失误", group: "attack", priority: 8, showFor: ["middle_blocker", "outside_hitter", "opposite"] },
    { id: "blockedTimes", label: "被拦死", group: "attack", priority: 7, showFor: ["outside_hitter", "opposite", "middle_blocker"] },
    
    // 发球
    { id: "serveAces", label: "发球ACE", group: "serve", priority: 6, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter"] },
    { id: "serveErrors", label: "发球失误", group: "serve", priority: 5, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter"] },
    
    // 防守（副攻较少参与）
    { id: "digs", label: "防守起球", group: "reception", priority: 4, showFor: ["outside_hitter", "libero", "opposite", "middle_blocker"] },
    
    // 关键分
    { id: "clutchRating", label: "关键分表现", group: "clutch", priority: 8, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter"], hint: "局末拦网、关键快攻" },
    
    // 上下文
    { id: "starterStatus", label: "首发/替补", group: "context", priority: 8, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "participationLevel", label: "出场比例", group: "context", priority: 7, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "matchImportance", label: "比赛重要性", group: "context", priority: 6, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "opponentStrength", label: "对手强度", group: "context", priority: 5, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    
    { id: "notes", label: "备注", group: "notes", priority: 1, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
  ],
  
  // 二传
  setter: [
    { id: "matchName", label: "比赛名称", group: "basic", priority: 10, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "opponent", label: "对手", group: "basic", priority: 9, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    
    // 二传核心：组织
    { id: "attackKills", label: "助攻得分", group: "set", priority: 10, showFor: ["setter"], hint: "为攻手创造得分的传球" },
    { id: "setQuality", label: "传球质量", group: "set", priority: 9, showFor: ["setter"], hint: "传球到位率、节奏控制" },
    { id: "tempoControl", label: "节奏控制", group: "set", priority: 8, showFor: ["setter"], hint: "快攻组织、节奏变化" },
    
    // 二传次要：防守
    { id: "digs", label: "防守起球", group: "reception", priority: 8, showFor: ["setter", "libero"] },
    
    // 拦网（二传较少）
    { id: "blockPoints", label: "拦网得分", group: "block", priority: 6, showFor: ["setter", "outside_hitter", "middle_blocker", "opposite"] },
    
    // 发球
    { id: "serveAces", label: "发球ACE", group: "serve", priority: 7, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter"] },
    { id: "serveErrors", label: "发球失误", group: "serve", priority: 6, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter"] },
    
    // 失误（二传特殊）
    { id: "setErrors", label: "传球失误", group: "set", priority: 9, showFor: ["setter"], hint: "失配、倒头、扎网等" },
    
    // 关键分
    { id: "clutchRating", label: "关键分表现", group: "clutch", priority: 8, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter"], hint: "局末分配、关键球选择" },
    
    // 上下文
    { id: "starterStatus", label: "首发/替补", group: "context", priority: 8, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "participationLevel", label: "出场比例", group: "context", priority: 7, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "matchImportance", label: "比赛重要性", group: "context", priority: 6, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "opponentStrength", label: "对手强度", group: "context", priority: 5, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    
    { id: "notes", label: "备注", group: "notes", priority: 1, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
  ],
  
  // 接应
  opposite: [
    { id: "matchName", label: "比赛名称", group: "basic", priority: 10, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "opponent", label: "对手", group: "basic", priority: 9, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    
    // 接应核心：进攻
    { id: "attackKills", label: "进攻得分", group: "attack", priority: 10, showFor: ["opposite", "outside_hitter"], hint: "调整攻、后排攻" },
    { id: "attackErrors", label: "进攻失误", group: "attack", priority: 9, showFor: ["outside_hitter", "opposite", "middle_blocker"] },
    { id: "blockedTimes", label: "被拦死", group: "attack", priority: 8, showFor: ["outside_hitter", "opposite", "middle_blocker"] },
    
    // 接应次要：发球
    { id: "serveAces", label: "发球ACE", group: "serve", priority: 8, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter"], hint: "接应通常是发球强轮" },
    { id: "serveErrors", label: "发球失误", group: "serve", priority: 7, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter"] },
    
    // 接应次要：拦网
    { id: "blockPoints", label: "拦网得分", group: "block", priority: 7, showFor: ["opposite", "middle_blocker", "outside_hitter"] },
    
    // 防守
    { id: "digs", label: "防守起球", group: "reception", priority: 6, showFor: ["opposite", "outside_hitter", "libero"] },
    
    // 关键分
    { id: "clutchRating", label: "关键分表现", group: "clutch", priority: 9, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter"], hint: "调整攻、关键球" },
    
    // 上下文
    { id: "starterStatus", label: "首发/替补", group: "context", priority: 8, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "participationLevel", label: "出场比例", group: "context", priority: 7, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "matchImportance", label: "比赛重要性", group: "context", priority: 6, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "opponentStrength", label: "对手强度", group: "context", priority: 5, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    
    { id: "notes", label: "备注", group: "notes", priority: 1, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
  ],
  
  // 自由人
  libero: [
    { id: "matchName", label: "比赛名称", group: "basic", priority: 10, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "opponent", label: "对手", group: "basic", priority: 9, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    
    // 自由人核心：一传
    { id: "receptionRating", label: "接发表现", group: "reception", priority: 10, showFor: ["libero", "outside_hitter"], hint: "一传到位率和稳定性是自由人核心指标" },
    { id: "receptionSuccessRate", label: "一传到位率", group: "reception", priority: 9, showFor: ["libero"] },
    
    // 自由人核心：防守
    { id: "digs", label: "防守起球", group: "reception", priority: 10, showFor: ["libero"], hint: "防守面积和起球质量" },
    { id: "defenseCoverage", label: "防守覆盖", group: "reception", priority: 8, showFor: ["libero"], hint: "保护范围、移动速度" },
    
    // 自由人：调整传球
    { id: "setQuality", label: "调整传球", group: "set", priority: 7, showFor: ["libero"], hint: "无法进攻时的二传质量" },
    
    // 发球（自由人通常不参与）
    
    // 关键分
    { id: "clutchRating", label: "关键分表现", group: "clutch", priority: 8, showFor: ["libero"], hint: "关键一传、关键防守" },
    
    // 上下文
    { id: "starterStatus", label: "首发/替补", group: "context", priority: 8, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "participationLevel", label: "出场比例", group: "context", priority: 7, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "matchImportance", label: "比赛重要性", group: "context", priority: 6, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    { id: "opponentStrength", label: "对手强度", group: "context", priority: 5, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
    
    { id: "notes", label: "备注", group: "notes", priority: 1, showFor: ["outside_hitter", "opposite", "middle_blocker", "setter", "libero"] },
  ],
}

// 获取位置字段分组
export function getFieldsForPosition(
  position: VolleyballPosition,
  mode: "quick" | "professional"
): FieldConfig[] {
  const allFields = positionFieldConfigs[position]
  
  // 根据模式过滤
  if (mode === "quick") {
    // 快速模式只显示核心字段
    return allFields.filter(f => 
      f.priority >= 7 || 
      f.group === "basic" || 
      f.group === "clutch" ||
      f.group === "context"
    )
  }
  
  return allFields
}

// 按分组组织字段
export function groupFieldsByGroup(fields: FieldConfig[]): Record<FieldGroup, FieldConfig[]> {
  const groups: Record<FieldGroup, FieldConfig[]> = {
    basic: [],
    scoring: [],
    attack: [],
    serve: [],
    block: [],
    reception: [],
    set: [],
    clutch: [],
    context: [],
    notes: [],
  }
  
  fields.forEach(field => {
    if (!groups[field.group]) {
      groups[field.group] = []
    }
    groups[field.group].push(field)
  })
  
  // 每组内按优先级排序
  Object.keys(groups).forEach(group => {
    groups[group as FieldGroup].sort((a, b) => b.priority - a.priority)
  })
  
  return groups
}

// 分组显示名称
export const groupLabels: Record<FieldGroup, { title: string; description: string }> = {
  basic: { title: "比赛信息", description: "基础信息" },
  scoring: { title: "得分贡献", description: "主动得分能力" },
  attack: { title: "进攻", description: "进攻表现" },
  serve: { title: "发球", description: "发球表现" },
  block: { title: "拦网", description: "拦网表现" },
  reception: { title: "一传/防守", description: "保障环节" },
  set: { title: "组织", description: "二传组织" },
  clutch: { title: "关键分", description: "关键时刻表现" },
  context: { title: "出场上下文", description: "比赛背景" },
  notes: { title: "备注", description: "其他说明" },
}
