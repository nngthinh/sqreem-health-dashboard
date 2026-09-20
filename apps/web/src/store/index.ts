import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { authApi } from './api/authApi'
import { chatApi } from './api/chatApi'
import { dataApi } from './api/dataApi'
import { reducer as chat } from './chatSlice'
import { persistUi, reducer as ui } from './uiSlice'

export const store = configureStore({
  reducer: {
    ui,
    chat,
    [authApi.reducerPath]: authApi.reducer,
    [dataApi.reducerPath]: dataApi.reducer,
    [chatApi.reducerPath]: chatApi.reducer,
  },
  middleware: (getDefault) =>
    getDefault().concat(authApi.middleware, dataApi.middleware, chatApi.middleware),
})

store.subscribe(() => persistUi(store.getState().ui))

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
