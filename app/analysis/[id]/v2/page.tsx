import { ReportV2PageClient } from "./page-client"

export function generateStaticParams() {
  return [{ id: 'sample' }]
}

export default function ReportV2Page({ params }: { params: { id: string } }) {
  return <ReportV2PageClient id={params.id} />
}
