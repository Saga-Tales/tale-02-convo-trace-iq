import { useState } from 'react'
import { decodePayload, type ScenarioShare } from '@/lib/share'
import { QRScanner } from './QRScanner'

interface Props {
  open: boolean
  onClose: () => void
  onScenarioReceived: (share: ScenarioShare) => void
}

export function JoinByQRModal({ open, onClose, onScenarioReceived }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [received, setReceived] = useState<ScenarioShare | null>(null)

  if (!open) return null

  function handleResult(data: string) {
    try {
      const payload = decodePayload(data)
      if (payload.kind !== 'scenario') {
        setError('이 QR은 시나리오가 아니에요. 호스트의 시나리오 QR을 찍어주세요.')
        return
      }
      setReceived(payload.data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'QR 해석 실패')
    }
  }

  function handleConfirm() {
    if (received) {
      onScenarioReceived(received)
    }
  }

  function handleClose() {
    setError(null)
    setReceived(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-bg border border-line rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4 animate-pop-in max-h-[90vh] overflow-y-auto">
        <header>
          <h2 className="font-display italic text-2xl text-accent">
            <span className="sig-star">QR로 합류</span>
          </h2>
          <p className="text-sm text-ink-soft mt-1">
            호스트의 시나리오 QR을 카메라에 비추세요.
          </p>
        </header>

        {!received && <QRScanner onResult={handleResult} />}

        {error && (
          <div className="border border-warn bg-warn/10 rounded-xl p-3 text-sm text-warn">
            {error}
          </div>
        )}

        {received && (
          <div className="space-y-3">
            <div className="border-2 border-accent gradient-card rounded-2xl p-4 space-y-2">
              <p className="text-xs uppercase text-accent tracking-wider font-semibold">
                ✓ 시나리오 받음
              </p>
              <p className="font-display italic text-xl text-ink">
                {received.scenario.title}
              </p>
              <p className="text-sm text-ink-soft">
                호스트: {received.hostName} · 난이도 {received.difficulty}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {received.participants.map((p) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 bg-bg border border-line text-ink-soft rounded-full text-xs"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full px-4 py-2.5 bg-accent text-bg rounded-2xl text-sm font-medium hover:opacity-90"
            >
              이 시나리오로 시작 →
            </button>
          </div>
        )}

        <button
          onClick={handleClose}
          className="w-full px-4 py-2 border border-line text-ink-soft rounded-2xl text-sm hover:bg-bg-soft"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
