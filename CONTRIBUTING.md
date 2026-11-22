# Contributing to GlobalPulse

Thanks for helping. The most valuable contribution is a **data trap**: a result that looked right and was not.

## Report a problem

- **A wrong or stale result:** open an issue with the *Data trap* template. Include the tool, the arguments, the output and what you expected.
- **A bug in the server:** use the *Bug report* template.
- **A security problem:** do not open an issue. Follow [SECURITY.md](SECURITY.md).

## Set up

Fork the repository on GitHub and clone your fork. Then, from its folder:

```bash
npm install
npm run build
TRANSPORT=http npm start    # http://localhost:3000/mcp (default transport is stdio)
```

Health check: http://localhost:3000/health

## Pull requests

1. Fork, then branch from `main`.
2. Keep changes small and focused: one tool or one fix per PR.
3. Open an issue first to claim a Priority 2 tool from [ROADMAP.md](ROADMAP.md).
4. Keep the server read-only and stateless, and credit the data source in the tool's response.
5. A new third-party source must have terms that allow this use. Link them in the PR and add the source to the README and `PRIVACY.md`.
6. Describe what changed and why, and paste before and after output for any result that changed.
