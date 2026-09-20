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
  streamingMessage: string
  status: StreamStatus
  toolActivity: string[]
  error: string | null
}

const initialState: ChatState = {
  activeConversationId: null,
  streamingMessage: '',
  status: StreamStatus.Idle,
  toolActivity: [],
  error: null,
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveConversation(state, action: PayloadAction<string | null>) {
      state.activeConversationId = action.payload
    },

    startStream(state, action: PayloadAction<string>) {
      state.activeConversationId = action.payload
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
