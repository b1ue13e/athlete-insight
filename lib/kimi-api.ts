/**
 * Kimi API Integration Module
 * 
 * 这是一个预留接口模块，用于后续接入 Kimi API 进行报告文本增强。
 * 
 * 使用场景：
 * 1. 当 mock 分析引擎生成基础报告后，可以调用 Kimi API 优化文本描述
 * 2. 生成更具个性化的训练建议
 * 3. 对复杂数据进行深度解读
 * 
 * 调用流程：
 * analyzeVolleyball(data) -> generateBaseReport() -> enhanceWithKimi(report) -> return finalReport
 */

import { ReportJSON } from "@/types"

interface KimiConfig {
  apiKey: string
  baseUrl: string
  model: string
}

const defaultConfig: KimiConfig = {
  apiKey: process.env.KIMI_API_KEY || "",
  baseUrl: process.env.KIMI_API_BASE_URL || "https://api.moonshot.cn/v1",
  model: "moonshot-v1-8k",
}

/**
 * 构建 Kimi 的 system prompt
 */
function buildSystemPrompt(): string {
  return `你是一位专业的运动表现分析师，擅长分析排球、跑步、健身等运动项目的数据。

你的任务是根据提供的结构化运动数据，生成专业、简洁、有针对性的分析报告。

输出要求：
1. 优势描述要具体，指出具体的技术特点
2. 问题分析要到位，给出可操作的改进方向
3. 建议要实用，不是泛泛而谈
4. 语言简洁专业，避免空话套话
5. 保持客观，基于数据说话

输出格式必须是合法的 JSON，包含以下字段：
- one_line_summary: 一句话总结
- strengths: 优势列表，每项包含 title 和 detail
- weaknesses: 问题列表，每项包含 title、detail 和 severity
- root_causes: 问题成因分析
- recommendations: 训练建议，每项包含 priority、title 和 detail`
}

/**
 * 构建用户 prompt
 */
function buildUserPrompt(report: ReportJSON): string {
  return `请根据以下排球比赛数据生成分析报告：

【基础数据】
- 比赛: ${report.meta.title}
- 日期: ${report.meta.session_date}

【原始指标】
${Object.entries(report.metrics.raw)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

【派生指标】
${Object.entries(report.metrics.derived)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

【综合评分】
- 总分: ${report.overview.overall_score}/100
- 评级: ${report.overview.rating_label}

【已识别标签】
${report.tags.join(", ")}

请生成专业的分析报告，以 JSON 格式返回。`
}

/**
 * 调用 Kimi API 增强报告
 * 
 * @param baseReport - 基础报告（由规则引擎生成）
 * @param config - Kimi API 配置
 * @returns 增强后的报告
 */
export async function enhanceReportWithKimi(
  baseReport: ReportJSON,
  config: Partial<KimiConfig> = {}
): Promise<ReportJSON> {
  const finalConfig = { ...defaultConfig, ...config }

  // 如果未配置 API Key，直接返回基础报告
  if (!finalConfig.apiKey) {
    console.log("[Kimi] API Key not configured, returning base report")
    return baseReport
  }

  try {
    const response = await fetch(`${finalConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${finalConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: finalConfig.model,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(baseReport) },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      throw new Error(`Kimi API error: ${response.status}`)
    }

    const data = await response.json()
    const enhancedContent = JSON.parse(data.choices[0].message.content)

    // 合并基础报告和增强内容
    return {
      ...baseReport,
      overview: {
        ...baseReport.overview,
        one_line_summary: enhancedContent.one_line_summary || baseReport.overview.one_line_summary,
      },
      strengths: enhancedContent.strengths || baseReport.strengths,
      weaknesses: enhancedContent.weaknesses || baseReport.weaknesses,
      root_causes: enhancedContent.root_causes || baseReport.root_causes,
      recommendations: enhancedContent.recommendations || baseReport.recommendations,
      meta: {
        ...baseReport.meta,
        model_version: `kimi-${finalConfig.model}`,
      },
    }
  } catch (error) {
    console.error("[Kimi] Enhancement failed:", error)
    // API 失败时返回基础报告
    return baseReport
  }
}

/**
 * 流式调用 Kimi API（用于实时显示生成内容）
 * 
 * @param baseReport - 基础报告
 * @param onChunk - 每收到一块内容的回调
 * @param config - Kimi API 配置
 */
export async function enhanceReportWithKimiStream(
  baseReport: ReportJSON,
  onChunk: (chunk: string) => void,
  config: Partial<KimiConfig> = {}
): Promise<void> {
  const finalConfig = { ...defaultConfig, ...config }

  if (!finalConfig.apiKey) {
    console.log("[Kimi] API Key not configured")
    return
  }

  try {
    const response = await fetch(`${finalConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${finalConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: finalConfig.model,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(baseReport) },
        ],
        temperature: 0.7,
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`Kimi API error: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) return

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = new TextDecoder().decode(value)
      const lines = chunk.split("\n").filter(line => line.trim() !== "")

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6)
          if (data === "[DONE]") return

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              onChunk(content)
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  } catch (error) {
    console.error("[Kimi] Stream enhancement failed:", error)
  }
}

/**
 * 检查 Kimi API 是否已配置
 */
export function isKimiConfigured(): boolean {
  return !!defaultConfig.apiKey
}
