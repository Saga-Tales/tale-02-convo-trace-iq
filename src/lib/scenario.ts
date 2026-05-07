import { callOnce } from './anthropic'
import type { Difficulty } from '@/db/schema'

export interface Scenario {
  title: string
  brief: string
  userRole: string
  aiRole: string
  learningGoals: string[]
  openingLine: string
}

const SYSTEM_PROMPT = `너는 영어 회화 학습 도구의 시나리오 생성기다.

응답은 반드시 아래 JSON 형식으로만 (markdown 백틱 X, 설명 X, JSON 외 텍스트 X):

{
  "title": "짧은 한국어 제목 (10자 이내)",
  "brief": "상황 묘사 한 단락 (한국어, 2-3문장)",
  "userRole": "사용자가 맡을 역할 (한국어, 짧게)",
  "aiRole": "AI가 맡을 역할 (한국어, 짧게)",
  "learningGoals": ["학습 목표 (한국어, 짧게)", "..."],
  "openingLine": "AI가 회화를 여는 첫 영어 문장 (1-2문장)"
}

규칙:
- 난이도에 맞는 어휘 수준
- 일상적이고 실용적인 상황만 (판타지 X, 비현실적 상황 X)
- learningGoals는 2-4개. 어떤 표현/단어를 만나게 될지 힌트
- openingLine은 자연스러운 영어 1-2문장
- 모든 텍스트는 따옴표 escape 정확히`

const DIFFICULTY_HINT: Record<Difficulty, string> = {
  beginner: 'A2 수준 — 간단한 일상 어휘, 짧은 문장',
  intermediate: 'B1-B2 수준 — 실무에서 쓸 만한 어휘, 다양한 문장 구조',
  advanced: 'C1 수준 — 관용 표현, 비유, 복잡한 문장 구조',
}

const TAG_KO: Record<string, string> = {
  business: '비즈니스 (미팅, 협상, 프레젠테이션)',
  daily: '일상 (카페, 친구, 가족)',
  office: '사무실 (동료, 잡담, 출근)',
}

export async function generateScenario(opts: {
  difficulty: Difficulty
  tags: string[]
  hint: string
}): Promise<Scenario> {
  const tagDesc =
    opts.tags.length > 0
      ? opts.tags.map((t) => TAG_KO[t] ?? t).join(', ')
      : '제한 없음'

  const userPrompt = `난이도: ${opts.difficulty} (${DIFFICULTY_HINT[opts.difficulty]})
카테고리: ${tagDesc}
추가 요청: ${opts.hint || '(없음)'}

위 조건에 맞는 시나리오 1개를 JSON으로 생성.`

  const text = await callOnce({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 700,
  })

  // ```json``` fenced block 정리
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error(
      `시나리오 응답이 JSON 형식이 아닙니다. 다시 시도해주세요.\n원문: ${text.slice(0, 120)}...`,
    )
  }

  return validateScenario(parsed)
}

/**
 * Hard-constraint validator (tale-01의 validator 패턴).
 * LLM이 prompt를 잘 따르지 않을 가능성에 대비.
 */
function validateScenario(raw: unknown): Scenario {
  if (!raw || typeof raw !== 'object') {
    throw new Error('시나리오 형식이 올바르지 않습니다 (object 아님).')
  }
  const r = raw as Record<string, unknown>

  const title = r.title
  if (typeof title !== 'string' || title.length < 1 || title.length > 30) {
    throw new Error(`title 검증 실패 (1-30자, 받음: ${JSON.stringify(title)?.slice(0, 50)})`)
  }

  const brief = r.brief
  if (typeof brief !== 'string' || brief.length < 10 || brief.length > 600) {
    throw new Error('brief 검증 실패 (10-600자)')
  }

  const userRole = r.userRole
  if (typeof userRole !== 'string' || userRole.length < 1 || userRole.length > 100) {
    throw new Error('userRole 검증 실패 (1-100자)')
  }

  const aiRole = r.aiRole
  if (typeof aiRole !== 'string' || aiRole.length < 1 || aiRole.length > 100) {
    throw new Error('aiRole 검증 실패 (1-100자)')
  }

  const learningGoals = r.learningGoals
  if (
    !Array.isArray(learningGoals) ||
    learningGoals.length < 1 ||
    learningGoals.length > 6
  ) {
    throw new Error('learningGoals 검증 실패 (1-6개)')
  }
  if (
    !learningGoals.every(
      (g) => typeof g === 'string' && g.length > 0 && g.length < 200,
    )
  ) {
    throw new Error('learningGoals 항목 검증 실패')
  }

  const openingLine = r.openingLine
  if (
    typeof openingLine !== 'string' ||
    openingLine.length < 1 ||
    openingLine.length > 500
  ) {
    throw new Error('openingLine 검증 실패 (1-500자)')
  }

  return {
    title,
    brief,
    userRole,
    aiRole,
    learningGoals: learningGoals as string[],
    openingLine,
  }
}
