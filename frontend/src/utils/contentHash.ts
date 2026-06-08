export function contentHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    hash = ((hash << 5) - hash + ch) | 0
  }
  return `bm-${Math.abs(hash).toString(36)}`
}