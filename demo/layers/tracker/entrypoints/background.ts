export default function () {
  browser.action.onClicked.addListener(async (tab) => {
    // open side panel first (cannot open after async actions)
    await (browser.sidePanel as any).open({ windowId: tab.windowId })

    // ensure hacker news tab is open or focused
    const tabs = await browser.tabs.query({ url: `${HN_URL}/*`, windowId: tab.windowId })
    if (tabs.length > 0 && tabs[0].id) {
      await browser.tabs.update(tabs[0].id, { active: true })
    }
    else {
      await browser.tabs.create({ url: HN_URL })
    }
  })

  // stories store
  const store = useStoriesStore()

  // marshall messages
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'story:read') {
      const { id, title, link } = message

      // async: use promise.then() to prevent blocking
      store.add(id, title, link).then(() => {
        console.log(`[tracker] Stored: ${title}`)
        sendResponse({ ok: true })
      })

      // async: return true to indicate async response
      return true
    }
  })

  // loaded
  console.log('[tracker] Background initialized')
}
