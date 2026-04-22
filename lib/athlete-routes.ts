export function getAthleteDetailHref(id: string) {
  return `/athletes/detail?id=${encodeURIComponent(id)}`
}