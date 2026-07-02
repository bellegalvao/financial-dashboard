'use client'

import { useSyncExternalStore } from 'react'

// Nothing to subscribe to — "mounted" never changes once true — but
// useSyncExternalStore still gives us the correct SSR-safe transition
// from false (server + first client render) to true (post-hydration)
// without a direct setState call inside an effect.
function subscribe() {
  return () => {}
}

function getSnapshot() {
  return true
}

function getServerSnapshot() {
  return false
}

export function useHasMounted() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
