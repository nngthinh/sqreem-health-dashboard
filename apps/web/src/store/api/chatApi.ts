import type { ChatMessage, ConversationSummary } from '@health/shared/schema'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export type Thread = { conversation: ConversationSummary; messages: ChatMessage[] }

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api', credentials: 'include' }),
  tagTypes: ['Conversations', 'Conversation'],
  endpoints: (build) => ({
    listConversations: build.query<ConversationSummary[], void>({
      query: () => '/conversations',
      providesTags: ['Conversations'],
    }),
    getConversation: build.query<Thread, string>({
      query: (id) => `/conversations/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Conversation', id }],
    }),
    createConversation: build.mutation<ConversationSummary, { firstMessage?: string }>({
      query: (body) => ({ url: '/conversations', method: 'POST', body }),
      invalidatesTags: ['Conversations'],
    }),
    renameConversation: build.mutation<ConversationSummary, { id: string; title: string }>({
      query: ({ id, title }) => ({ url: `/conversations/${id}`, method: 'PATCH', body: { title } }),
      invalidatesTags: ['Conversations'],
    }),
    deleteConversation: build.mutation<{ ok: true }, string>({
      query: (id) => ({ url: `/conversations/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Conversations'],
    }),
  }),
})

export const {
  useListConversationsQuery,
  useGetConversationQuery,
  useCreateConversationMutation,
  useRenameConversationMutation,
  useDeleteConversationMutation,
} = chatApi
