import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export enum StreamStatus {
  Idle = 'idle',
  Streaming = 'streaming',
  Error = 'error',
}

export enum ToolActivityStatus {
  Running = 'running',
  Done = 'done',
}

type ToolActivity = { name: string; status: ToolActivityStatus }

/**
 * Only what is genuinely client-side and ephemeral. The persisted transcript is
 * server state and lives in `chatApi`, so a refresh restores it from one place.
 */
type ChatState = {
  activeConversationId: string | null
  /** The question of the turn in flight: the server has not stored it yet. */
  pendingMessage: string
  streamingMessage: string
  status: StreamStatus
  toolActivity: string[]
  error: string | null
}

const initialState: ChatState = {
  activeConversationId: null,
  pendingMessage: '',
  streamingMessage: '',
  status: StreamStatus.Idle,
  toolActivity: [],
  error: null,
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Another conversation's half-finished turn has no meaning in this one.
    setActiveConversation(state, action: PayloadAction<string | null>) {
      if (state.activeConversationId === action.payload) return

      state.activeConversationId = action.payload
      state.pendingMessage = ''
      state.streamingMessage = ''
      state.status = StreamStatus.Idle
      state.toolActivity = []
      state.error = null
    },

    startStream(state, action: PayloadAction<{ conversationId: string; message: string }>) {
      state.activeConversationId = action.payload.conversationId
      state.pendingMessage = action.payload.message
      state.streamingMessage = ''
      state.status = StreamStatus.Streaming
      state.toolActivity = []
      state.error = null
    },

    appendDelta(state, action: PayloadAction<string>) {
      state.streamingMessage += action.payload
    },

    setToolActivity(state, action: PayloadAction<ToolActivity>) {
      const { name, status } = action.payload

      state.toolActivity =
        status === ToolActivityStatus.Running
          ? [...state.toolActivity, name]
          : state.toolActivity.filter((running) => running !== name)
    },

    streamFailed(state, action: PayloadAction<string>) {
      state.status = StreamStatus.Error
      state.error = action.payload
      state.toolActivity = []
      // streamingMessage is deliberately preserved: a failed stream leaves the
      // partial response on screen with an inline retry, never a blank bubble.
    },

    streamDone(state) {
      state.status = StreamStatus.Idle
      // pendingMessage outlives the turn: the refetched transcript takes a moment to
      // arrive, and the question must not blink out of the feed while it does.
      state.streamingMessage = ''
      state.toolActivity = []
      state.error = null
    },
  },
})

export const {
  setActiveConversation,
  startStream,
  appendDelta,
  setToolActivity,
  streamFailed,
  streamDone,
} = chatSlice.actions

export const reducer = chatSlice.reducer
