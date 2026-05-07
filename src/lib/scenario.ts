import { callOnce } from './anthropic'
import type { Difficulty } from '@/db/schema'

export interface Scenario {
  title: string
  brief: string
  userRole: string
  aiRole: string
  objectives: string[]       // 회화 진행 단계 (한국어, 3-5개)
  keyExpressions: string[]   // 핵심 영어 표현 예시 (3-7개)
  learningGoals: string[]    // 만나게 될 표현·단어 (한국어, 짧게)
  openingLine: string
}

const SYSTEM_PROMPT = `너는 영어 회화 학습 도구의 시나리오 생성기다.
사용자가 시나리오를 보면서 회화를 따라할 수 있도록 충분한 가이드를 제공해야 한다.

응답은 반드시 아래 JSON 형식으로만 (markdown 백틱 X, 설명 X, JSON 외 텍스트 X):

{
  "title": "짧은 한국어 제목 (10자 이내)",
  "brief": "상황 묘사 (한국어, 4-6문장). 어디서, 누구와, 어떤 분위기인지, 사용자가 왜 이 회화를 하게 됐는지 구체적으로.",
  "userRole": "사용자가 맡을 역할 (한국어, 짧게)",
  "aiRole": "AI가 맡을 역할 (한국어, 짧게)",
  "objectives": ["회화 진행 단계 (한국어, 짧게)", "..."],
  "keyExpressions": ["사용 가능한 영어 표현 (1-2문장)", "..."],
  "learningGoals": ["만나게 될 표현·단어 (한국어, 짧게)", "..."],
  "openingLine": "AI가 회화를 여는 첫 영어 문장 (1-2문장)"
}

규칙:
- brief: 단순 상황만 던지지 말고 분위기·배경·동기까지. 사용자가 시나리오를 읽기만 해도 회화 흐름이 그려지게.
- objectives: 3-5개. 회화가 어떻게 흘러갈지 단계별 가이드. 못하는 사람도 "다음에 뭘 말해야 하지?" 알 수 있게.
  예: "1. 자기소개와 회사 한 줄 설명", "2. 우리 제품의 시장 기회 짧게 강조", "3. 현재 라운드 단계와 목표 금액 언급"
- keyExpressions: 3-7개. 시나리오에서 자연스럽게 쓸 수 있는 영어 표현. 막힐 때 따라할 수 있는 실제 문장. 난이도에 맞게.
  예: "We're currently raising our seed round.", "Our team has deep experience in fintech."
- learningGoals: 2-4개. 만나게 될 표현·단어를 한국어로 짧게.
- 난이도에 맞는 어휘 수준
- 일상적이고 실용적인 상황만 (판타지 X, 비현실적 상황 X)
- 모든 텍스트의 따옴표 escape 정확히`

const DIFFICULTY_HINT: Record<Difficulty, string> = {
  A1: 'A1 입문 — 기본 인사, 단순 자기소개, 한 단어 또는 짧은 문장 위주',
  A2: 'A2 기초 — 일상 어휘, 짧은 문장, 단순 과거/현재 시제',
  'A2+': 'A2+ 초중급 — 익숙한 주제 일상 대화 가능',
  B1: 'B1 중하급 — 익숙한 주제 표현, 간단한 의견 제시',
  'B1+': 'B1+ 중급 — 다양한 주제 토론 가능, 자연스러운 회화 표현',
  B2: 'B2 중상급 — 복잡한 주제, 추상적 개념, 가끔 관용 표현',
  C1: 'C1 상급 — 정교한 표현, 비유, 문화적 뉘앙스',
  'C1+': 'C1+ 고급 — 거의 원어민 수준, 미묘한 차이 구분',
  C2: 'C2 최상급 — 원어민 수준, 모든 주제 자유롭게',
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

위 조건에 맞는 시나리오 1개를 JSON으로 생성. 사용자가 회화 못해도 시나리오만 보고 따라할 수 있게 풍부하게.`

  const text = await callOnce({
    system: SYSTEM_PROMPT,
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
    throw new Error(
      `시나리오 응답이 JSON 형식이 아닙니다.\n원문: ${text.slice(0, 120)}...`,
    )
  }

  return validateScenario(parsed)
}

function validateScenario(raw: unknown): Scenario {
  if (!raw || typeof raw !== 'object') {
    throw new Error('시나리오 형식이 올바르지 않습니다.')
  }
  const r = raw as Record<string, unknown>

  const title = r.title
  if (typeof title !== 'string' || title.length < 1 || title.length > 30) {
    throw new Error(`title 검증 실패 (1-30자)`)
  }

  const brief = r.brief
  if (typeof brief !== 'string' || brief.length < 30 || brief.length > 1500) {
    throw new Error(`brief 검증 실패 (30-1500자, 받음 ${typeof brief === 'string' ? brief.length : 'non-string'}자)`)
  }

  const userRole = r.userRole
  if (typeof userRole !== 'string' || userRole.length < 1 || userRole.length > 100) {
    throw new Error('userRole 검증 실패 (1-100자)')
  }

  const aiRole = r.aiRole
  if (typeof aiRole !== 'string' || aiRole.length < 1 || aiRole.length > 100) {
    throw new Error('aiRole 검증 실패 (1-100자)')
  }

  const objectives = r.objectives
  if (!Array.isArray(objectives) || objectives.length < 2 || objectives.length > 7) {
    throw new Error(`objectives 검증 실패 (2-7개, 받음 ${Array.isArray(objectives) ? objectives.length : 'non-array'}개)`)
  }
  if (!objectives.every((o) => typeof o === 'string' && o.length > 0 && o.length < 200)) {
    throw new Error('objectives 항목 검증 실패')
  }

  const keyExpressions = r.keyExpressions
  if (
    !Array.isArray(keyExpressions) ||
    keyExpressions.length < 2 ||
    keyExpressions.length > 10
  ) {
    throw new Error(`keyExpressions 검증 실패 (2-10개, 받음 ${Array.isArray(keyExpressions) ? keyExpressions.length : 'non-array'}개)`)
  }
  if (!keyExpressions.every((e) => typeof e === 'string' && e.length > 0 && e.length < 300)) {
    throw new Error('keyExpressions 항목 검증 실패')
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
    objectives: objectives as string[],
    keyExpressions: keyExpressions as string[],
    learningGoals: learningGoals as string[],
    openingLine,
  }
}
