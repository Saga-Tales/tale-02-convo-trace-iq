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
  const [meaning, setMeaning] = useState<string | null>(null)
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
        contextSentence: lastAssistantContent,
        sessionOrigin: sessionId,
      })
      setMeaning(res.meaning)
      onCapture(res.alreadyKnew)
    } catch (e) {
      setError(e instanceof Error ? e.message : '실패')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setTerm('')
    setMeaning(null)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-bg border border-line rounded-xl p-5 max-w-md w-full shadow-lg space-y-4">
        <div>
          <h2 className="font-display italic text-2xl text-ink">단어 뜻</h2>
          <p className="text-sm text-ink-soft mt-1">
            모르는 영어 단어 또는 짧은 표현을 적어주세요. 한국어 짧은 정의로 답해드려요.
          </p>
        </div>

        {lastAssistantContent && (
          <div className="border border-line bg-bg-soft rounded-md p-3">
            <p className="text-xs uppercase text-ink-soft tracking-wider mb-1">
              방금 AI가 한 말
            </p>
            <p className="text-sm text-ink leading-relaxed line-clamp-3">
              {lastAssistantContent}
            </p>
          </div>
        )}

        <input
          type="text"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void handleLookup()
            }
          }}
          placeholder="예: runway, cut to the chase"
          autoFocus
          disabled={loading}
          className="w-full px-3 py-2 border border-line rounded-md bg-white focus:outline-none focus:border-accent text-sm disabled:opacity-60"
        />

        {!meaning && (
          <button
            onClick={handleLookup}
            disabled={loading || !term.trim()}
            className="w-full px-4 py-2 bg-accent text-bg rounded-md text-sm hover:opacity-90 disabled:opacity-40"
          >
            {loading ? '찾는 중...' : '뜻 보기'}
          </button>
        )}

        {error && (
          <div className="border border-warn bg-warn/10 rounded-md p-3 text-xs text-warn">
            {error}
          </div>
        )}

        {meaning && (
          <div className="space-y-3">
            <div className="border border-accent bg-accent-soft rounded-md p-4">
              <p className="text-xs uppercase text-ink-soft tracking-wider mb-1">
                {term}
              </p>
              <p className="text-ink leading-relaxed">{meaning}</p>
            </div>
            <p className="text-xs text-accent">🔖 단어가 자동 저장됐어요.</p>
            <button
              onClick={() => {
                setMeaning(null)
                setTerm('')
              }}
              className="w-full px-4 py-2 border border-line text-ink-soft rounded-md text-sm hover:bg-bg-soft"
            >
              다른 단어 찾기
            </button>
          </div>
        )}

        <button
          onClick={handleClose}
          className="w-full px-4 py-2 border border-line text-ink-soft rounded-md text-sm hover:bg-bg-soft"
        >
          닫기
        </button>
      </div>
    </div>
  )
}
