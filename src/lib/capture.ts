import { callOnce } from './anthropic'
import { db } from '@/db/schema'

const KO_TO_EN_SYSTEM = `사용자가 한국어로 표현하고 싶은 의도를 줍니다.

응답은 반드시 아래 JSON 형식으로만 (markdown 백틱 X, 설명 X):

{
  "english": "한 문장 영어 표현 (자연스러운 회화체)",
  "literal": "한국어 직역 (한 줄)"
}

규칙:
- 영어는 1문장. 절대 길게 답하지 말 것.
- literal은 한국어 직역. 의역이 아니라 영어 구조를 이해할 수 있는 직역.
- 어휘 설명, 대안 표현, 추가 설명 X. 가장 자연스러운 1개만.
- 시나리오 컨텍스트가 주어지면 그 톤에 맞게.`

const WORD_LOOKUP_SYSTEM = `사용자가 모르는 영어 단어 또는 짧은 표현을 줍니다.

응답은 반드시 아래 JSON 형식으로만 (markdown 백틱 X, 설명 X):

{
  "meaning": "한국어 짧은 정의 (1줄, 50자 이내)"
}

규칙:
- 정의는 1줄. 어원·동의어·예문·추가 설명 X.
- 명사면 "~ (것/사람)", 동사면 "~하다", 형용사면 "~한" 형태로
- 문맥이 주어지면 그 문맥에서의 의미만`

export interface KoToEnResult {
  english: string
  literal: string
  phraseId: number
}

export async function askKoToEn(opts: {
  koreanIntent: string
  sessionId?: number
  scenarioContext?: string
}): Promise<KoToEnResult> {
  const intent = opts.koreanIntent.trim()
  if (!intent) throw new Error('한국어 의도가 비었습니다.')

  const userPrompt = opts.scenarioContext
    ? `시나리오: ${opts.scenarioContext}\n\n표현하고 싶은 의도: ${intent}`
    : `표현하고 싶은 의도: ${intent}`

  const text = await callOnce({
    system: KO_TO_EN_SYSTEM,
    user: userPrompt,
    maxTokens: 250,
  })

  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`응답이 JSON이 아닙니다: ${text.slice(0, 100)}`)
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('응답 형식이 올바르지 않습니다.')
  }
  const r = parsed as Record<string, unknown>

  const english = r.english
  if (typeof english !== 'string' || english.length < 1 || english.length > 400) {
    throw new Error('english 검증 실패 (1-400자)')
  }
  const literal = r.literal
  if (typeof literal !== 'string' || literal.length < 1 || literal.length > 300) {
    throw new Error('literal 검증 실패 (1-300자)')
  }

  // dedup: 같은 [expressionEn+intentKo] 있으면 그 ID 반환
  const existing = await db.phrases
    .where('[expressionEn+intentKo]')
    .equals([english, intent])
    .first()

  let phraseId: number
  if (existing && existing.id !== undefined) {
    phraseId = existing.id
  } else {
    phraseId = (await db.phrases.add({
      expressionEn: english,
      intentKo: intent,
      scenarioContext: opts.scenarioContext,
      type: 'stuck',
      sessionOrigin: opts.sessionId,
      capturedAt: Date.now(),
      source: 'self',
      mastery: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
    })) as number
  }

  return { english, literal, phraseId }
}

export interface LookupResult {
  meaning: string
  vocabId: number
  alreadyKnew: boolean
}

export async function lookupWord(opts: {
  term: string
  contextSentence?: string
  sessionOrigin?: number
}): Promise<LookupResult> {
  const term = opts.term.trim()
  if (!term) throw new Error('단어가 비었습니다.')

  const userPrompt = opts.contextSentence
    ? `문맥: ${opts.contextSentence}\n\n모르는 단어/표현: ${term}`
    : `모르는 단어/표현: ${term}`

  const text = await callOnce({
    system: WORD_LOOKUP_SYSTEM,
    user: userPrompt,
    maxTokens: 150,
  })

  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(`응답이 JSON이 아닙니다: ${text.slice(0, 100)}`)
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('응답 형식이 올바르지 않습니다.')
  }
  const r = parsed as Record<string, unknown>

  const meaning = r.meaning
  if (typeof meaning !== 'string' || meaning.length < 1 || meaning.length > 300) {
    throw new Error('meaning 검증 실패 (1-300자)')
  }

  const existing = await db.vocabulary
    .where('[term+meaningKo]')
    .equals([term, meaning])
    .first()

  let vocabId: number
  let alreadyKnew = false
  if (existing && existing.id !== undefined) {
    vocabId = existing.id
    alreadyKnew = true
  } else {
    vocabId = (await db.vocabulary.add({
      term,
      meaningKo: meaning,
      contextSentence: opts.contextSentence,
      sessionOrigin: opts.sessionOrigin,
      capturedAt: Date.now(),
      source: 'self',
      mastery: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
    })) as number
  }

  return { meaning, vocabId, alreadyKnew }
}
