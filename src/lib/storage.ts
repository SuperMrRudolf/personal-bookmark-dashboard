import type { DashboardSettings } from './types'

const SETTINGS_KEY = 'dashboard-settings'

const defaultSettings: DashboardSettings = {
  locked: true,
}

function canUseChromeStorage() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local)
}

export async function loadSettings(): Promise<DashboardSettings> {
  if (!canUseChromeStorage()) {
    return defaultSettings
  }

  const stored = await chrome.storage.local.get(SETTINGS_KEY)
  return {
    ...defaultSettings,
    ...(stored[SETTINGS_KEY] as Partial<DashboardSettings> | undefined),
  }
}

export async function saveSettings(settings: DashboardSettings) {
  if (!canUseChromeStorage()) {
    return
  }

  await chrome.storage.local.set({
    [SETTINGS_KEY]: settings,
  })
}

