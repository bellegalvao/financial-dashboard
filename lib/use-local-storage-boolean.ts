'use client'

import { useCallback, useSyncExternalStore } from 'react'

// Native 'storage' events only fire in other tabs, so we dispatch our own
// to keep useSyncExternalStore reactive to changes made in this tab too.
const LOCAL_CHANGE_EVENT = 'local-storage-boolean-change'

function subscribe(callback: () => void) {
  window.addEventListener(LOCAL_CHANGE_EVENT, callback)
  return () => window.removeEventListener(LOCAL_CHANGE_EVENT, callback)
}

export function useLocalStorageBoolean(key: string, defaultValue: boolean) {
  const getSnapshot = useCallback(() => {
    const saved = localStorage.getItem(key)
    return saved === null ? defaultValue : saved === 'true'
  }, [key, defaultValue])

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue])

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setValue = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === 'function' ? next(getSnapshot()) : next
    localStorage.setItem(key, String(resolved))
    window.dispatchEvent(new Event(LOCAL_CHANGE_EVENT))
  }, [key, getSnapshot])

  return [value, setValue] as const
}
