import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, type VocabItem, type PhraseItem } from '@/db/schema'

type Tab = 'phrase' | 'vocab'

export function Vocab() {
  const [tab, setTab] = useState<Tab>('phrase')
  const [vocab, setVocab] = useState<VocabItem[] | null>(null)
  const [phrases, setPhrases] = useState<PhraseItem[] | null>(null)

  useEffect(() => {
    db.vocabulary.orderBy('capturedAt').reverse().toArray().then(setVocab)
    db.phrases.orderBy('capturedAt').reverse().toArray().then(setPhrases)
  }, [])

  const phraseCount = phrases?.length ?? 0
  const vocabCount = vocab?.length ?? 0

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display italic text-4xl text-accent">
          <span className="sig-star">단어 / 표현</span>
        </h1>
        <p className="text-ink-soft text-sm mt-1">
          회화 중 박제된 모든 학습 모먼트
        </p>
      </header>

      <div className="flex gap-1 border-b-2 border-line">
        <TabButton
          active={tab === 'phrase'}
          onClick={() => setTab('phrase')}
          label={`표현 ${phrases ? `(${phraseCount})` : ''}`}
        />
        <TabButton
          active={tab === 'vocab'}
          onClick={() => setTab('vocab')}
          label={`단어 ${vocab ? `(${vocabCount})` : ''}`}
        />
      </div>

      {tab === 'phrase' && <PhraseList phrases={phrases} />}
      {tab === 'vocab' && <VocabList items={vocab} />}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 -mb-0.5 text-sm transition-colors border-b-2 ${
        active
          ? 'border-accent text-accent font-medium'
          : 'border-transparent text-ink-soft hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}

function PhraseList({ phrases }: { phrases: PhraseItem[] | null }) {
  if (phrases === null) {
    return <p className="text-ink-soft text-sm">불러오는 중...</p>
  }
  if (phrases.length === 0) {
    return (
      <section className="border border-line gradient-card rounded-2xl p-5">
        <p className="text-sm text-ink leading-relaxed">
          아직 박제된 표현이 없어요.{' '}
          <Link to="/chat" className="text-accent underline font-medium">
            회화
          </Link>{' '}
          중 "한국어로?" 버튼으로 막힌 표현을 박제해보세요.
        </p>
      </section>
    )
  }
  return (
    <div className="space-y-2.5">
      {phrases.map((p) => (
        <PhraseCard key={p.id} phrase={p} />
      ))}
    </div>
  )
}

function PhraseCard({ phrase }: { phrase: PhraseItem }) {
  const date = new Date(phrase.capturedAt)
  return (
    <article className="border border-line bg-white rounded-2xl p-4 shadow-sm lift">
      <p className="font-display italic text-ink text-base leading-relaxed">
        "{phrase.expressionEn}"
      </p>
      <p className="text-sm mt-1.5">
        <span className="text-ink-soft">의도: </span>
        <span className="text-ink">{phrase.intentKo}</span>
      </p>
      <footer className="text-xs text-ink-soft mt-2 flex items-center gap-2 flex-wrap">
        <span>
          {date.toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <span>·</span>
        <TypeBadge type={phrase.type} />
        {phrase.source === 'imported' && (
          <>
            <span>·</span>
            <span className="text-accent">imported</span>
          </>
        )}
      </footer>
    </article>
  )
}

function TypeBadge({ type }: { type: PhraseItem['type'] }) {
  const labels: Record<PhraseItem['type'], string> = {
    stuck: '막혔던 표현',
    new: '새로 만난 표현',
    good: '좋은 표현',
  }
  return <span>{labels[type]}</span>
}

function VocabList({ items }: { items: VocabItem[] | null }) {
  if (items === null) {
    return <p className="text-ink-soft text-sm">불러오는 중...</p>
  }
  if (items.length === 0) {
    return (
      <section className="border border-line gradient-card-teal rounded-2xl p-5">
        <p className="text-sm text-ink leading-relaxed">
          아직 박제된 단어가 없어요.{' '}
          <Link to="/chat" className="text-accent underline font-medium">
            회화
          </Link>{' '}
          중 "단어 뜻" 버튼으로 모르는 단어를 찾아보세요.
        </p>
      </section>
    )
  }
  return (
    <div className="space-y-2.5">
      {items.map((v) => (
        <VocabCard key={v.id} item={v} />
      ))}
    </div>
  )
}

function VocabCard({ item }: { item: VocabItem }) {
  const date = new Date(item.capturedAt)
  return (
    <article className="border border-line bg-white rounded-2xl p-4 shadow-sm lift">
      <div className="flex items-baseline gap-3">
        <span className="font-display italic text-lg text-teal">
          {item.term}
        </span>
        <span className="text-sm text-ink">{item.meaningKo}</span>
      </div>
      {item.contextSentence && (
        <p className="text-xs text-ink-soft mt-2 leading-relaxed line-clamp-2 italic">
          "{item.contextSentence}"
        </p>
      )}
      <footer className="text-xs text-ink-soft mt-2 flex items-center gap-2 flex-wrap">
        <span>
          {date.toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
        {item.source === 'imported' && (
          <>
            <span>·</span>
            <span className="text-accent">imported</span>
          </>
        )}
      </footer>
    </article>
  )
}
