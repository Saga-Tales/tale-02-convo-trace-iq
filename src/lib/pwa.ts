import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type Platform = 'ios' | 'android' | 'desktop' | 'other'

/**
 * 디바이스 플랫폼 감지.
 * iOS는 자동 PWA 설치 불가능 → 수동 가이드 강조 필요.
 */
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent

  // iPad가 iPadOS 13+ 부터 데스크탑 Safari로 위장하므로 별도 체크
  const isIPad =
    /iPad/.test(ua) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))

  if (/iPhone|iPod/.test(ua) || isIPad) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Mac|Windows|Linux|CrOS/.test(ua) && !/Mobile/.test(ua)) return 'desktop'
  return 'other'
}

/**
 * 이미 PWA로 standalone 실행 중인지.
 * - display-mode: standalone : Android Chrome, Desktop Chrome/Edge PWA
 * - navigator.standalone (iOS Safari 한정)
 */
function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  // iOS Safari 한정 비표준 API
  const nav = window.navigator as unknown as { standalone?: boolean }
  if (nav.standalone === true) return true
  return false
}

/**
 * PWA 설치 hook.
 *
 * 동작:
 * - Android Chrome / Desktop Chrome·Edge: beforeinstallprompt 이벤트 잡아서 deferredPrompt에 저장.
 *   사용자가 install() 호출하면 native 설치 다이얼로그 띄움.
 * - iOS Safari: beforeinstallprompt 미지원. canInstall은 항상 false.
 *   사용자에게 수동 가이드 보여줘야 함.
 * - 이미 standalone으로 실행 중: installed=true.
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => detectStandalone())

  useEffect(() => {
    if (installed) return

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    function onAppInstalled() {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        onBeforeInstallPrompt,
      )
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [installed])

  async function install(): Promise<boolean> {
    if (!deferredPrompt) return false
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
      return outcome === 'accepted'
    } catch (e) {
      console.warn('[pwa] install 실패:', e)
      return false
    }
  }

  return {
    canInstall: !!deferredPrompt,
    installed,
    install,
  }
}
