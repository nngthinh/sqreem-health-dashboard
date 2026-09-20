import { useParams } from 'react-router'
import { ChatSurface } from '../components/chat/ChatSurface'

/** The route owns only the conversation id; everything visual lives in ChatSurface. */
export function ChatRoute() {
  const { conversationId } = useParams()

  return <ChatSurface conversationId={conversationId ?? null} />
}
