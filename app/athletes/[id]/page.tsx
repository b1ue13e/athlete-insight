import { AthleteDetailPageClient } from "./page-client"

export function generateStaticParams() {
  return [{ id: "sample" }]
}

export default function AthleteDetailPage({ params }: { params: { id: string } }) {
  return <AthleteDetailPageClient id={params.id} />
}
