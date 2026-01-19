---
title: Overview
description: Complete integration examples for different architectures.
---

# Examples

This section provides complete integration examples for different architectures. Each example walks through building a functional chat interface from scratch.

## Available Examples

| Example                                    | Transport | Best For                          |
| ------------------------------------------ | --------- | --------------------------------- |
| [Next.js Chat](/docs/examples/nextjs-chat) | HTTP/SSE  | Next.js, Remix, standard web apps |
| [Socket Chat](/docs/examples/socket-chat)  | SockJS    | Meteor, Phoenix, real-time apps   |

## Choosing a Transport

**Use HTTP Transport when:**

- Building with Next.js, Remix, or similar frameworks
- You want the simplest integration
- Deploying to serverless (Vercel, Netlify, etc.)

**Use Socket Transport when:**

- Using Meteor, Phoenix, or socket-based frameworks
- Need custom real-time events (typing indicators, presence)
- Behind proxies that don't support SSE well
