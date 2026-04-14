export const GYM_SCORE_VERSION = "1.0.0"

export function generateGymMetadata() {
  return {
    version: GYM_SCORE_VERSION,
    calculatedAt: new Date().toISOString(),
    templateVersion: "gym-v1",
  }
}
