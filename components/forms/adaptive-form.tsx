"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { VolleyballPosition } from "@/types/input"
import { 
  getFieldsForPosition, 
  groupFieldsByGroup, 
  groupLabels,
  FieldGroup 
} from "@/types/position-fields"
import { 
  DataSourceType, 
  dataSourceLabels, 
  FormCertaintyMap,
  FieldCertainty 
} from "@/types/certainty"

interface AdaptiveFormProps {
  position: VolleyballPosition
  mode: "quick" | "professional"
  values: Record<string, any>
  certainties: FormCertaintyMap
  onChange: (fieldId: string, value: any, source: DataSourceType) => void
}

export function AdaptiveForm({ 
  position, 
  mode, 
  values, 
  certainties,
  onChange 
}: AdaptiveFormProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<FieldGroup>>(
    new Set<FieldGroup>(["basic", "context"])
  )
  
  // 获取当前位置的字段配置
  const fields = useMemo(() => getFieldsForPosition(position, mode), [position, mode])
  const groupedFields = useMemo(() => groupFieldsByGroup(fields), [fields])
  
  // 切换分组展开
  const toggleGroup = (group: FieldGroup) => {
    const newSet = new Set(expandedGroups)
    if (newSet.has(group)) {
      newSet.delete(group)
    } else {
      newSet.add(group)
    }
    setExpandedGroups(newSet)
  }
  
  // 按位置定制分组顺序
  const getGroupOrder = (): FieldGroup[] => {
    const baseOrder: FieldGroup[] = ["basic", "context", "notes"]
    
    switch (position) {
      case "libero":
        return ["basic", "reception", "clutch", "context", "notes"]
      case "middle_blocker":
        return ["basic", "block", "attack", "clutch", "context", "notes"]
      case "setter":
        return ["basic", "set", "reception", "clutch", "context", "notes"]
      case "opposite":
        return ["basic", "attack", "serve", "clutch", "context", "notes"]
      case "outside_hitter":
      default:
        return ["basic", "attack", "serve", "reception", "clutch", "context", "notes"]
    }
  }
  
  const groupOrder = getGroupOrder()
  
  return (
    <div className="space-y-4">
      {groupOrder.map((group) => {
        const groupFields = groupedFields[group]
        if (!groupFields || groupFields.length === 0) return null
        
        const isExpanded = expandedGroups.has(group)
        const groupInfo = groupLabels[group]
        
        return (
          <FormGroup
            key={group}
            group={group}
            title={groupInfo.title}
            description={groupInfo.description}
            isExpanded={isExpanded}
            onToggle={() => toggleGroup(group)}
          >
            <div className="space-y-4">
              {groupFields.map((field) => (
                <AdaptiveField
                  key={field.id}
                  field={field}
                  value={values[field.id]}
                  certainty={certainties[field.id]}
                  onChange={(value, source) => onChange(field.id, value, source)}
                />
              ))}
            </div>
          </FormGroup>
        )
      })}
    </div>
  )
}

// 表单分组组件
interface FormGroupProps {
  group: FieldGroup
  title: string
  description: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function FormGroup({ title, description, isExpanded, onToggle, children }: FormGroupProps) {
  return (
    <div className="border border-[var(--line-default)]">
      <button
        type="button"
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-sharp"
      >
        <div className="text-left">
          <div className="font-medium text-[var(--text-primary)]">{title}</div>
          <div className="text-xs text-[var(--text-muted)]">{description}</div>
        </div>
        <div className={cn(
          "w-5 h-5 flex items-center justify-center text-[var(--text-muted)] transition-sharp",
          isExpanded && "rotate-180"
        )}>
          ▼
        </div>
      </button>
      
      {isExpanded && (
        <div className="p-4 border-t border-[var(--line-default)]">
          {children}
        </div>
      )}
    </div>
  )
}

// 自适应字段组件
interface AdaptiveFieldProps {
  field: {
    id: string
    label: string
    hint?: string
    group: string
  }
  value: any
  certainty?: FieldCertainty
  onChange: (value: any, source: DataSourceType) => void
}

function AdaptiveField({ field, value, certainty, onChange }: AdaptiveFieldProps) {
  const [showSource, setShowSource] = useState(false)
  const currentSource: DataSourceType = certainty?.source || "missing"
  
  const isNumeric = [
    "totalPoints", "totalPointsLost", "serveAces", "serveErrors",
    "attackKills", "attackErrors", "blockedTimes", "blockPoints", "digs",
    "pointsScored", "pointsLost", "majorErrors", "receptionSuccessRate",
    "clutchPerformanceScore"
  ].includes(field.id)
  
  const isRating = [
    "overallPerformance", "scoringRating", "errorRating", 
    "receptionRating", "clutchRating", "setQuality", "tempoControl",
    "defenseCoverage", "setErrors"
  ].includes(field.id)
  
  const isSelect = [
    "starterStatus", "participationLevel", "matchImportance", 
    "opponentStrength", "position"
  ].includes(field.id)
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-[var(--text-secondary)]">
          {field.label}
          {field.hint && (
            <span className="text-xs text-[var(--text-muted)] ml-2">
              ({field.hint})
            </span>
          )}
        </label>
        
        {/* 数据来源标记 */}
        <button
          type="button"
          onClick={() => setShowSource(!showSource)}
          className={cn(
            "text-[10px] px-2 py-0.5 border transition-sharp",
            currentSource === "exact" && "border-[var(--accent)] text-[var(--accent)]",
            currentSource === "estimated" && "border-[var(--info)] text-[var(--info)]",
            currentSource === "subjective" && "border-[var(--warning)] text-[var(--warning)]",
            currentSource === "missing" && "border-[var(--text-muted)] text-[var(--text-muted)]"
          )}
        >
          {dataSourceLabels[currentSource].label}
        </button>
      </div>
      
      {/* 输入控件 */}
      {isNumeric && (
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(
            parseInt(e.target.value) || 0, 
            currentSource === "missing" ? "estimated" : currentSource
          )}
          className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
          placeholder="0"
        />
      )}
      
      {isRating && (
        <RatingSelector
          value={value}
          onChange={(val) => onChange(val, "subjective")}
        />
      )}
      
      {isSelect && field.id === "starterStatus" && (
        <select
          value={value || "starter"}
          onChange={(e) => onChange(e.target.value, "exact")}
          className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
        >
          <option value="starter">首发打满</option>
          <option value="mid_game">首发部分</option>
          <option value="substitute">替补出场</option>
        </select>
      )}
      
      {isSelect && field.id === "participationLevel" && (
        <select
          value={value || "100"}
          onChange={(e) => onChange(e.target.value, "exact")}
          className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
        >
          <option value="100">全场（100%）</option>
          <option value="75">大部分（75%）</option>
          <option value="50">半场左右（50%）</option>
          <option value="25">少部分（25%）</option>
        </select>
      )}
      
      {isSelect && field.id === "matchImportance" && (
        <select
          value={value || "regular"}
          onChange={(e) => onChange(e.target.value, "exact")}
          className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
        >
          <option value="training">训练赛</option>
          <option value="regular">常规赛</option>
          <option value="important">重要比赛</option>
          <option value="critical">关键战役</option>
        </select>
      )}
      
      {isSelect && field.id === "opponentStrength" && (
        <select
          value={value || "average"}
          onChange={(e) => onChange(e.target.value, "subjective")}
          className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
        >
          <option value="weak">较弱</option>
          <option value="average">相当</option>
          <option value="strong">较强</option>
          <option value="very_strong">很强</option>
        </select>
      )}
      
      {!isNumeric && !isRating && !isSelect && (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value, currentSource === "missing" ? "estimated" : currentSource)}
          className="w-full bg-[var(--bg-secondary)] border border-[var(--line-default)] p-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
        />
      )}
      
      {/* 数据来源选择器 */}
      {showSource && (
        <div className="flex gap-2 pt-2">
          {(Object.keys(dataSourceLabels) as DataSourceType[]).map((source) => (
            <button
              key={source}
              type="button"
              onClick={() => {
                onChange(value, source)
                setShowSource(false)
              }}
              className={cn(
                "flex-1 py-2 text-xs border transition-sharp",
                currentSource === source
                  ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                  : "border-[var(--line-default)] text-[var(--text-muted)] hover:border-[var(--line-strong)]"
              )}
            >
              <div>{dataSourceLabels[source].label}</div>
              <div className="text-[10px] opacity-70 mt-0.5">
                {dataSourceLabels[source].description}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// 评分选择器
function RatingSelector({ 
  value, 
  onChange 
}: { 
  value: string
  onChange: (val: string) => void 
}) {
  const ratings = [
    { value: "excellent", label: "很好" },
    { value: "good", label: "良好" },
    { value: "average", label: "一般" },
    { value: "poor", label: "较差" },
    { value: "very_poor", label: "很差" },
  ]
  
  return (
    <div className="grid grid-cols-5 gap-1">
      {ratings.map((r) => (
        <button
          key={r.value}
          type="button"
          onClick={() => onChange(r.value)}
          className={cn(
            "py-2 text-xs text-center border transition-sharp",
            value === r.value
              ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
              : "border-[var(--line-default)] text-[var(--text-secondary)] hover:border-[var(--line-strong)]"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  )
}
