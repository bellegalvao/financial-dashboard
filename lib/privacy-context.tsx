'use client'

import { createContext, useContext } from 'react'
import { useLocalStorageBoolean } from './use-local-storage-boolean'

interface PrivacyContextValue {
  hidden: boolean
  toggle: () => void
}

const PrivacyContext = createContext<PrivacyContextValue>({ hidden: false, toggle: () => {} })

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useLocalStorageBoolean('privacy-hidden', false)

  function toggle() {
    setHidden((prev) => !prev)
  }

  return (
    <PrivacyContext.Provider value={{ hidden, toggle }}>
      {children}
    </PrivacyContext.Provider>
  )
}

export function usePrivacy() {
  return useContext(PrivacyContext)
}
