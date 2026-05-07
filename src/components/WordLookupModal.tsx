import { useState } from 'react'
import { lookupWord } from '@/lib/capture'

interface Props {
  open: boolean
  onClose: () => void
  sessionId?: number
  lastAssistantContent?: string
  onCapture: (alreadyKnew: boolean) => void
}

export function WordLookupModal({
  open,
  onClose,
  sessionId,
  lastAssistantContent,
  onCapture,
}: Props) {
  const [term, setTerm] = useState('')
  const [result, setResult] = useState<{
    meaningKo: string
    alreadyKnew: boolean
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleLookup() {
    const t = term.trim()
    if (!t || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await lookupWord({
        term: t,
        sessionOrigin: sessionId,
        contextSentence: lastAssistantContent,
      })
      setResult({
        meaningKo: res.meaning,
        alreadyKnew: res.alreadyKnew,
      })
      onCapture(res.alreadyKnew)
    } catch (e) {
      setError(e instanceof Error ? e.message : '실패')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setTerm('')
    setResult(null)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-bg border border-line rounded-2xl p-5 max-w-md w-full shadow-xl space-y-4 animate-pop-in">
        <div>
          <h2 className="font-display italic text-2xl text-teal">
            <span className="sig-star">단어 뜻</span>
          </h2>
          <p className="text-sm text-ink-soft mt-1">
            모르는 영어 단어를 입력하면 한국어 뜻과 예문을 알려드려요.
            {lastAssistantContent && (
              <span className="block mt-1.5 text-xs">
                회화 맥락이 자동 첨부됩니다.
              </span>
            )}
          </p>
        </div>

        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              handleLookup()
            }
          }}
          placeholder="예: headwind"
          autoFocus
          disabled={loading}
          className="w-full px-3 py-2 border border-line rounded-xl bg-white focus:outline-none focus:border-teal text-sm disabled:opacity-60"
        />

        {!result && (
          <button
            onClick={handleLookup}
            disabled={loading || !term.trim()}
            className="w-full px-4 py-2.5 bg-teal text-bg rounded-2xl text-sm hover:opacity-90 disabled:opacity-40 transition-opacity font-medium"
          >
            {loading ? '찾는 중...' : '뜻 찾기 ✦'}
          </button>
        )}

        {error && (
          <div className="border border-warn bg-warn/10 rounded-xl p-3 text-xs text-warn">
            {error}
          </div>
        )}

        {result && (
          <div className="border-2 border-teal gradient-card-teal rounded-2xl p-4 space-y-2">
            <div className="flex items-baseline gap-3">
              <p className="font-display italic text-xl text-teal">{term}</p>
              <p className="text-sm text-ink">{result.meaningKo}</p>
            </div>
            <p className="text-xs text-teal font-medium pt-1">
              {result.alreadyKnew ? '🔖 이미 저장된 단어' : '🔖 단어가 저장됐어요'}
            </p>
          </div>
        )}

        {result && (
          <button
            onClick={() => {
              setResult(null)
              setTerm('')
            }}
            className="w-full px-4 py-2 border border-line text-ink-soft rounded-2xl text-sm hover:bg-bg-soft"
          >
            다른 단어 찾기
          </button>
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
