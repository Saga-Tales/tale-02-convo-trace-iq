import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { hasApiKey } from '@/lib/anthropic'

export function ApiKeyGate({ children }: { children: ReactNode }) {
  if (!hasApiKey()) {
    return <Navigate to="/settings" replace />
  }
  return <>{children}</>
}
