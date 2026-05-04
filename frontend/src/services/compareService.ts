import { diffLines } from 'diff'
import type { DiffPoint, DiffResult } from '@/types'

export function computeDiff(
  oldText: string,
  newText: string,
  oldFileName: string,
  newFileName: string,
): DiffResult {
  const changes = diffLines(oldText, newText)
  const points: DiffPoint[] = []
  let additions = 0
  let deletions = 0
  let equalLines = 0

  for (const change of changes) {
    if (change.added) {
      points.push({ type: 'add', text: change.value })
      additions++
    } else if (change.removed) {
      points.push({ type: 'delete', text: change.value })
      deletions++
    } else {
      points.push({ type: 'equal', text: change.value })
      equalLines++
    }
  }

  return {
    oldFileName,
    newFileName,
    points,
    stats: { additions, deletions, equalLines },
  }
}
