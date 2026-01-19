---
title: HTTP Transport
description: Using HTTP/SSE for streaming with Octavus in Next.js, Express, and other frameworks.
---

# HTTP Transport

The HTTP transport uses standard HTTP requests with Server-Sent Events (SSE) for streaming. This is the simplest and most compatible transport option.

## When to Use HTTP Transport

| Use Case                                       | Recommendation                                                 |
| ---------------------------------------------- | -------------------------------------------------------------- |
| Next.js, Remix, or similar frameworks          | ✅ Use HTTP                                                    |
| Standard web apps without special requirements | ✅ Use HTTP                                                    |
| Serverless deployments (Vercel, etc.)          | ✅ Use HTTP                                                    |
| Need custom real-time events                   | Consider [Socket Transport](/docs/client-sdk/socket-transport) |

## Basic Setup

### Client

```tsx
import { useMemo } from 'react';
import { useOctavusChat, createHttpTransport } from '@octavus/react';

function Chat({ sessionId }: { sessionId: string }) {
  const transport = useMemo(
    () =>
      createHttpTransport({
        triggerRequest: (triggerName, input, options) =>
          fetch('/api/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, triggerName, input }),
            signal: options?.signal,
          }),
      }),
    [sessionId],
  );

  const { messages, status, error, send, stop } = useOctavusChat({ transport });

  const sendMessage = async (text: string) => {
    await send('user-message', { USER_MESSAGE: text }, { userMessage: { content: text } });
  };

  // ... render chat
}
```

### Server (Next.js API Route)

```typescript
// app/api/trigger/route.ts
import { OctavusClient, toSSEStream } from '@octavus/server-sdk';

const client = new OctavusClient({
  baseUrl: process.env.OCTAVUS_API_URL!,
  apiKey: process.env.OCTAVUS_API_KEY!,
});

export async function POST(request: Request) {
  const { sessionId, triggerName, input } = await request.json();

  const session = client.agentSessions.attach(sessionId, {
    tools: {
      'get-user-account': async (args) => {
        return { name: 'Demo User', plan: 'pro' };
      },
    },
  });

  // trigger() returns an async generator, toSSEStream() converts to SSE format
  const events = session.trigger(triggerName, input, { signal: request.signal });

  return new Response(toSSEStream(events), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

## Session Creation

Sessions should be created server-side before rendering the chat. There are two patterns:

### Pattern 1: Create Session on Page Load

```tsx
// app/chat/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Chat } from '@/components/Chat';

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'your-agent-id',
        input: { COMPANY_NAME: 'Acme Corp' },
      }),
    })
      .then((res) => res.json())
      .then((data) => setSessionId(data.sessionId));
  }, []);

  if (!sessionId) {
    return <LoadingSpinner />;
  }

  return <Chat sessionId={sessionId} />;
}
```

### Pattern 2: Server-Side Session Creation (App Router)

```tsx
// app/chat/page.tsx
import { octavus } from '@/lib/octavus';
import { Chat } from '@/components/Chat';

export default async function ChatPage() {
  // Create session server-side
  const sessionId = await octavus.agentSessions.create('your-agent-id', {
    COMPANY_NAME: 'Acme Corp',
  });

  return <Chat sessionId={sessionId} />;
}
```

This pattern is cleaner as the session is ready before the component renders.

## Error Handling

Handle errors with structured error information:

```tsx
import { isRateLimitError, isProviderError } from '@octavus/react';

const { messages, status, error, send } = useOctavusChat({
  transport,
  onError: (err) => {
    console.error('Stream error:', err.errorType, err.message);

    if (isRateLimitError(err)) {
      toast.error(`Rate limited. Try again in ${err.retryAfter}s`);
    } else if (isProviderError(err)) {
      toast.error('AI service temporarily unavailable');
    } else {
      toast.error('Something went wrong');
    }
  },
});

// Also check error state
if (error) {
  return <ErrorMessage error={error} />;
}
```

See [Error Handling](/docs/client-sdk/error-handling) for comprehensive error handling patterns.

## Stop Streaming

Allow users to cancel ongoing streams. When `stop()` is called:

1. The HTTP request is aborted via the signal
2. Any partial content is preserved in the message
3. Tool calls in progress are marked as `cancelled`
4. Status changes to `idle`

```tsx
const { send, stop, status } = useOctavusChat({
  transport,
  onStop: () => {
    console.log('User stopped generation');
  },
});

return (
  <button
    onClick={status === 'streaming' ? stop : () => sendMessage()}
    disabled={status === 'streaming' && !inputValue}
  >
    {status === 'streaming' ? 'Stop' : 'Send'}
  </button>
);
```

> **Important**: For stop to work end-to-end, pass the `options.signal` to your `fetch()` call and forward `request.signal` to `session.trigger()` on the server.

## Express Server

For non-Next.js backends:

```typescript
import express from 'express';
import { OctavusClient, toSSEStream } from '@octavus/server-sdk';

const app = express();
const client = new OctavusClient({
  baseUrl: process.env.OCTAVUS_API_URL!,
  apiKey: process.env.OCTAVUS_API_KEY!,
});

app.post('/api/trigger', async (req, res) => {
  const { sessionId, triggerName, input } = req.body;

  const session = client.agentSessions.attach(sessionId, {
    tools: {
      // Your tool handlers
    },
  });

  const events = session.trigger(triggerName, input);
  const stream = toSSEStream(events);

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Pipe the stream to the response
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    reader.releaseLock();
    res.end();
  }
});
```

## Transport Options

```typescript
interface HttpTransportOptions {
  triggerRequest: (
    triggerName: string,
    input?: Record<string, unknown>,
    options?: TriggerRequestOptions,
  ) => Promise<Response>;
}

interface TriggerRequestOptions {
  signal?: AbortSignal;
}
```

## Protocol

### Request Format

The `triggerRequest` function should send a POST request with:

```json
{
  "sessionId": "sess_abc123",
  "triggerName": "user-message",
  "input": {
    "USER_MESSAGE": "Hello"
  }
}
```

### Response Format

The server responds with an SSE stream:

```
data: {"type":"start","messageId":"msg_xyz"}

data: {"type":"text-delta","id":"msg_xyz","delta":"Hello"}

data: {"type":"text-delta","id":"msg_xyz","delta":" there!"}

data: {"type":"finish","finishReason":"stop"}

data: [DONE]
```

See [Streaming Events](/docs/server-sdk/streaming#event-types) for the full list of event types.

## Next Steps

- [Quick Start](/docs/getting-started/quickstart) — Complete Next.js integration guide
- [Messages](/docs/client-sdk/messages) — Working with message state
- [Streaming](/docs/client-sdk/streaming) — Building streaming UIs
- [Error Handling](/docs/client-sdk/error-handling) — Handling errors with type guards
