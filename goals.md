# OAuth 2.1 Flow Tester - Design Goals

## Purpose
Browser-based tool for testing OAuth 2.1 implementation flows from the client perspective. Designed for developers to interactively walk through and debug OAuth flows.

## Core OAuth 2.1 Features to Support
- [ ] Metadata discovery (`.well-known/oauth-authorization-server`)
- [ ] Dynamic client registration
- [ ] Authorization request with PKCE (required in 2.1)
- [ ] Token endpoint (authorization code exchange)
- [ ] Token refresh
- [ ] Token introspection
- [ ] Token revocation

## UI Layout

```
+------------------+----------------------------------------+
|                  |  Flow name: Flow #1  (click to edit)   |
|  [+ New Flow]    +----------------------------------------+
|                  |                                        |
|  Flow History    |     OAuth Flow Steps (chat-like)       |
|  (sorted by      |                                        |
|   last modified) |     Step 1: Discovery          [Fork]  |
|                  |     [user choices / results]           |
|  - Flow #2       |                                        |
|  - Flow #1       |     Step 2: Registration       [Fork]  |
|  - Flow #3       |     [user choices / results]           |
|                  |                                        |
|                  |     Step 3: Authorization      [Fork]  |
|                  |     [...]                              |
|                  |                                        |
|                  |     (new steps appear at bottom)       |
|                  |     (scroll up to see history)         |
+------------------+----------------------------------------+
```

### Flow Management
- **Flow list**: Sorted by last modified time (most recent first)
- **Flow name**: Inline editable at bottom (click text to edit, no button)
- **Fork**: Each step has a fork button
  - Creates new flow copying all steps up to and including that point
  - Inherits state (client credentials, tokens, PKCE context) at that moment
  - Allows branching to test different paths (e.g., different scopes, retry with changes)

## Technical Approach

### Stack
- HTML + CSS + Typescript + React
- npm + node.js for development (Vite or similar)
- Local storage for persistence
- No backend required

### Production Build
- Output: static files only (HTML, JS, CSS)
- Deploy to any static hosting (nginx, Apache, S3, GitHub Pages, Netlify, etc.)
- Single `dist/` folder with all assets
- Works with any base URL path (configurable)
- `callback.html` must be included in build output

### Redirect URL Solution
**Problem**: OAuth redirect_uri cannot contain `#` fragment

**Proposed Solution**:
- Separate `callback.html` page
- Before redirect: save state (PKCE verifier, flow ID, etc.) to localStorage
- `callback.html` reads URL params (`code`, `state`, `error`)
- Stores result in localStorage, redirects back to main app
- Main app detects completion and continues flow

### State to Persist (per flow)
- Flow ID, name, createdAt, lastModified
- Parent flow ID + step index (if forked)
- Server metadata (after discovery)
- Client credentials (after registration)
- PKCE: code_verifier, code_challenge
- Authorization code (temporary)
- Tokens (access_token, refresh_token, expiry)
- Request/response logs for each step

## Flow Steps (Interactive)

1. **Start** - Enter authorization server base URL
2. **Discovery** - Fetch and display metadata, show supported features
3. **Registration** - Register client or enter existing credentials
4. **Authorization** - Configure scopes, initiate PKCE, redirect to AS
5. **Callback** - Handle redirect, extract code
6. **Token Exchange** - Exchange code for tokens
7. **Refresh** - Test token refresh
8. **Introspect/Revoke** - Additional token operations

### Flow Start Presets
Presets are just regular flows - fork from any step to start a new flow from that point.

Example preset flows (pre-created):
- **Full flow** - Empty flow, start from discovery
- **Known server** - Flow with endpoints manually entered, fork after step 1
- **Existing client** - Flow with client_id/secret filled, fork after step 3
- **Have tokens** - Flow with tokens pre-filled, fork to test refresh/introspect

No special preset system - just flows and forking.

## Open Questions

- [ ] Support for different grant types beyond authorization_code?
- [ ] Should we support PAR (Pushed Authorization Requests)?
- [ ] Export/import flow configurations?

## Confirmed Features

- **Request/Response details**: Each step shows expandable "Show details" section with:
  - Raw HTTP request (method, URL, headers, body)
  - Raw HTTP response (status, headers, body)
  - Useful for debugging and understanding the OAuth flow

## Non-Goals (for initial version)
- Backend/server component
- Actual OAuth server implementation
- Support for OAuth 1.0
- Mobile app testing
