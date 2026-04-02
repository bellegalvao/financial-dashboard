'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface PrivacyContextValue {
  hidden: boolean
  toggle: () => void
}

const PrivacyContext = createContext<PrivacyContextValue>({ hidden: false, toggle: () => {} })

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('privacy-hidden')
    if (saved === 'true') setHidden(true)
  }, [])

  function toggle() {
    setHidden((prev) => {
      localStorage.setItem('privacy-hidden', String(!prev))
      return !prev
    })
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
