import type { Range } from '@health/shared/schema'
import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

const STORAGE_KEY = 'vitals.ui'

type UiState = { range: Range; sidebarCollapsed: boolean; drawerOpen: boolean }

function loadPersisted(): Partial<UiState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Partial<UiState>) : {}
  } catch {
    return {}
  }
}

const persisted = typeof window === 'undefined' ? {} : loadPersisted()

const initialState: UiState = {
  range: persisted.range ?? 30,
  sidebarCollapsed: persisted.sidebarCollapsed ?? false,
  drawerOpen: false, // never restore an open drawer
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setRange(state, action: PayloadAction<Range>) {
      state.range = action.payload
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload
    },
    setDrawerOpen(state, action: PayloadAction<boolean>) {
      state.drawerOpen = action.payload
    },
  },
})

export const { setRange, setSidebarCollapsed, setDrawerOpen } = uiSlice.actions
export const reducer = uiSlice.reducer

export function persistUi(state: UiState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ range: state.range, sidebarCollapsed: state.sidebarCollapsed }),
    )
  } catch {
    /* storage unavailable — a remembered sidebar is not worth a crash */
  }
}
