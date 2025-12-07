export function toArray<T> (value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}

/**
 * Pluralize a word based on count
 *
 * @param word        The word to pluralize, use 'singular|plural' format for irregular plurals
 * @param count       The count to base the pluralization on
 * @param includeWord Whether to include the count in the returned string
 */
export function plural (word: string, count: number | any[], includeWord = true): string {
  const [single, plural = `${single}s`] = word.split('|')
  const value = Array.isArray(count)
    ? count.length
    : count
  const wordToUse = value === 1
    ? single
    : plural || single
  return includeWord
    ? `${value} ${wordToUse}`
    : wordToUse
}

export function shallowMerge<T> (target: T, source: Partial<T>): void {
  for (const [key, value] of Object.entries(source)) {
    const targetAny = target as any
    if (Array.isArray(value) && Array.isArray(targetAny[key])) {
      targetAny[key] = [...targetAny[key], ...value]
    }
    else if (typeof value === 'object' && typeof targetAny[key] === 'object') {
      targetAny[key] = { ...targetAny[key], ...value }
    }
    else {
      targetAny[key] = value
    }
  }
}
