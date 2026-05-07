import { useState } from 'react'
import type { Difficulty, SessionMode } from '@/db/schema'

export interface SetupOpts {
  mode: SessionMode
  difficulty: Difficulty
  tags: string[]
  hint: string
  partnerName?: string
}

interface Props {
  onGenerate: (opts: SetupOpts) => void
  loading: boolean
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: '초급 (A2)',
  intermediate: '중급 (B1-B2)',
  advanced: '고급 (C1)',
}

const TAG_LABELS = {
  business: '비즈니스',
  daily: '일상',
  office: '사무실',
} as const

type TagKey = keyof typeof TAG_LABELS

export function ScenarioSetup({ onGenerate, loading }: Props) {
  const [mode, setMode] = useState<SessionMode>('solo')
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate')
  const [tags, setTags] = useState<TagKey[]>(['daily'])
  const [hint, setHint] = useState('')
  const [partnerName, setPartnerName] = useState('')

  function toggleTag(tag: TagKey) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  function handleSubmit() {
    onGenerate({
      mode,
      difficulty,
      tags,
      hint: hint.trim(),
      partnerName: mode === 'pair' ? partnerName.trim() || undefined : undefined,
    })
  }

  const canSubmit = tags.length > 0 && !loading

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display italic text-4xl text-ink">새 회화</h1>
        <p className="text-ink-soft text-sm mt-1">
          시나리오를 설정하면 Claude가 영어 회화 상황을 만들어줘요.
        </p>
      </header>

      <section className="border border-line bg-white rounded-xl p-5 shadow-sm space-y-5">
        <Field label="모드">
          <ChoiceRow>
            <Choice
              active={mode === 'solo'}
              onClick={() => setMode('solo')}
              label="솔로"
              sub="AI와 회화"
            />
            <Choice
              active={mode === 'pair'}
              onClick={() => setMode('pair')}
              label="페어"
              sub="직접 만남"
            />
          </ChoiceRow>
        </Field>

        {mode === 'pair' && (
          <Field label="파트너 이름" hint="(선택)">
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="예: 보욱"
              className="w-full px-3 py-2 border border-line rounded-md bg-bg-soft focus:outline-none focus:border-accent"
            />
          </Field>
        )}

        <Field label="난이도">
          <ChoiceRow>
            {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
              <Choice
                key={d}
                active={difficulty === d}
                onClick={() => setDifficulty(d)}
                label={DIFFICULTY_LABELS[d]}
              />
            ))}
          </ChoiceRow>
        </Field>

        <Field label="카테고리" hint="(여러 개 가능)">
          <ChoiceRow>
            {(Object.keys(TAG_LABELS) as TagKey[]).map((t) => (
              <Choice
                key={t}
                active={tags.includes(t)}
                onClick={() => toggleTag(t)}
                label={TAG_LABELS[t]}
              />
            ))}
          </ChoiceRow>
          {tags.length === 0 && (
            <p className="text-xs text-warn mt-2">
              카테고리를 1개 이상 선택해주세요.
            </p>
          )}
        </Field>

        <Field label="추가 요청" hint="(선택)">
          <textarea
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="예: VC 미팅 같은 분위기, 공항 체크인, 친구와 카페에서..."
            rows={2}
            className="w-full px-3 py-2 border border-line rounded-md bg-bg-soft focus:outline-none focus:border-accent resize-none text-sm"
          />
        </Field>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full px-4 py-2.5 bg-accent text-bg rounded-md font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? '시나리오 생성 중...' : '시나리오 생성'}
        </button>
      </section>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-sm font-medium text-ink block mb-2">
        {label}
        {hint && <span className="text-ink-soft font-normal ml-1">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

function ChoiceRow({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-2 flex-wrap">{children}</div>
}

function Choice({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean
  onClick: () => void
  label: string
  sub?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
        active
          ? 'bg-accent text-bg border-accent'
          : 'border-line text-ink-soft hover:bg-bg-soft hover:text-ink'
      }`}
    >
      {label}
      {sub && (
        <span className={`ml-1.5 text-xs ${active ? 'opacity-80' : 'opacity-60'}`}>
          {sub}
        </span>
      )}
    </button>
  )
}
