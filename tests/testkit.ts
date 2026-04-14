export type TestFn = () => void | Promise<void>

declare global {
  var __ATHLETE_INSIGHT_TESTS__: Array<{ name: string; fn: TestFn }>
}

export function test(name: string, fn: TestFn) {
  globalThis.__ATHLETE_INSIGHT_TESTS__.push({ name, fn })
}
