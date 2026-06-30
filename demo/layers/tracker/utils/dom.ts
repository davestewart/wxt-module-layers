interface StoryData {
  id: string
  title: string
  link: string
}

export function getStoryRows (): HTMLElement[] {
  return Array.from(document.querySelectorAll('.athing'))
}

export function getStoryData (row: HTMLElement): StoryData {
  const el = row.querySelector('.titleline a')
  return {
    id: row.id,
    title: el?.textContent ?? '',
    link: el?.getAttribute('href') ?? ''
  }
}

export function getStoryScore (row: HTMLElement): number {
  const subtextRow = row.nextElementSibling
  const scoreEl = subtextRow?.querySelector('.score')
  return parseInt(scoreEl?.textContent ?? '0', 10) || 0
}

export function markStoryRead (row: HTMLElement): void {
  if (row.dataset.read) return
  row.dataset.read = '1'

  const titleLine = row.querySelector('.titleline') as HTMLElement | null
  if (titleLine) {
    const icon = document.createElement('img')
    icon.src = browser.runtime.getURL('/assets/tracker/check.svg')
    icon.style.cssText = 'width:16px; height:16px; vertical-align: -20%; margin-right:5px;;'
    titleLine.prepend(icon)
  }
}
