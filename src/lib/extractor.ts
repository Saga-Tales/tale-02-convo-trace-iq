import { callOnce } from './anthropic'
import { db, type Difficulty } from '@/db/schema'

export interface ExtractedExpression {
  english: string
  intentKo: string
  type: 'good' | 'new'
}

const EXTRACT_SYSTEM = `너는 영어 회화 학습 도구의 표현 추출기다.
회화 turns를 받아서 사용자가 학습할 가치 있는 영어 표현을 뽑는다.

응답은 반드시 아래 JSON 형식으로만 (markdown 백틱 X, 설명 X):

{
  "expressions": [
    {"english": "...", "intentKo": "한국어 의도/직역 (1줄)", "type": "good|new"},
    ...
  ]
}

규칙:
- 3-7개 추출. 더 많이 X.
- 사용자 난이도 수준 또는 그 위 표현
- 자연스러운 회화체. 사용자가 미래에 다른 회화에서도 사용할 만한 것
- 너무 일상적/뻔한 표현(hello, thank you, OK 등) X
- english는 1-2 문장, 1-200자
- intentKo는 한국어 1줄, 50자 이내
- type: 'good'은 AI가 사용한 자연스럽고 좋은 표현. 'new'는 사용자가 새로 만나거나 시도한 표현.
- 회화에서 실제 등장한 표현만 (지어내지 말 것)
- 회화가 너무 짧거나 학습 가치 있는 표현이 없으면 빈 배열 OK`

export async function extractFromConversation(opts: {
  difficulty: Difficulty
  turns: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
}): Promise<ExtractedExpression[]> {
  const dialog = opts.turns
    .filter((t) => t.role !== 'system')
    .map((t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.content}`)
    .join('\n\n')

  // 너무 짧으면 추출 자체 skip
  if (dialog.length < 80) {
    return []
  }

  const userPrompt = `사용자 난이도: ${opts.difficulty}

회화:
${dialog}

위 회화에서 학습 가치 있는 영어 표현 3-7개 추출.`

  const text = await callOnce({
    system: EXTRACT_SYSTEM,
    user: userPrompt,
    maxTokens: 1500,
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
    throw new Error(`추출 응답이 JSON 형식이 아닙니다: ${text.slice(0, 100)}`)
  }

  return validateExpressions(parsed)
}

function validateExpressions(raw: unknown): ExtractedExpression[] {
  if (!raw || typeof raw !== 'object') {
    throw new Error('expressions 응답이 object 아님')
  }
  const r = raw as Record<string, unknown>
  const expressions = r.expressions
  if (!Array.isArray(expressions)) {
    throw new Error('expressions가 배열 아님')
  }

  const result: ExtractedExpression[] = []
  for (let i = 0; i < expressions.length; i++) {
    const e = expressions[i]
    if (!e || typeof e !== 'object') continue
    const ee = e as Record<string, unknown>

    const english = ee.english
    if (
      typeof english !== 'string' ||
      english.length < 1 ||
      english.length > 250
    )
      continue

    const intentKo = ee.intentKo
    if (
      typeof intentKo !== 'string' ||
      intentKo.length < 1 ||
      intentKo.length > 200
    )
      continue

    const type = ee.type
    if (type !== 'good' && type !== 'new') continue

    result.push({ english, intentKo, type })
  }

  return result.slice(0, 8)
}

/**
 * 사용자가 keep한 표현들을 phrases에 저장. 복합 unique 인덱스로 자동 dedup.
 */
export async function savePickedExpressions(opts: {
  sessionId: number
  expressions: ExtractedExpression[]
}): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0
  let skipped = 0

  for (const e of opts.expressions) {
    const existing = await db.phrases
      .where('[expressionEn+intentKo]')
      .equals([e.english, e.intentKo])
      .first()

    if (existing) {
      skipped++
      continue
    }

    await db.phrases.add({
      expressionEn: e.english,
      intentKo: e.intentKo,
      type: e.type,
      sessionOrigin: opts.sessionId,
      capturedAt: Date.now(),
      source: 'self',
      mastery: 0,
      lastReviewedAt: null,
      nextReviewAt: null,
    })
    inserted++
  }

  return { inserted, skipped }
}
