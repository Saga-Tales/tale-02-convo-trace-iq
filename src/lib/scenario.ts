import { callOnce } from './anthropic'
import type { Difficulty, DialogTurn } from '@/db/schema'

export interface Scenario {
  title: string
  brief: string
  userRole: string
  aiRole: string
  objectives: string[]
  keyExpressions: DialogTurn[]
  learningGoals: string[]
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
  "keyExpressions": [
    {"speaker": "partner", "english": "Hi, glad you could make it.", "intentKo": "환영 인사"},
    {"speaker": "user", "english": "Thanks for having me.", "intentKo": "초대해줘서 감사"},
    ...
  ],
  "learningGoals": ["만나게 될 표현·단어 (한국어, 짧게)", "..."],
  "openingLine": "AI가 회화를 여는 첫 영어 문장 (1-2문장)"
}

규칙:
- brief: 단순 상황만 던지지 말고 분위기·배경·동기까지. 사용자가 시나리오를 읽기만 해도 회화 흐름이 그려지게.
- objectives: 3-5개. 회화가 어떻게 흘러갈지 단계별 가이드.
- keyExpressions: 4-6 turns. partner와 user가 자연스럽게 번갈아 나오는 대화 흐름.
  * 각 turn은 1-2 짧은 문장. 절대 길게 늘어놓지 말 것.
  * speaker는 정확히 'user' 또는 'partner'.
  * 첫 turn은 보통 partner부터 시작 (openingLine과 자연스럽게 이어지게).
  * intentKo는 한국어로 그 turn의 의도/직역을 짧게 (1줄, 30자 이내).
  * 사용자가 "내 차례에 뭘 말해야 하지?" 알 수 있게 user turn에 자연스러운 대답 패턴을 보여줄 것.
- learningGoals: 2-4개. 만나게 될 표현·단어를 한국어로 짧게.
- 난이도에 맞는 어휘 수준
- 일상적이고 실용적인 상황만`

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

위 조건에 맞는 시나리오 1개를 JSON으로 생성. keyExpressions는 짧은 turn들이 자연스럽게 번갈아 나오는 대화 흐름으로.`

  const text = await callOnce({
    system: SYSTEM_PROMPT,
    user: userPrompt,
    maxTokens: 2000,
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
    throw new Error(
      `brief 검증 실패 (30-1500자, 받음 ${typeof brief === 'string' ? brief.length : 'non-string'}자)`,
    )
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
  if (
    !Array.isArray(objectives) ||
    objectives.length < 2 ||
    objectives.length > 7
  ) {
    throw new Error(
      `objectives 검증 실패 (2-7개, 받음 ${Array.isArray(objectives) ? objectives.length : 'non-array'}개)`,
    )
  }
  if (!objectives.every((o) => typeof o === 'string' && o.length > 0 && o.length < 200)) {
    throw new Error('objectives 항목 검증 실패')
  }

  const keyExpressions = r.keyExpressions
  if (
    !Array.isArray(keyExpressions) ||
    keyExpressions.length < 3 ||
    keyExpressions.length > 8
  ) {
    throw new Error(
      `keyExpressions 검증 실패 (3-8 turns, 받음 ${Array.isArray(keyExpressions) ? keyExpressions.length : 'non-array'}개)`,
    )
  }
  const dialogTurns: DialogTurn[] = []
  for (let i = 0; i < keyExpressions.length; i++) {
    const t = keyExpressions[i]
    if (!t || typeof t !== 'object') {
      throw new Error(`keyExpressions[${i}] object 아님`)
    }
    const tt = t as Record<string, unknown>
    const speaker = tt.speaker
    if (speaker !== 'user' && speaker !== 'partner') {
      throw new Error(
        `keyExpressions[${i}].speaker 검증 실패 (user|partner, 받음 ${JSON.stringify(speaker)})`,
      )
    }
    const english = tt.english
    if (typeof english !== 'string' || english.length < 1 || english.length > 250) {
      throw new Error(`keyExpressions[${i}].english 검증 실패 (1-250자)`)
    }
    let intentKo: string | undefined
    if (tt.intentKo !== undefined && tt.intentKo !== null && tt.intentKo !== '') {
      if (typeof tt.intentKo !== 'string' || tt.intentKo.length > 100) {
        throw new Error(`keyExpressions[${i}].intentKo 검증 실패 (string, max 100자)`)
      }
      intentKo = tt.intentKo
    }
    dialogTurns.push({ speaker, english, intentKo })
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
    keyExpressions: dialogTurns,
    learningGoals: learningGoals as string[],
    openingLine,
  }
}
