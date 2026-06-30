import icon from '../../public/check.svg?raw'

async function renderStories () {
  const list = document.getElementById('stories')!
  const stories = await store.get()

  if (stories.length === 0) {
    list.innerHTML = '<li class="empty">No stories read yet. Visit Hacker News!</li>'
  }

  else {
    list.innerHTML = ''
    for (const story of stories) {
      const li = document.createElement('li')
      const svg = document.createElement('svg')
      const link = document.createElement('a')

      svg.innerHTML = icon.replace('width="16" height="16"', 'width="12" height="12"')
      svg.style.verticalAlign = 'middle'
      svg.style.marginRight = '0.2em'

      link.innerHTML = `
        <a href="${HN_URL}/item?id=${story.id}" target="story_${story.id}">
          ${story.title}
        </a>
        <br>
        <span class="time">${timeAgo(story.time)}</span>
      `

      list.appendChild(li)
      li.append(svg)
      li.append(link)
    }
  }
}

const store = useStoriesStore()
store.onChange(() => void renderStories())

void renderStories()
