/**
 * 失误标签类型定义
 * 
 * 提供结构化的失误分类，帮助识别问题类型
 */

export type ErrorCategory = "judgment" | "technical" | "coordination"

export interface ErrorTag {
  id: string
  label: string
  category: ErrorCategory
  description: string
  examples?: string[]
}

// 失误类型标签选项
export const errorTagOptions: ErrorTag[] = [
  // 判断失误
  { 
    id: "wrong-shot-selection", 
    label: "选点不当", 
    category: "judgment",
    description: "进攻选点不聪明，往人堆里打",
    examples: ["面对双人拦网强行扣直线", "明明对方空挡在右侧却扣左侧"]
  },
  { 
    id: "tactical-mistake", 
    label: "战术执行错误", 
    category: "judgment",
    description: "战术理解错误或未按部署执行",
    examples: ["应该打快攻却跑慢了", "二传布置打后三却往前跑"]
  },
  { 
    id: "late-read", 
    label: "判断慢", 
    category: "judgment",
    description: "对球路判断慢半拍",
    examples: ["接发球启动慢", "拦网时机判断失误"]
  },
  { 
    id: "forcing-play", 
    label: "强行处理", 
    category: "judgment",
    description: "明知不可为而为之，不合理冒险",
    examples: ["球位置不舒服还强行扣", "到位率本就不高还硬传复杂战术"]
  },
  { 
    id: "position-error", 
    label: "跑位错误", 
    category: "judgment",
    description: "防守或进攻跑位不对",
    examples: ["防守时站在错误位置", "进攻路线与二传冲突"]
  },
  
  // 技术失误
  { 
    id: "poor-footwork", 
    label: "步法问题", 
    category: "technical",
    description: "步法不干净，导致无法到位击球",
    examples: ["上步不稳", "最后一步过大或过小"]
  },
  { 
    id: "arm-swing", 
    label: "挥臂问题", 
    category: "technical",
    description: "挥臂动作有问题",
    examples: ["包球不完全", "甩小臂过早"]
  },
  { 
    id: "contact-point", 
    label: "击球点问题", 
    category: "technical",
    description: "击球点选择不佳",
    examples: ["点太低", "球在身体后面", "点太靠前导致下网"]
  },
  { 
    id: "set-quality", 
    label: "传球质量", 
    category: "technical",
    description: "二传传球质量不佳",
    examples: ["不到位", "倒头", "扎网"]
  },
  { 
    id: "receive-technique", 
    label: "接发技术", 
    category: "technical",
    description: "接发球技术动作问题",
    examples: ["手臂太紧", "没主动迎球", "击球点过高或过低"]
  },
  
  // 配合失误
  { 
    id: "communication", 
    label: "沟通问题", 
    category: "coordination",
    description: "队员间缺乏沟通导致失误",
    examples: ["都让球", "都争球", "不知道谁接"]
  },
  { 
    id: "tempo-mismatch", 
    label: "节奏不匹配", 
    category: "coordination",
    description: "攻传配合节奏不一致",
    examples: ["二传球传到了攻手还没起跳", "攻手起跳了球还没到"]
  },
  { 
    id: "coverage-gap", 
    label: "保护漏洞", 
    category: "coordination",
    description: "防守保护不到位",
    examples: ["没人保护二传", "扣球后没人跟进保护"]
  },
  { 
    id: "rotation-confusion", 
    label: "轮转混乱", 
    category: "coordination",
    description: "轮转不到位或跑错位置",
    examples: ["发球轮跑错位", "后排插上不及时"]
  },
]

// 按分类获取标签
export const getErrorTagsByCategory = (category: ErrorCategory) => {
  return errorTagOptions.filter(tag => tag.category === category)
}

// 根据ID获取标签
export const getErrorTagById = (id: string) => {
  return errorTagOptions.find(tag => tag.id === id)
}

// 分类中文标签
export const errorTagCategoryLabels: Record<ErrorCategory, string> = {
  judgment: "判断失误",
  technical: "技术失误", 
  coordination: "配合失误",
}

// 分类描述
export const errorTagCategoryDescriptions: Record<ErrorCategory, string> = {
  judgment: "球商、决策层面的问题",
  technical: "动作、基本功层面的问题",
  coordination: "团队配合、沟通层面的问题",
}

// 获取所有已选标签的详情
export const getSelectedErrorTagDetails = (tagIds: string[]) => {
  return tagIds.map(id => getErrorTagById(id)).filter(Boolean) as ErrorTag[]
}
