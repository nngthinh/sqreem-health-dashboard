import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector } from 'react-redux'
import { authApi } from './api/authApi'
import { persistUi, reducer as ui } from './uiSlice'

export const store = configureStore({
  reducer: { ui, [authApi.reducerPath]: authApi.reducer },
  middleware: (getDefault) => getDefault().concat(authApi.middleware),
})

store.subscribe(() => persistUi(store.getState().ui))

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
