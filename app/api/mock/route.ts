/**
 * Mock Data API Route
 * 
 * Provides endpoints for mock data operations during development.
 * These endpoints are for local testing only and should not be used in production.
 * 
 * GET /api/mock/sessions - Get all mock sessions
 * GET /api/mock/sessions/:id - Get specific session
 * POST /api/mock/sessions - Create mock session
 */

import { NextRequest, NextResponse } from "next/server"
import { mockStorage } from "@/lib/sample-data"
import { generateId } from "@/lib/utils"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  if (id) {
    const session = mockStorage.getSession(id)
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      )
    }
    return NextResponse.json({ success: true, session })
  }

  const sessions = mockStorage.getAllSessions()
  return NextResponse.json({ success: true, sessions })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const session = {
      id: generateId(),
      athlete_id: body.athlete_id || "athlete-001",
      sport_type: body.sport_type || "volleyball",
      title: body.title || "未命名分析",
      session_date: body.session_date || new Date().toISOString().split("T")[0],
      status: "completed" as const,
      input_method: "manual" as const,
      raw_input: body.raw_input || {},
      derived_metrics: body.derived_metrics || {},
      overall_score: body.overall_score || 0,
      report_json: body.report_json || null,
      summary_text: body.summary_text || "",
      model_version: "mock-v1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mockStorage.addSession(session)

    return NextResponse.json({ success: true, session })
  } catch (error) {
    console.error("Mock API error:", error)
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    )
  }
}
