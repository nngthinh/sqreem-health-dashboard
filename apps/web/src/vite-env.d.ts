/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'demo' when the deployed API expects an access code instead of Google SSO. */
  readonly VITE_AUTH_HINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
