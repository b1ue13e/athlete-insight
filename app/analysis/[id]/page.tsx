import { ReportPageClient } from "./page-client"

// 静态导出需要
export function generateStaticParams() {
  return [{ id: 'sample' }]
}

export default function ReportPage({ params }: { params: { id: string } }) {
  return <ReportPageClient id={params.id} />
}
