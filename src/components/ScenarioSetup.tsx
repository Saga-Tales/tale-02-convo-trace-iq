import { useState, type KeyboardEvent } from 'react'
import {
  type Difficulty,
  type SessionMode,
  DIFFICULTY_GROUPS,
} from '@/db/schema'

export interface SetupOpts {
  mode: SessionMode
  difficulty: Difficulty
  tags: string[]
  hint: string
  participants?: string[]
}

interface Props {
  onGenerate: (opts: SetupOpts) => void
  loading: boolean
}

const PRESET_TAGS = {
  daily: '일상',
  business: '비즈니스',
  office: '사무실',
  shopping: '쇼핑',
  travel: '여행',
  cafe: '카페·음식점',
} as const

type PresetTagKey = keyof typeof PRESET_TAGS
const PRESET_KEYS = Object.keys(PRESET_TAGS) as PresetTagKey[]

export function ScenarioSetup({ onGenerate, loading }: Props) {
  const [mode, setMode] = useState<SessionMode>('solo')
  const [difficulty, setDifficulty] = useState<Difficulty>('B1')
  const [tags, setTags] = useState<string[]>(['daily'])
  const [hint, setHint] = useState('')
  const [participants, setParticipants] = useState<string[]>([])
  const [participantInput, setParticipantInput] = useState('')
  const [customInput, setCustomInput] = useState('')

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    )
  }

  function addCustomTag() {
    const t = customInput.trim()
    if (!t) return
    if (!tags.includes(t)) setTags((prev) => [...prev, t])
    setCustomInput('')
  }

  function handleCustomKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      addCustomTag()
    }
  }

  function addParticipant() {
    const t = participantInput.trim()
    if (!t) return
    if (!participants.includes(t)) setParticipants((prev) => [...prev, t])
    setParticipantInput('')
  }

  function removeParticipant(name: string) {
    setParticipants((prev) => prev.filter((p) => p !== name))
  }

  function handleParticipantKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      addParticipant()
    }
  }

  function handleSubmit() {
    onGenerate({
      mode,
      difficulty,
      tags,
      hint: hint.trim(),
      participants: mode === 'pair' ? participants : undefined,
    })
  }

  const customTags = tags.filter(
    (t) => !(PRESET_KEYS as string[]).includes(t),
  )
  const canSubmit =
    tags.length > 0 &&
    !loading &&
    (mode === 'solo' || participants.length >= 1)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display italic text-4xl text-accent">
          <span className="sig-star">새 회화</span>
        </h1>
        <p className="text-ink-soft text-sm mt-1">
          시나리오를 설정하면 Claude가 영어 회화 상황을 만들어줘요.
        </p>
      </header>

      <section className="border border-line bg-white rounded-2xl p-5 shadow-sm space-y-5">
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
              label="페어 (호스트)"
              sub="N명 직접 만남"
            />
          </ChoiceRow>
          {mode === 'pair' && (
            <p className="text-xs text-ink-soft mt-2 leading-relaxed">
              💡 게스트로 합류할 거면 회화 페이지의 <span className="text-accent font-medium">"QR로 합류"</span> 버튼을 눌러 호스트의 QR을 찍으세요.
            </p>
          )}
        </Field>

        {mode === 'pair' && (
          <Field
            label="참여자"
            hint={`(나 외에 ${participants.length}명)`}
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={participantInput}
                onChange={(e) => setParticipantInput(e.target.value)}
                onKeyDown={handleParticipantKeyDown}
                placeholder="예: 보욱 (Enter 추가)"
                className="flex-1 px-3 py-2 border border-line rounded-xl bg-bg-soft text-sm focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={addParticipant}
                disabled={!participantInput.trim()}
                className="px-3 py-2 border border-line text-ink-soft rounded-xl text-sm hover:bg-bg-soft disabled:opacity-40"
              >
                추가
              </button>
            </div>
            {participants.length > 0 && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {participants.map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent text-bg rounded-full text-xs"
                  >
                    {p}
                    <button
                      type="button"
                      onClick={() => removeParticipant(p)}
                      className="hover:opacity-70 leading-none"
                      aria-label={`${p} 제거`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {participants.length === 0 && (
              <p className="text-xs text-warn mt-2">
                최소 1명 추가해주세요. (나 + {participantInput || 'N'}명)
              </p>
            )}
          </Field>
        )}

        <Field label="난이도" hint="(CEFR 기준)">
          <div className="space-y-2">
            {(Object.entries(DIFFICULTY_GROUPS) as Array<
              [string, readonly Difficulty[]]
            >).map(([groupName, levels]) => (
              <div key={groupName}>
                <p className="text-xs text-ink-soft mb-1.5">{groupName}</p>
                <ChoiceRow>
                  {levels.map((d) => (
                    <Choice
                      key={d}
                      active={difficulty === d}
                      onClick={() => setDifficulty(d)}
                      label={d}
                    />
                  ))}
                </ChoiceRow>
              </div>
            ))}
          </div>
        </Field>

        <Field label="카테고리" hint="(여러 개 가능, 직접 추가도 OK)">
          <ChoiceRow>
            {PRESET_KEYS.map((t) => (
              <Choice
                key={t}
                active={tags.includes(t)}
                onClick={() => toggleTag(t)}
                label={PRESET_TAGS[t]}
              />
            ))}
          </ChoiceRow>

          <div className="flex gap-2 mt-2.5">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={handleCustomKeyDown}
              placeholder="기타 카테고리 (Enter 추가)"
              className="flex-1 px-2.5 py-1.5 border border-line rounded-xl bg-bg-soft text-sm focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="button"
              onClick={addCustomTag}
              disabled={!customInput.trim()}
              className="px-3 py-1.5 border border-line text-ink-soft rounded-xl text-sm hover:bg-bg-soft disabled:opacity-40"
            >
              추가
            </button>
          </div>

          {customTags.length > 0 && (
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {customTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-accent text-bg rounded-full text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className="hover:opacity-70 leading-none"
                    aria-label={`${tag} 제거`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

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
            placeholder={
              mode === 'pair'
                ? '예: 쇼핑 (짧게, 점원과 거래) / 카페에서 친구와 깊은 토론 / 공항 체크인 / 면접 인터뷰...'
                : '예: VC 미팅 같은 분위기, 공항 체크인, 친구와 카페에서...'
            }
            rows={2}
            className="w-full px-3 py-2 border border-line rounded-xl bg-bg-soft focus:outline-none focus:border-accent resize-none text-sm transition-colors"
          />
        </Field>

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full px-4 py-3 bg-accent text-bg rounded-2xl font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-sm"
        >
          {loading ? '시나리오 생성 중...' : '시나리오 생성 ✦'}
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
      className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
        active
          ? 'bg-accent text-bg border-accent shadow-sm'
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
