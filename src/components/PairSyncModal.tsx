import { useEffect, useState } from 'react'
import {
  buildCaptureShare,
  decodePayload,
  encodePayload,
  mergeCaptureShares,
  type CaptureShare,
} from '@/lib/share'
import { mergeCaptureShare } from '@/lib/sync'
import type { Session } from '@/db/schema'
import { QRCodeView } from './QRCodeView'
import { QRScanner } from './QRScanner'

interface Props {
  open: boolean
  session: Session & { id: number }
  myName: string
  onComplete: () => void
}

type HostStep = 'collecting' | 'broadcasting' | 'done'
type GuestStep = 'sending' | 'receiving' | 'done'

export function PairSyncModal({ open, session, myName, onComplete }: Props) {
  if (!open) return null
  if (session.role === 'host') {
    return <HostSyncFlow session={session} myName={myName} onComplete={onComplete} />
  }
  return <GuestSyncFlow session={session} myName={myName} onComplete={onComplete} />
}

// =============================================================================
// HOST flow
// =============================================================================

function HostSyncFlow({
  session,
  myName,
  onComplete,
}: {
  session: Session & { id: number }
  myName: string
  onComplete: () => void
}) {
  const [step, setStep] = useState<HostStep>('collecting')
  const [myShare, setMyShare] = useState<CaptureShare | null>(null)
  const [guestShares, setGuestShares] = useState<CaptureShare[]>([])
  const [merged, setMerged] = useState<CaptureShare | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [mergeStats, setMergeStats] = useState<{
    inserted: number
    skipped: number
  } | null>(null)

  const expectedGuestCount = session.participants?.length ?? 0
  const remaining = expectedGuestCount - guestShares.length

  // 첫 진입 시 자기 캡처 빌드
  useEffect(() => {
    if (session.sessionUuid) {
      buildCaptureShare({
        sessionId: session.id,
        sessionUuid: session.sessionUuid,
        participantName: myName,
      }).then(setMyShare)
    }
  }, [session.id, session.sessionUuid, myName])

  function handleScan(data: string) {
    try {
      const payload = decodePayload(data)
      if (payload.kind !== 'capture') {
        setScanError('이 QR은 캡처가 아니에요. 게스트의 캡처 QR을 찍어주세요.')
        return
      }
      const share = payload.data
      if (share.sessionUuid !== session.sessionUuid) {
        setScanError('다른 세션의 QR이에요. 같은 회화의 게스트 QR만 찍어주세요.')
        return
      }
      // 이미 받은 게스트인지 체크
      if (guestShares.some((g) => g.participantName === share.participantName)) {
        setScanError(`${share.participantName}의 캡처는 이미 받았어요.`)
        return
      }
      setScanError(null)
      setGuestShares((prev) => [...prev, share])
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'QR 해석 실패')
    }
  }

  async function handleMergeAndBroadcast() {
    if (!myShare) return
    const m = mergeCaptureShares(myShare, guestShares)
    setMerged(m)

    // 자기 DB에 게스트 캡처 머지 (자기 것은 이미 있음)
    let inserted = 0
    let skipped = 0
    for (const g of guestShares) {
      const r = await mergeCaptureShare(g, session.id)
      inserted += r.phrasesInserted + r.vocabInserted
      skipped += r.phrasesSkipped + r.vocabSkipped
    }
    setMergeStats({ inserted, skipped })
    setStep('broadcasting')
  }

  function handleSkipGuests() {
    // 게스트 0명이거나 못 받았을 때 — 그냥 자기 거만 가지고 마무리
    setStep('done')
  }

  function handleDone() {
    setStep('done')
  }

  if (step === 'collecting') {
    return (
      <Backdrop>
        <div className="bg-bg border border-line rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4 animate-pop-in max-h-[90vh] overflow-y-auto">
          <header>
            <h2 className="font-display italic text-2xl text-accent">
              <span className="sig-star">게스트 캡처 받기</span>
            </h2>
            <p className="text-sm text-ink-soft mt-1">
              게스트들이 자기 캡처 QR을 띄우면 차례로 찍어주세요. ({guestShares.length}/{expectedGuestCount})
            </p>
          </header>

          <QRScanner onResult={handleScan} stopOnResult={false} />

          {scanError && (
            <div className="border border-warn bg-warn/10 rounded-xl p-3 text-sm text-warn">
              {scanError}
            </div>
          )}

          {guestShares.length > 0 && (
            <div className="border border-line bg-bg-soft rounded-xl p-3 space-y-1">
              <p className="text-xs uppercase text-ink-soft tracking-wider mb-1">
                받은 캡처
              </p>
              {guestShares.map((g) => (
                <div key={g.participantName} className="flex items-center justify-between text-sm">
                  <span className="text-accent">✓ {g.participantName}</span>
                  <span className="text-xs text-ink-soft">
                    표현 {g.phrases.length} · 단어 {g.vocabulary.length}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleMergeAndBroadcast}
              disabled={!myShare}
              className="flex-1 px-4 py-2.5 bg-accent text-bg rounded-2xl text-sm font-medium hover:opacity-90 disabled:opacity-40"
            >
              {remaining > 0
                ? `${guestShares.length}명만으로 통합 & 보내기`
                : '모두 받음 — 통합 & 보내기'}
            </button>
            <button
              onClick={handleSkipGuests}
              className="px-4 py-2.5 border border-line text-ink-soft rounded-2xl text-sm hover:bg-bg-soft"
            >
              건너뛰기
            </button>
          </div>
        </div>
      </Backdrop>
    )
  }

  if (step === 'broadcasting' && merged) {
    return (
      <Backdrop>
        <div className="bg-bg border border-line rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4 animate-pop-in max-h-[90vh] overflow-y-auto">
          <header>
            <h2 className="font-display italic text-2xl text-accent">
              <span className="sig-star">통합본 보내기</span>
            </h2>
            <p className="text-sm text-ink-soft mt-1">
              게스트 {guestShares.length}명이 이 QR을 찍으면 모두 같은 통합본을 가져요.
            </p>
          </header>

          <QRCodeView value={encodePayload({ kind: 'capture', data: merged })} />

          <div className="border border-line bg-bg-soft rounded-xl p-3 text-xs text-ink-soft">
            <p>표현 {merged.phrases.length}개 · 단어 {merged.vocabulary.length}개</p>
            {mergeStats && (
              <p className="mt-1 text-accent">
                내 DB: 새로 {mergeStats.inserted}개, 중복 {mergeStats.skipped}개
              </p>
            )}
          </div>

          <button
            onClick={handleDone}
            className="w-full px-4 py-2.5 bg-accent text-bg rounded-2xl text-sm font-medium hover:opacity-90"
          >
            모두 찍었음 — 완료
          </button>
        </div>
      </Backdrop>
    )
  }

  if (step === 'done') {
    return (
      <Backdrop>
        <div className="bg-bg border border-line rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4 animate-pop-in">
          <header>
            <h2 className="font-display italic text-2xl text-accent">
              <span className="sig-star">동기화 완료</span>
            </h2>
            <p className="text-sm text-ink-soft mt-1">
              {mergeStats
                ? `통합본을 자기 DB에 머지 완료. 새로 ${mergeStats.inserted}개 추가됨.`
                : '자기 캡처만 가지고 마무리.'}
            </p>
          </header>
          <button
            onClick={onComplete}
            className="w-full px-4 py-2.5 bg-accent text-bg rounded-2xl text-sm font-medium hover:opacity-90"
          >
            기록 페이지로 →
          </button>
        </div>
      </Backdrop>
    )
  }

  return null
}

// =============================================================================
// GUEST flow
// =============================================================================

function GuestSyncFlow({
  session,
  myName,
  onComplete,
}: {
  session: Session & { id: number }
  myName: string
  onComplete: () => void
}) {
  const [step, setStep] = useState<GuestStep>('sending')
  const [myShare, setMyShare] = useState<CaptureShare | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [mergeStats, setMergeStats] = useState<{
    inserted: number
    skipped: number
  } | null>(null)

  useEffect(() => {
    if (session.sessionUuid) {
      buildCaptureShare({
        sessionId: session.id,
        sessionUuid: session.sessionUuid,
        participantName: myName,
      }).then(setMyShare)
    }
  }, [session.id, session.sessionUuid, myName])

  function handleSentClick() {
    setStep('receiving')
  }

  async function handleReceive(data: string) {
    try {
      const payload = decodePayload(data)
      if (payload.kind !== 'capture') {
        setScanError('이 QR은 캡처가 아니에요. 호스트의 통합본 QR을 찍어주세요.')
        return
      }
      const share = payload.data
      if (share.sessionUuid !== session.sessionUuid) {
        setScanError('다른 세션의 QR이에요.')
        return
      }
      const r = await mergeCaptureShare(share, session.id)
      setMergeStats({
        inserted: r.phrasesInserted + r.vocabInserted,
        skipped: r.phrasesSkipped + r.vocabSkipped,
      })
      setScanError(null)
      setStep('done')
    } catch (e) {
      setScanError(e instanceof Error ? e.message : 'QR 해석 실패')
    }
  }

  function handleSkip() {
    setStep('done')
  }

  if (step === 'sending') {
    return (
      <Backdrop>
        <div className="bg-bg border border-line rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4 animate-pop-in max-h-[90vh] overflow-y-auto">
          <header>
            <h2 className="font-display italic text-2xl text-accent">
              <span className="sig-star">내 캡처 보내기</span>
            </h2>
            <p className="text-sm text-ink-soft mt-1">
              호스트가 이 QR을 찍어요. 다 됐으면 다음 단계로.
            </p>
          </header>

          {myShare ? (
            <>
              <QRCodeView value={encodePayload({ kind: 'capture', data: myShare })} />
              <div className="border border-line bg-bg-soft rounded-xl p-3 text-xs text-ink-soft">
                <p>표현 {myShare.phrases.length}개 · 단어 {myShare.vocabulary.length}개</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-soft animate-pulse">캡처 준비 중...</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSentClick}
              disabled={!myShare}
              className="flex-1 px-4 py-2.5 bg-accent text-bg rounded-2xl text-sm font-medium hover:opacity-90 disabled:opacity-40"
            >
              호스트가 찍음 — 통합본 받기
            </button>
            <button
              onClick={handleSkip}
              className="px-4 py-2.5 border border-line text-ink-soft rounded-2xl text-sm hover:bg-bg-soft"
            >
              건너뛰기
            </button>
          </div>
        </div>
      </Backdrop>
    )
  }

  if (step === 'receiving') {
    return (
      <Backdrop>
        <div className="bg-bg border border-line rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4 animate-pop-in max-h-[90vh] overflow-y-auto">
          <header>
            <h2 className="font-display italic text-2xl text-accent">
              <span className="sig-star">통합본 받기</span>
            </h2>
            <p className="text-sm text-ink-soft mt-1">
              호스트의 통합본 QR을 카메라에 비추세요.
            </p>
          </header>

          <QRScanner onResult={handleReceive} />

          {scanError && (
            <div className="border border-warn bg-warn/10 rounded-xl p-3 text-sm text-warn">
              {scanError}
            </div>
          )}

          <button
            onClick={handleSkip}
            className="w-full px-4 py-2 border border-line text-ink-soft rounded-2xl text-sm hover:bg-bg-soft"
          >
            건너뛰기
          </button>
        </div>
      </Backdrop>
    )
  }

  if (step === 'done') {
    return (
      <Backdrop>
        <div className="bg-bg border border-line rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4 animate-pop-in">
          <header>
            <h2 className="font-display italic text-2xl text-accent">
              <span className="sig-star">동기화 완료</span>
            </h2>
            <p className="text-sm text-ink-soft mt-1">
              {mergeStats
                ? `호스트 통합본 머지 완료. 새로 ${mergeStats.inserted}개 추가됨.`
                : '자기 캡처만 가지고 마무리.'}
            </p>
          </header>
          <button
            onClick={onComplete}
            className="w-full px-4 py-2.5 bg-accent text-bg rounded-2xl text-sm font-medium hover:opacity-90"
          >
            기록 페이지로 →
          </button>
        </div>
      </Backdrop>
    )
  }

  return null
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      {children}
    </div>
  )
}
