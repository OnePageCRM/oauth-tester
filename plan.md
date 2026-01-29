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

### 5.6 Token Refresh
- [ ] POST to token endpoint with refresh_token grant
- [ ] Update stored tokens

### 5.7 Introspection
- [ ] POST to introspection endpoint
- [ ] Display token info (active, scope, exp, etc.)

### 5.8 Revocation
- [ ] POST to revocation endpoint
- [ ] Confirm revocation

## Phase 6: Polish
- [ ] Error handling and display
- [ ] Loading states
- [ ] Responsive layout adjustments
- [ ] Pre-create example preset flows

## File Structure (proposed)
```
oauth-tester/
├── public/
│   └── callback.html
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
│   │   └── pkce.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── eslint.config.js
├── .prettierrc
└── .gitignore
```

## Implementation Order
1. Phase 1 + 2 (foundation)
2. Phase 3 (see something working)
3. Phase 5.1 - 5.2 (discovery + registration)
4. Phase 4 (refine step components as we go)
5. Phase 5.3 - 5.5 (core OAuth flow)
6. Phase 5.6 - 5.8 (optional operations)
7. Phase 6 (polish)

---
*Edit this file and let's refine before coding*
