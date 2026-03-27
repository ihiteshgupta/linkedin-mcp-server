# LinkedIn MCP Server

MCP server for LinkedIn posting and profile management using LinkedIn's OAuth 2.0 API.

## Tech Stack

- TypeScript / Node.js 18+
- MCP SDK (@modelcontextprotocol/sdk)
- LinkedIn REST API
- OAuth 2.0 authentication

## Available Tools (6 total)

- `linkedin_get_profile` - Get authenticated user's profile
- `linkedin_create_post` - Create text post (max 3000 chars)
- `linkedin_create_article_post` - Share article with commentary
- `linkedin_get_posts` - Get recent posts
- `linkedin_delete_post` - Delete a post
- `linkedin_get_connections_count` - Get connection count

### Visibility Options

- `PUBLIC` - Visible to everyone (default)
- `CONNECTIONS` - 1st-degree connections only
- `LOGGED_IN` - LinkedIn members only

## Setup

### 1. Create LinkedIn Developer App

1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/apps)
2. Create app with company page
3. Add redirect URL: `http://127.0.0.1:3000/callback`
4. Request products: "Sign In with LinkedIn" + "Share on LinkedIn"

### 2. Install & Configure

```bash
npm install && npm run build

mkdir -p ~/.linkedin-mcp

# Add credentials
cat > ~/.linkedin-mcp/credentials.json << 'EOF'
{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}
EOF

# Authenticate
npm run auth

# Add to Claude Code
claude mcp add linkedin -- node ~/personal-projects/linkedin-mcp-server/dist/index.js
```

## File Locations

- Credentials: `~/.linkedin-mcp/credentials.json`
- Auth token: `~/.linkedin-mcp/token.json`

## Development Commands

```bash
npm run build        # Compile TypeScript (tsc)
npm run dev          # Build + run server (tsc && node dist/index.js)
npm start            # Run compiled server (node dist/index.js)
npm run auth         # Interactive OAuth flow (opens browser, saves token)
```

No test framework is configured. Manual testing via Claude Code MCP integration.

## Architecture

### Server Pattern
- **Entry point**: `src/index.ts` -- MCP server with stdio transport
- **API client**: `src/linkedin.ts` -- `LinkedInClient` class using native `fetch` against LinkedIn REST API
- **Auth layer**: `src/auth.ts` -- OAuth2 credential/token management with expiry tracking
- **Auth CLI**: `src/auth-cli.ts` -- Interactive browser-based OAuth flow (local HTTP callback server, configurable port/path)

### Request Flow
1. `index.ts` registers `ListToolsRequest` and `CallToolRequest` handlers
2. Tool calls go through `ensureClient()` which lazy-initializes `LinkedInClient` (loads access token, checks expiry)
3. Each tool case in the `switch` delegates to `LinkedInClient` methods
4. Results returned as `{ content: [{ type: "text", text: ... }] }`
5. Errors caught at the top-level try/catch, returned with `isError: true`

### API Version Strategy
`LinkedInClient` uses a multi-endpoint fallback approach for maximum compatibility:
- **REST API** (`/rest/posts`, `/rest/me`) with `LinkedIn-Version: 202401` header -- tried first
- **OpenID Connect** (`/v2/userinfo`) -- used for profile and member URN resolution
- **Legacy v2 API** (`/v2/ugcPosts`, `/v2/me`) -- fallback for older app configurations
- Member URN (`urn:li:person:{sub}`) is resolved lazily and cached on the `LinkedInClient` instance

### Input Validation
Done inline in tool handlers (not in the API client):
- Post text: non-empty check + 3000 character limit
- Article URL: must start with `http`

## Conventions

- TypeScript with ES modules (`"type": "module"` in package.json)
- Uses native `fetch` (no HTTP client library) -- LinkedIn API calls are direct REST
- Tool definitions are inline objects in `index.ts` with `as const` type assertions on schema types
- Tool arguments are cast with `as { ... }` inline type assertions (no zod/validation library)
- Config directory: `~/.linkedin-mcp/` (hardcoded path)
- Token includes user info (`sub`, `name`, `email`) saved during auth for profile enrichment
- OAuth scopes: `openid`, `profile`, `email`, `w_member_social`
- Headers include `X-Restli-Protocol-Version: 2.0.0` for LinkedIn API compatibility
- Success messages for mutating operations return human-readable strings
- Read operations return `JSON.stringify(result, null, 2)` for structured data
- No runtime dependencies beyond MCP SDK and `open` (for browser launch during auth)
- Diagnostic logs go to `console.error` (stderr), keeping stdout clean for MCP stdio transport

## Key Files

- `src/index.ts` - MCP server, tool definitions, and request routing (single switch statement)
- `src/linkedin.ts` - `LinkedInClient` class: posting, profile, articles, connections (REST + legacy fallbacks)
- `src/auth.ts` - OAuth2 credential loading, token persistence, expiry checks, user info fetching
- `src/auth-cli.ts` - Interactive authentication CLI (browser OAuth + local callback server)

## Limitations

- Post character limit: 3000
- Tokens expire after 60 days (re-run `npm run auth`)
- Feed reading requires partner-level access
