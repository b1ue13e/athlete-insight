"use client"

import { useSearchParams } from "next/navigation"
import { AthleteDetailPageClient } from "../athlete-detail-client"

export default function AthleteDetailPage() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id") ?? ""
  return <AthleteDetailPageClient id={id} />
}
