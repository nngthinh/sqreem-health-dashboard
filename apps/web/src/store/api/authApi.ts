import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export type Me = {
  id: string
  email: string
  name: string
  picture: string | null
  authMode: 'sso' | 'demo'
  devBypass: boolean
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api', credentials: 'include' }),
  tagTypes: ['Me'],
  endpoints: (build) => ({
    getMe: build.query<Me, void>({ query: () => '/me', providesTags: ['Me'] }),
    logout: build.mutation<{ ok: true }, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      // Drop the cache rather than invalidate it: every cached response was that
      // person's, and invalidating would leave the stale `me` readable.
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(authApi.util.resetApiState())
      },
    }),
    devLogin: build.mutation<{ ok: true }, void>({
      query: () => ({ url: '/auth/dev', method: 'POST' }),
      invalidatesTags: ['Me'],
    }),
    demoLogin: build.mutation<{ ok: true }, { code: string }>({
      query: (body) => ({ url: '/auth/demo', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
  }),
})

export const { useGetMeQuery, useLogoutMutation, useDevLoginMutation, useDemoLoginMutation } =
  authApi
