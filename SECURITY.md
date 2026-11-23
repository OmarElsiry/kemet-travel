# Security Policy & Practices — Krung Travel

## 1. Credential & Token Hygiene
- **Never commit secrets**: Personal access tokens (`ghp_*`), `.env` files, or API keys must never be stored in source files, commit messages, or CI logs.
- **Immediate rotation**: If a GitHub Personal Access Token is ever pasted into chat, terminal history, or logs, revoke it immediately under **GitHub Settings → Developer settings → Personal access tokens** and issue a fine-grained, least-privilege token scoped solely to the target repository.
- **CI Secrets**: Store deployment credentials exclusively in GitHub Actions Encrypted Secrets (`${{ secrets.* }}`).

## 2. Application Security Controls
- **Zero-secret client bundle**: Only non-sensitive public configuration belongs in `VITE_*` client variables.
- **Safe external media**: All `<img>` tags include `referrerPolicy="no-referrer"` to prevent leaking origin/query parameters (`?rec`) to third-party image CDNs.
- **XSS prevention**: All user inputs (review notes, host inquiries, concierge messages) render strictly via React JSX text bindings—never `dangerouslySetInnerHTML`.
- **Recommended Production HTTP Headers** (configure at reverse proxy / CDN):
  - `Content-Security-Policy`: restrict `default-src 'self'`, `img-src 'self' https://images.higgs.ai data:`, `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, `font-src 'self' https://fonts.gstatic.com`.
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
