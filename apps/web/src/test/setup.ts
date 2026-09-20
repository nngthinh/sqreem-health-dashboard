import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest runs without globals, so Testing Library cannot register its own
// teardown — without this, two renders in one file both stay in the document.
afterEach(cleanup)

// jsdom ships no fetch, so Node's Request is used and it rejects the relative
// URLs a browser resolves against the document. Resolve them the same way here.
const NodeRequest = globalThis.Request
class DocumentRelativeRequest extends NodeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(typeof input === 'string' ? new URL(input, window.location.href) : input, init)
  }
}
globalThis.Request = DocumentRelativeRequest as typeof Request
