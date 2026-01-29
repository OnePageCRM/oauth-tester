# OAuth 2.1 Flow Tester - Implementation Plan

## Phase 1: Project Setup
- [x] Initialize Vite + React + TypeScript project
- [x] Configure build for static output
- [x] Set up basic folder structure
- [x] Add `callback.html` to public folder
- [ ] Set up ESLint (TypeScript + React rules)
- [ ] Set up Prettier (formatting)
- [ ] Set up Vitest (testing)
- [ ] Add npm scripts: `lint`, `test`

## Phase 2: Core Data Layer
- [ ] Define TypeScript types for Flow, Step, FlowState
- [ ] Implement localStorage service (save/load flows)
- [ ] Flow CRUD operations (create, read, update, delete)
- [ ] Fork flow logic (copy steps up to point, new ID, inherit state)

## Phase 3: UI Shell
- [ ] Layout: sidebar + main content area
- [ ] Sidebar: "New Flow" button + flow list (sorted by lastModified)
- [ ] Main area: flow name (inline editable) + scrollable steps
- [ ] Basic styling (clean, functional)

## Phase 4: Step Components
- [ ] Base step component (title, fork button, expandable details)
- [ ] Step state: pending / in-progress / complete / error
- [ ] "Show details" expandable section (request/response)
- [ ] Step-specific input forms

## Phase 5: OAuth Steps Implementation

### 5.1 Discovery
- [ ] Input: authorization server base URL
- [ ] Fetch `.well-known/oauth-authorization-server`
- [ ] Display metadata (endpoints, supported features)
- [ ] Store metadata in flow state

### 5.2 Registration
- [ ] Option A: Dynamic registration (POST to registration endpoint)
- [ ] Option B: Manual input (client_id, client_secret)
- [ ] Store client credentials in flow state

### 5.3 Authorization
- [ ] Generate PKCE (code_verifier, code_challenge)
- [ ] Build authorization URL (client_id, redirect_uri, scope, state, PKCE)
- [ ] Save state to localStorage before redirect
- [ ] Redirect to authorization server

### 5.4 Callback Handling
- [ ] `callback.html`: read URL params (code, state, error)
- [ ] Store result in localStorage
- [ ] Redirect back to main app
- [ ] Main app: detect callback, load result, continue flow

### 5.5 Token Exchange
- [ ] POST to token endpoint (code, code_verifier, client credentials)
- [ ] Parse and display token response
- [ ] Store tokens in flow state

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
