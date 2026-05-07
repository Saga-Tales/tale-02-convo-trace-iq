import pako from 'pako'
import { db, type Difficulty, type PhraseType } from '@/db/schema'
import type { Scenario } from './scenario'

const MAGIC = 'CT1' // convo-trace v1
const MAX_ITEMS = 50 // 한 share에 phrases/vocab 각각 최대

export interface ScenarioShare {
  v: 1
  scenario: Scenario
  difficulty: Difficulty
  tags: string[]
  participants: string[]
  hostName: string
  startedAt: number
  sessionUuid: string
}

export interface SharedPhrase {
  expressionEn: string
  intentKo: string
  type: PhraseType
  capturedAt: number
}

export interface SharedVocab {
  term: string
  meaningKo: string
  contextSentence?: string
  capturedAt: number
}

export interface CaptureShare {
  v: 1
  sessionUuid: string
  participantName: string
  phrases: SharedPhrase[]
  vocabulary: SharedVocab[]
}

export type QRPayload =
  | { kind: 'scenario'; data: ScenarioShare }
  | { kind: 'capture'; data: CaptureShare }

// =============================================================================
// 인코딩 / 디코딩
// =============================================================================

export function encodePayload(payload: QRPayload): string {
  const json = JSON.stringify(payload)
  const compressed = pako.gzip(json)
  // base64 encode (브라우저 호환)
  let bin = ''
  for (let i = 0; i < compressed.length; i++) {
    bin += String.fromCharCode(compressed[i])
  }
  return MAGIC + btoa(bin)
}

export function decodePayload(text: string): QRPayload {
  if (!text.startsWith(MAGIC)) {
    throw new Error('이 QR은 convo-trace 형식이 아닙니다.')
  }
  const b64 = text.slice(MAGIC.length)
  let bin: string
  try {
    bin = atob(b64)
  } catch {
    throw new Error('QR 데이터가 손상됐습니다 (base64).')
  }
  const compressed = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) {
    compressed[i] = bin.charCodeAt(i)
  }
  let json: string
  try {
    json = pako.ungzip(compressed, { to: 'string' })
  } catch {
    throw new Error('QR 데이터가 손상됐습니다 (압축).')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    throw new Error('QR 데이터 파싱 실패 (JSON).')
  }
  return validatePayload(parsed)
}

// =============================================================================
// Validators
// =============================================================================

function validatePayload(raw: unknown): QRPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('payload가 object가 아님')
  }
  const r = raw as Record<string, unknown>
  if (r.kind === 'scenario') {
    return { kind: 'scenario', data: validateScenarioShare(r.data) }
  }
  if (r.kind === 'capture') {
    return { kind: 'capture', data: validateCaptureShare(r.data) }
  }
  throw new Error(`알 수 없는 QR 종류: ${String(r.kind)}`)
}

function validateScenarioShare(raw: unknown): ScenarioShare {
  if (!raw || typeof raw !== 'object') throw new Error('scenario share invalid')
  const r = raw as Record<string, unknown>
  if (r.v !== 1) throw new Error(`지원되지 않는 버전: ${String(r.v)}`)

  const scenario = r.scenario
  if (!scenario || typeof scenario !== 'object') throw new Error('scenario 누락')
  const sc = scenario as Record<string, unknown>
  if (typeof sc.title !== 'string' || typeof sc.brief !== 'string') {
    throw new Error('scenario 필드 부족')
  }

  const difficulty = r.difficulty
  if (typeof difficulty !== 'string') throw new Error('difficulty invalid')

  const tags = r.tags
  if (!Array.isArray(tags) || !tags.every((t) => typeof t === 'string')) {
    throw new Error('tags invalid')
  }

  const participants = r.participants
  if (
    !Array.isArray(participants) ||
    !participants.every((p) => typeof p === 'string') ||
    participants.length > 10
  ) {
    throw new Error('participants invalid (최대 10명)')
  }

  const hostName = r.hostName
  if (typeof hostName !== 'string' || hostName.length > 100) {
    throw new Error('hostName invalid')
  }

  const startedAt = r.startedAt
  if (typeof startedAt !== 'number') throw new Error('startedAt invalid')

  const sessionUuid = r.sessionUuid
  if (typeof sessionUuid !== 'string' || sessionUuid.length > 100) {
    throw new Error('sessionUuid invalid')
  }

  return {
    v: 1,
    scenario: scenario as Scenario,
    difficulty: difficulty as Difficulty,
    tags,
    participants,
    hostName,
    startedAt,
    sessionUuid,
  }
}

function validateCaptureShare(raw: unknown): CaptureShare {
  if (!raw || typeof raw !== 'object') throw new Error('capture share invalid')
  const r = raw as Record<string, unknown>
  if (r.v !== 1) throw new Error(`지원되지 않는 버전: ${String(r.v)}`)

  const sessionUuid = r.sessionUuid
  if (typeof sessionUuid !== 'string') throw new Error('sessionUuid invalid')

  const participantName = r.participantName
  if (typeof participantName !== 'string' || participantName.length > 100) {
    throw new Error('participantName invalid')
  }

  const phrases = r.phrases
  if (!Array.isArray(phrases) || phrases.length > MAX_ITEMS) {
    throw new Error(`phrases invalid (최대 ${MAX_ITEMS}개)`)
  }
  const validPhrases: SharedPhrase[] = []
  for (const p of phrases) {
    if (!p || typeof p !== 'object') continue
    const pp = p as Record<string, unknown>
    if (
      typeof pp.expressionEn !== 'string' ||
      pp.expressionEn.length === 0 ||
      pp.expressionEn.length > 250
    )
      continue
    if (
      typeof pp.intentKo !== 'string' ||
      pp.intentKo.length === 0 ||
      pp.intentKo.length > 200
    )
      continue
    const type = pp.type
    if (type !== 'stuck' && type !== 'new' && type !== 'good') continue
    if (typeof pp.capturedAt !== 'number') continue
    validPhrases.push({
      expressionEn: pp.expressionEn,
      intentKo: pp.intentKo,
      type,
      capturedAt: pp.capturedAt,
    })
  }

  const vocabulary = r.vocabulary
  if (!Array.isArray(vocabulary) || vocabulary.length > MAX_ITEMS) {
    throw new Error(`vocabulary invalid (최대 ${MAX_ITEMS}개)`)
  }
  const validVocab: SharedVocab[] = []
  for (const v of vocabulary) {
    if (!v || typeof v !== 'object') continue
    const vv = v as Record<string, unknown>
    if (
      typeof vv.term !== 'string' ||
      vv.term.length === 0 ||
      vv.term.length > 100
    )
      continue
    if (
      typeof vv.meaningKo !== 'string' ||
      vv.meaningKo.length === 0 ||
      vv.meaningKo.length > 200
    )
      continue
    const ctx = vv.contextSentence
    if (
      ctx !== undefined &&
      (typeof ctx !== 'string' || ctx.length > 1000)
    )
      continue
    if (typeof vv.capturedAt !== 'number') continue
    validVocab.push({
      term: vv.term,
      meaningKo: vv.meaningKo,
      contextSentence: typeof ctx === 'string' ? ctx : undefined,
      capturedAt: vv.capturedAt,
    })
  }

  return {
    v: 1,
    sessionUuid,
    participantName,
    phrases: validPhrases,
    vocabulary: validVocab,
  }
}

// =============================================================================
// Builders
// =============================================================================

export function buildScenarioShare(opts: {
  scenario: Scenario
  difficulty: Difficulty
  tags: string[]
  participants: string[]
  hostName: string
  sessionUuid: string
}): ScenarioShare {
  return {
    v: 1,
    scenario: opts.scenario,
    difficulty: opts.difficulty,
    tags: opts.tags,
    participants: opts.participants,
    hostName: opts.hostName,
    startedAt: Date.now(),
    sessionUuid: opts.sessionUuid,
  }
}

/**
 * 이번 세션에서 캡처된 phrase/vocab을 share 페이로드로 만듦.
 * sessionId는 로컬 dexie의 Session.id.
 */
export async function buildCaptureShare(opts: {
  sessionId: number
  sessionUuid: string
  participantName: string
}): Promise<CaptureShare> {
  const phrases = await db.phrases
    .where('sessionOrigin')
    .equals(opts.sessionId)
    .toArray()
  const vocabulary = await db.vocabulary
    .where('sessionOrigin')
    .equals(opts.sessionId)
    .toArray()

  // self-source만 share (이미 imported된 건 다시 보내지 않음)
  const selfPhrases = phrases.filter((p) => p.source === 'self')
  const selfVocab = vocabulary.filter((v) => v.source === 'self')

  return {
    v: 1,
    sessionUuid: opts.sessionUuid,
    participantName: opts.participantName,
    phrases: selfPhrases.slice(0, MAX_ITEMS).map((p) => ({
      expressionEn: p.expressionEn,
      intentKo: p.intentKo,
      type: p.type,
      capturedAt: p.capturedAt,
    })),
    vocabulary: selfVocab.slice(0, MAX_ITEMS).map((v) => ({
      term: v.term,
      meaningKo: v.meaningKo,
      contextSentence: v.contextSentence,
      capturedAt: v.capturedAt,
    })),
  }
}

/**
 * 호스트가 자기 캡처 + 받은 게스트 캡처들을 합쳐서 통합 share 생성.
 */
export function mergeCaptureShares(
  myShare: CaptureShare,
  guestShares: CaptureShare[],
): CaptureShare {
  const phrases: SharedPhrase[] = [...myShare.phrases]
  const vocabulary: SharedVocab[] = [...myShare.vocabulary]

  const phraseKey = (p: SharedPhrase) => `${p.expressionEn}|${p.intentKo}`
  const vocabKey = (v: SharedVocab) => `${v.term}|${v.meaningKo}`

  const seenP = new Set(phrases.map(phraseKey))
  const seenV = new Set(vocabulary.map(vocabKey))

  for (const g of guestShares) {
    for (const p of g.phrases) {
      const k = phraseKey(p)
      if (!seenP.has(k)) {
        seenP.add(k)
        phrases.push(p)
      }
    }
    for (const v of g.vocabulary) {
      const k = vocabKey(v)
      if (!seenV.has(k)) {
        seenV.add(k)
        vocabulary.push(v)
      }
    }
  }

  return {
    v: 1,
    sessionUuid: myShare.sessionUuid,
    participantName: '__merged__',
    phrases: phrases.slice(0, MAX_ITEMS * 4),
    vocabulary: vocabulary.slice(0, MAX_ITEMS * 4),
  }
}
