/**
 * Analysis API Route
 *
 * POST /api/analyze
 * Body: { sport_type: string, data: object, athlete_id?: string }
 * Response: { success: boolean, report: ReportJSON, canonical_report?: CanonicalAnalysisReport, errors?: string[] }
 */

import { NextRequest, NextResponse } from "next/server"
import { enhanceReportWithKimi, isKimiConfigured } from "@/lib/kimi-api"
import { validateAnalyzeRequest } from "@/lib/schemas"
import { AnalysisInputError, analyzeActivity, toCanonicalVolleyballReport } from "@/lib/analysis/pipeline"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const requestValidation = validateAnalyzeRequest(body)
    if (!requestValidation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request format",
          details: requestValidation.error.errors,
        },
        { status: 400 }
      )
    }

    const { sport_type, data, enhance_with_ai } = requestValidation.data
    const analysis = analyzeActivity({ sport_type, data })

    let report = analysis.report
    let canonicalReport = analysis.canonical

    if (enhance_with_ai && isKimiConfigured() && sport_type === "volleyball" && report && "meta" in report) {
      try {
        report = await enhanceReportWithKimi(report)
        canonicalReport = toCanonicalVolleyballReport(analysis.input as Parameters<typeof toCanonicalVolleyballReport>[0], report)
      } catch (error) {
        console.error("Kimi enhancement failed, using base report:", error)
      }
    }

    return NextResponse.json({
      success: true,
      report,
      canonical_report: canonicalReport,
      enhanced: enhance_with_ai && isKimiConfigured(),
    })
  } catch (error) {
    if (error instanceof AnalysisInputError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          errors: error.details,
        },
        { status: 400 }
      )
    }

    console.error("Analysis error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/analyze/health
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    version: "v2",
    features: {
      volleyball: true,
      running: true,
      fitness: false,
      gym: true,
      kimi_enhancement: isKimiConfigured(),
    },
  })
}
