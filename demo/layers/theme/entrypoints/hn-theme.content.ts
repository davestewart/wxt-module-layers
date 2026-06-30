import { getStoryRows, getStoryScore } from '#tracker'
import '../assets/theme.css'

export default defineContentScript({
  matches: HN_MATCHES,
  main() {
    // replace the site favicon
    let favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]')
    if (!favicon) {
      favicon = document.createElement('link')
      favicon.rel = 'icon'
      document.head.appendChild(favicon)
    }
    favicon.type = 'image/svg+xml'
    favicon.href = browser.runtime.getURL('/assets/theme/icon.svg')

    // get rows
    const rows = getStoryRows()

    // open all story links in a new tab
    for (const row of rows) {
      const link = row.querySelector('.titleline > a') as HTMLAnchorElement | null
      if (link) {
        link.target = `story_${row.id}`
      }
    }

    // highlight high-scoring stories
    for (const row of rows) {
      const score = getStoryScore(row)
      if (score >= 300) {
        row.classList.add('hn-theme-score-high')
      }
      else if (score >= 100) {
        row.classList.add('hn-theme-score-med')
      }
    }

    // console log
    console.log('[theme] Score highlights applied')
  },
})
