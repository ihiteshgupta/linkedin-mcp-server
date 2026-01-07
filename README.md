# LinkedIn MCP Server

A Model Context Protocol (MCP) server for LinkedIn that enables AI assistants to post content and manage your LinkedIn profile.

## Features

- Post text updates to LinkedIn
- Share articles with commentary
- Get profile information
- Delete posts
- Multiple visibility options (Public, Connections, Logged-in users)

## Prerequisites

- Node.js 18+
- A LinkedIn Developer App with OAuth 2.0 credentials

## Setup

### 1. Create a LinkedIn Developer App

1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com/apps)
2. Click "Create App"
3. Fill in the required information:
   - App name
   - LinkedIn Page (you'll need a company page)
   - App logo
4. After creation, go to the "Auth" tab
5. Add `http://127.0.0.1:3000/callback` to "Authorized redirect URLs for your app"
6. Note your **Client ID** and **Client Secret**

### 2. Request API Products

In your LinkedIn app settings, go to "Products" and request access to:

- **Sign In with LinkedIn using OpenID Connect** (Required - for authentication)
- **Share on LinkedIn** (Required - for posting)

These typically get approved instantly for personal use.

### 3. Install & Configure

```bash
cd linkedin-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Create config directory
mkdir -p ~/.linkedin-mcp

# Create credentials file
cat > ~/.linkedin-mcp/credentials.json << 'EOF'
{
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "YOUR_CLIENT_SECRET"
}
EOF

# Authenticate (opens browser)
npm run auth
```

### 4. Register with Claude Code

```bash
claude mcp add linkedin -- node /path/to/linkedin-mcp-server/dist/index.js
```

Or add manually to `~/.claude.json`:

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/path/to/linkedin-mcp-server/dist/index.js"]
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `linkedin_get_profile` | Get your LinkedIn profile information |
| `linkedin_create_post` | Create a text post on LinkedIn |
| `linkedin_create_article_post` | Share an article with commentary |
| `linkedin_get_posts` | Get your recent posts |
| `linkedin_delete_post` | Delete a post by ID |
| `linkedin_get_connections_count` | Get your connection count |

## Usage Examples

### Create a Text Post

```
Post to LinkedIn: "Excited to share that I'm learning about AI assistants! #AI #Technology"
```

### Share an Article

```
Share this article on LinkedIn with my thoughts: https://example.com/article
Commentary: "Great insights on the future of AI development"
```

### Different Visibility Options

- `PUBLIC` - Visible to everyone (default)
- `CONNECTIONS` - Visible only to your 1st-degree connections
- `LOGGED_IN` - Visible only to logged-in LinkedIn members

## File Locations

- Credentials: `~/.linkedin-mcp/credentials.json`
- Auth token: `~/.linkedin-mcp/token.json`

## Troubleshooting

### "Not authenticated" error

Run the authentication flow again:
```bash
npm run auth
```

### "Unable to determine member URN" error

Ensure you have the "Sign In with LinkedIn using OpenID Connect" product enabled in your LinkedIn app.

### Token expired

LinkedIn tokens expire after 60 days. Delete the token file and re-authenticate:
```bash
rm ~/.linkedin-mcp/token.json
npm run auth
```

### Post creation fails

Ensure you have the "Share on LinkedIn" product enabled and approved in your LinkedIn app.

## Security Notes

- OAuth tokens are stored locally in `~/.linkedin-mcp/token.json`
- Never commit credentials.json or token.json to version control
- The server only requests necessary scopes for posting and profile access

## API Limitations

LinkedIn's API has some restrictions:

- Post character limit: 3000 characters
- Rate limits apply (varies by endpoint)
- Some features (like reading the feed) require partner-level access
- Connection data access is limited

## License

MIT
