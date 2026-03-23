/**
 * Analysis API Route
 * 
 * POST /api/analyze
 * Body: { sport_type: string, data: object, athlete_id?: string }
 * Response: { success: boolean, report: ReportJSON, errors?: string[] }
 */

import { NextRequest, NextResponse } from "next/server"
import { analyzeVolleyball } from "@/lib/mock-analysis"
import { enhanceReportWithKimi, isKimiConfigured } from "@/lib/kimi-api"
import { validateAnalyzeRequest, validateVolleyballForm, getFormErrors } from "@/lib/schemas"
import { SportType, VolleyballFormData } from "@/types"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Step 1: 校验请求结构
    const requestValidation = validateAnalyzeRequest(body)
    if (!requestValidation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid request format",
          details: requestValidation.error.errors 
        },
        { status: 400 }
      )
    }
    
    const { sport_type, data, enhance_with_ai } = requestValidation.data

    let report

    // Step 2: 根据运动类型路由到对应的分析器
    switch (sport_type) {
      case "volleyball": {
        // 校验排球表单数据
        const formValidation = validateVolleyballForm(data)
        if (!formValidation.success) {
          return NextResponse.json(
            { 
              success: false, 
              error: "Invalid volleyball data",
              errors: getFormErrors(formValidation)
            },
            { status: 400 }
          )
        }
        
        // 执行分析
        report = analyzeVolleyball(formValidation.data)
        break
      }
      
      case "running":
      case "fitness":
        return NextResponse.json(
          { success: false, error: "Sport type not yet supported" },
          { status: 400 }
        )
      
      default:
        return NextResponse.json(
          { success: false, error: "Invalid sport type" },
          { status: 400 }
        )
    }

    // Step 3: 如果需要，使用 Kimi 增强报告
    if (enhance_with_ai && isKimiConfigured()) {
      try {
        report = await enhanceReportWithKimi(report)
      } catch (error) {
        console.error("Kimi enhancement failed, using base report:", error)
        // 继续返回基础报告，不阻断流程
      }
    }

    return NextResponse.json({
      success: true,
      report,
      enhanced: enhance_with_ai && isKimiConfigured(),
    })
  } catch (error) {
    console.error("Analysis error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/analyze/health
 * 健康检查端点
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "v2",
    features: {
      volleyball: true,
      running: false,
      fitness: false,
      kimi_enhancement: isKimiConfigured(),
    },
  })
}
