const NICKNAME_KEY = 'convo-trace-nickname'

export function getNickname(): string {
  return localStorage.getItem(NICKNAME_KEY) ?? ''
}

export function setNickname(name: string): void {
  const trimmed = name.trim()
  if (trimmed) {
    localStorage.setItem(NICKNAME_KEY, trimmed)
  } else {
    localStorage.removeItem(NICKNAME_KEY)
  }
}
