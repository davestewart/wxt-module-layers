const STORAGE_KEY = 'stories'
const MAX_STORIES = 50

export interface Story {
  id: string
  title: string
  link: string
  time: number
}

async function get(): Promise<Story[]> {
  const { stories = [] } = await browser.storage.local.get(STORAGE_KEY)
  return stories as Story[]
}

async function add(id: string, title: string, link: string): Promise<void> {
  const stories = await get()
  const filtered = stories.filter(s => s.id !== id)
  filtered.unshift({ id, title, link, time: Date.now() })
  await browser.storage.local.set({ [STORAGE_KEY]: filtered.slice(0, MAX_STORIES) })
}

async function remove(id: string): Promise<void> {
  const stories = await get()
  await browser.storage.local.set({ [STORAGE_KEY]: stories.filter(s => s.id !== id) })
}

function onChange(callback: (stories: Story[]) => void): () => void {
  const listener = (changes: Record<string, Browser.storage.StorageChange>) => {
    if (STORAGE_KEY in changes) {
      callback((changes[STORAGE_KEY].newValue as Story[]) ?? [])
    }
  }
  browser.storage.onChanged.addListener(listener)
  return () => browser.storage.onChanged.removeListener(listener)
}

export function useStoriesStore() {
  return {
    get,
    add,
    remove,
    onChange
  }
}
