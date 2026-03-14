# Agent Loop

This document explains what an agent loop is and how ao-agent uses it when MCP is enabled.

## What is an Agent Loop?

An **agent loop** (also called an **agentic loop**) is the core pattern behind AI agents that can use tools. Instead of a simple "question → answer" flow, the model repeatedly:

1. **Reason** — Thinks about what to do next based on the user's request and prior context.
2. **Act** — Decides to call one or more tools (e.g. MCP tools) and outputs tool calls with arguments.
3. **Observe** — The system runs the tools and receives results.
4. **Loop** — The results are added to the conversation context, and the model reasons again. It may call more tools or produce a final text response.

The loop ends when the model returns **text only** (no tool calls), or when a maximum number of iterations is reached.

## Why Use an Agent Loop?

- **Tool use** — The model can perform real-world actions: read files, query APIs, run searches, etc.
- **Multi-step reasoning** — Complex tasks can be broken into multiple tool calls (e.g. list directory, then read a file, then summarize).
- **Dynamic context** — Each tool result updates the context so the model can refine its next step.

## How ao-agent Implements the Loop

When MCP is enabled and connected:

1. **Initialization** — The user's message and chat history are turned into conversation content for the model.
2. **Generate** — The model is called with MCP tools available.
3. **Check response**:
   - If the response contains **tool calls** → execute each tool via the MCP client, add the results to the conversation, and go back to step 2.
   - If the response is **text only** → return that text as the final answer.
4. **Limit** — The loop stops after `AGENT_MAX_ITERATIONS` (default: 10) to avoid unbounded context growth and cost.

## Context Growth and Limits

At each iteration, tool calls and their results are appended to the context. Large or long loops can:

- Increase token usage and latency.
- Hit context window limits.
- Add noise and distract the model.

ao-agent mitigates this by:

- **`AGENT_MAX_ITERATIONS`** — Caps the number of tool-call rounds per turn.
- **Explicit exit** — The loop stops as soon as the model returns text only.

## Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      User Message                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Model (Gemini + MCP tools)  →  Response                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
     ┌─────────────────┐     ┌──────────────────┐
     │ Text only?      │     │ Tool calls?      │
     │ → Return answer │     │ → Execute tools  │
     └─────────────────┘     │ → Add results    │
                             │ → Loop (repeat)  │
                             └──────────────────┘
```

## Streaming Behaviour

When MCP is enabled and the agent loop is used, streaming behaves differently: the backend runs the full loop (including tool calls) before returning the final answer. The client receives the complete response in one chunk rather than token-by-token, because tool execution and multi-turn reasoning require the full loop to complete first.
