import Anthropic from '@anthropic-ai/sdk'

const KEY_STORAGE = 'convo-trace-anthropic-key'

// Haiku 4.5 - 빠르고 한국어 가성비 좋음
export const MODEL = 'claude-haiku-4-5-20251001'

let client: Anthropic | null = null

export function getApiKey(): string | null {
  return localStorage.getItem(KEY_STORAGE)
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEY_STORAGE, key.trim())
  client = null // 다음 호출 시 새 client
}

export function clearApiKey(): void {
  localStorage.removeItem(KEY_STORAGE)
  client = null
}

export function hasApiKey(): boolean {
  return !!getApiKey()
}

function getClient(): Anthropic {
  if (client) return client
  const key = getApiKey()
  if (!key) throw new Error('API 키가 설정되지 않았습니다. 설정 페이지에서 입력해주세요.')
  client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true })
  return client
}

export interface CallOptions {
  system: string
  user: string
  maxTokens?: number
}

/**
 * 단일 응답 (non-streaming). 백그라운드 추출용.
 */
export async function callOnce({
  system,
  user,
  maxTokens = 1024,
}: CallOptions): Promise<string> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  })
  return res.content
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('')
}

/**
 * Streaming 응답. 사용자 대면 호출은 모두 이걸로.
 */
export async function callStreaming(
  { system, user, maxTokens = 1024 }: CallOptions,
  onDelta: (accumulated: string) => void,
): Promise<string> {
  let accumulated = ''
  const stream = getClient().messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  })
  stream.on('text', (delta) => {
    accumulated += delta
    onDelta(accumulated)
  })
  await stream.finalMessage()
  return accumulated
}
