"use client"

import { useSearchParams } from "next/navigation"
import { ReportPageClient } from "../[id]/page-client"

export default function AnalysisDetailPage() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id") ?? ""
  return <ReportPageClient id={id} />
}
