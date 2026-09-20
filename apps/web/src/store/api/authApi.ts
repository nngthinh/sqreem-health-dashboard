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
      invalidatesTags: ['Me'],
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
