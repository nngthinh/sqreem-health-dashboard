import type { DailyRecord, Goal, Insights, Persona, Range } from '@health/shared/schema'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export type Profile = { persona: Persona; goals: Goal[] }
/** Both bounds optional: an empty query asks for the whole retained window. */
export type RecordsQuery = { from?: string; to?: string }

export const dataApi = createApi({
  reducerPath: 'dataApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api', credentials: 'include' }),
  tagTypes: ['Profile', 'Records', 'Insights'],
  endpoints: (build) => ({
    getProfile: build.query<Profile, void>({
      query: () => '/profile',
      providesTags: ['Profile'],
    }),
    getRecords: build.query<{ records: DailyRecord[] }, RecordsQuery>({
      query: (params) => ({ url: '/records', params }),
      providesTags: ['Records'],
    }),
    getInsights: build.query<Insights, Range>({
      query: (range) => ({ url: '/insights', params: { range } }),
      providesTags: ['Insights'],
    }),
  }),
})

export const { useGetProfileQuery, useGetRecordsQuery, useGetInsightsQuery } = dataApi
