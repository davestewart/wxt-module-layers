import { getStoryRows, getStoryData, markStoryRead } from '..'

export default defineContentScript({
  matches: HN_MATCHES,
  async main () {
    const stories = await useStoriesStore().get()
    const readIds = new Set(stories.map(s => s.id))

    // mark matching rows in dom
    for (const row of getStoryRows()) {
      if (readIds.has(row.id)) {
        markStoryRead(row)
      }

      row.querySelector<HTMLElement>('.titleline a')?.addEventListener('click', (event) => {
        if (event.button !== 0) return
        const { id, title, link } = getStoryData(row)
        browser.runtime.sendMessage({ type: 'story:read', id, title, link })
        markStoryRead(row)
      })
    }

    // console log
    console.log(`[tracker] ${readIds.size} read stories marked`)
  },
})
