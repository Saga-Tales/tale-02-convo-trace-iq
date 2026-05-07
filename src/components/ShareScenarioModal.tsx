import { encodePayload, type ScenarioShare } from '@/lib/share'
import { QRCodeView } from './QRCodeView'

interface Props {
  open: boolean
  onClose: () => void
  share: ScenarioShare
}

export function ShareScenarioModal({ open, onClose, share }: Props) {
  if (!open) return null

  const payload = encodePayload({ kind: 'scenario', data: share })
  const guestCount = share.participants.length // 호스트 본인 외 참여자

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-bg border border-line rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4 animate-pop-in max-h-[90vh] overflow-y-auto">
        <header>
          <h2 className="font-display italic text-2xl text-accent">
            <span className="sig-star">시나리오 공유</span>
          </h2>
          <p className="text-sm text-ink-soft mt-1">
            게스트 {guestCount}명이 이 QR을 찍으면 같은 시나리오로 페어 회화 시작.
          </p>
        </header>

        <QRCodeView value={payload} />

        <div className="border border-line bg-bg-soft rounded-xl p-3 space-y-1">
          <p className="text-xs text-ink-soft uppercase tracking-wider">참여자</p>
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2 py-0.5 bg-accent text-bg rounded-full text-xs">
              {share.hostName} (호스트)
            </span>
            {share.participants.map((p) => (
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
          onClick={onClose}
          className="w-full px-4 py-2.5 bg-accent text-bg rounded-2xl text-sm font-medium hover:opacity-90"
        >
          모두 찍었음 — 회화 시작 →
        </button>
      </div>
    </div>
  )
}
