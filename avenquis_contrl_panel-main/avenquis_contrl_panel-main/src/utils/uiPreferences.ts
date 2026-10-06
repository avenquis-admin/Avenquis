/**
 * Avenquis Control Panel - Local UI Preferences Storage
 * Manages client-side display preferences (theme, sidebar, density, polling interval).
 * STRICTLY SEPARATED from authoritative backend platform settings.
 * Local UI preferences are stored only in this browser's localStorage and never sent as platform mutations.
 */

import { LocalUiPreferences } from '../types';

const UI_PREFERENCES_KEY = 'avenquis_local_ui_preferences_v1';

export const DEFAULT_UI_PREFERENCES: LocalUiPreferences = {
  theme: 'warm-institutional',
  sidebarDefault: 'expanded',
  tableDensity: 'normal',
  autoRefreshInterval: 0, // Manual only by default
  timestampFormat: 'relative',
  confirmDangerActions: true,
};

export function getLocalUiPreferences(): LocalUiPreferences {
  try {
    const raw = localStorage.getItem(UI_PREFERENCES_KEY);
    if (!raw) return DEFAULT_UI_PREFERENCES;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_UI_PREFERENCES,
      ...parsed,
    };
  } catch {
    return DEFAULT_UI_PREFERENCES;
  }
}

export function saveLocalUiPreferences(prefs: Partial<LocalUiPreferences>): LocalUiPreferences {
  try {
    const current = getLocalUiPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(UI_PREFERENCES_KEY, JSON.stringify(updated));
    // Dispatch custom event for reactive components
    window.dispatchEvent(new CustomEvent('avenquis_ui_preferences_changed', { detail: updated }));
    return updated;
  } catch (e) {
    console.warn('[uiPreferences] Unable to write to localStorage:', e);
    return DEFAULT_UI_PREFERENCES;
  }
}
