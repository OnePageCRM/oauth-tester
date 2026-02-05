# OAuth 2.1 Flow Tester - Implementation Plan

## Phase 1: Project Setup ✓
- [x] Initialize Vite + React + TypeScript project
- [x] Configure build for static output
- [x] Set up basic folder structure
- [x] Add `callback.html` to public folder
- [x] Set up ESLint (TypeScript + React rules)
- [x] Set up Prettier (formatting)
- [x] Set up Vitest (testing with happy-dom)
- [x] Add npm scripts: `lint`, `lint:fix`, `test`, `test:watch`

## Phase 2: Core Data Layer ✓
- [x] Define TypeScript types for Flow, Step, FlowState
- [x] Implement localStorage service (save/load flows)
- [x] Flow CRUD operations (create, read, update, delete)
- [x] Fork flow logic (copy steps up to point, new ID, inherit state)

## Phase 3: UI Shell ✓
- [x] Layout: sidebar + main content area
- [x] Sidebar: "New Flow" button + flow list (sorted by lastModified)
- [x] Main area: flow name (inline editable) + scrollable steps
- [x] Basic styling (clean, functional)

## Phase 4: Step Components ✓
- [x] Base step component (title, fork button, expandable details)
- [x] Step state: pending / in-progress / complete / error
- [x] "Show details" expandable section (request/response)
- [x] Step-specific input forms (Start, Discovery, Registration, Authorization, Callback, Token, Refresh, Introspect, Revoke)

## Phase 5: OAuth Steps Implementation

### 5.1 Discovery ✓
- [x] Input: authorization server base URL
- [x] Fetch `.well-known/oauth-authorization-server` (with OIDC fallback)
- [x] Display metadata (endpoints, supported features)
- [x] Store metadata in flow state

### 5.2 Registration ✓
- [x] Option A: Dynamic registration (POST to registration endpoint)
- [x] Option B: Manual input (client_id, client_secret)
- [x] Store client credentials in flow state

### 5.3 Authorization ✓
- [x] Generate PKCE (code_verifier, code_challenge)
- [x] Build authorization URL (client_id, redirect_uri, scope, state, PKCE)
- [x] Save state to localStorage before redirect
- [x] Redirect to authorization server

### 5.4 Callback Handling ✓
- [x] `callback.html`: read URL params (code, state, error)
  - [x] Store result in localStorage
- [x] Redirect back to main app
- [x] Main app: detect callback, load result, continue flow

### 5.5 Token Exchange ✓
- [x] POST to token endpoint (code, code_verifier, client credentials)
- [x] Parse and display token response
- [x] Store tokens in flow state

## Phase 6: Backend Proxy ✓ (CRITICAL - CORS workaround)

CORS restrictions prevent browser-only operation for certain endpoints.
See `goals.md` "CORS" section for details.

### 6.1 Backend Setup ✓
- [x] Create Express server (`server/index.ts`)
- [x] Dev mode: Express uses Vite as middleware (single process, HMR works)
- [x] Prod mode: Express serves `dist/` static files
- [x] Scripts: `dev` (unified), `build` (frontend), `start` (production)

### 6.2 Proxy Endpoint ✓
- [x] `POST /api/proxy` - Generic request forwarder
  - Accepts: `{ url, method, headers, body }`
  - Returns: `{ status, headers, body }`
  - Stateless - no secrets stored server-side
  - Validates: URL format, HTTPS required (except localhost)

### 6.3 Frontend Integration ✓
- [x] Create `proxyFetch()` utility in `services/proxy.ts`
- [x] Update registration service to use proxy
- [x] Update token service to use proxy (for confidential clients)
- [x] Update error handling to support `ProxyFetchError`

## Phase 7: Remaining OAuth Operations (requires proxy)

### 7.1 Token Refresh ✓
- [x] POST to token endpoint with refresh_token grant
- [x] Update stored tokens
- [x] Add new refresh step if new refresh_token received

### 7.2 Introspection
- [ ] POST to introspection endpoint
- [ ] Display token info (active, scope, exp, etc.)

### 7.3 Revocation
- [ ] POST to revocation endpoint
- [ ] Confirm revocation

## Phase 8: Polish
- [ ] Error handling and display
- [ ] Loading states
- [ ] Responsive layout adjustments
- [ ] Pre-create example preset flows

## File Structure (proposed)
```
oauth-tester/
├── public/
│   └── callback.html
├── server/
│   └── index.ts          # Express server (dev: Vite middleware, prod: static)
├── src/
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── FlowView.tsx
│   │   ├── FlowName.tsx
│   │   └── steps/
│   │       ├── StepBase.tsx
│   │       ├── DiscoveryStep.tsx
│   │       ├── RegistrationStep.tsx
│   │       ├── AuthorizationStep.tsx
│   │       ├── CallbackStep.tsx
│   │       ├── TokenStep.tsx
│   │       ├── RefreshStep.tsx
│   │       ├── IntrospectStep.tsx
│   │       └── RevokeStep.tsx
│   ├── services/
│   │   ├── storage.ts
│   │   ├── oauth.ts
│   │   ├── pkce.ts
│   │   └── proxy.ts      # proxyFetch() utility
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.server.json  # TypeScript config for server
├── vite.config.ts
├── eslint.config.js
├── .prettierrc
└── .gitignore
```

## Implementation Order
1. Phase 1 + 2 (foundation) ✓
2. Phase 3 (see something working) ✓
3. Phase 5.1 - 5.2 (discovery + registration) ✓
4. Phase 4 (refine step components as we go) ✓
5. Phase 5.3 - 5.5 (core OAuth flow) ✓
6. Phase 6 (backend proxy) ✓
7. **Phase 7 (remaining OAuth operations - refresh, introspect, revoke)** ← CURRENT
8. Phase 8 (polish)

---
*Edit this file and let's refine before coding*
