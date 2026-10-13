export type OllamaMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type OllamaResponse = {
  message?: { content?: string }
  error?: string
}

const ollamaEndpoint = 'http://localhost:11434/api/chat'
const defaultModel = 'llama3.2:3b'

export async function chatWithOllama(messages: OllamaMessage[], model = defaultModel): Promise<string> {
  const response = await fetch(ollamaEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  })

  const payload = await response.json() as OllamaResponse
  if (!response.ok) throw new Error(payload.error || `Ollama zwróciła status ${response.status}.`)
  if (!payload.message?.content) throw new Error('Ollama nie zwróciła treści odpowiedzi.')
  return payload.message.content
}
