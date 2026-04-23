import { saveQuickSaveDraft } from './lib/storage'

const QUICK_SAVE_COMMAND = 'quick-save-current-page'

function openDashboard(search = '') {
  void chrome.tabs.create({
    url: chrome.runtime.getURL(`index.html${search}`),
  })
}

chrome.action.onClicked.addListener(() => {
  openDashboard()
})

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== QUICK_SAVE_COMMAND) {
    return
  }

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  })

  if (!activeTab?.url) {
    return
  }

  await saveQuickSaveDraft({
    name: activeTab.title?.trim() || activeTab.url,
    url: activeTab.url,
    capturedAt: new Date().toISOString(),
  })

  openDashboard('?intent=quick-save')
})
