const README_CONTENT = `
# Velocis

**Autonomous AI Digital Team Member**

> Velocis is an always-on Senior Engineer embedded directly in your codebase. It proactively reviews code, writes and heals tests, and generates live architecture documentation.

[![Version](https://img.shields.io/badge/version-2.4.1-brightgreen)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()
[![AWS](https://img.shields.io/badge/Built%20on-AWS-orange)]()
[![Bedrock](https://img.shields.io/badge/Powered%20by-Amazon%20Bedrock-purple)]()

## Overview

Velocis addresses the gap between junior developer output and production-grade standards. It deploys three autonomous AI agents (Sentinel, Fortress, Visual Cortex) via GitHub OAuth integration to automate code review, QA, and architecture mapping.

**Key Features:**
- **Automated semantic code review** with mentorship quality feedback
- **Zero-touch test generation** with self-healing execution loops
- **Live architecture maps**
- **Continuous vulnerability detection**

## Architecture

**Tri-Agent System:**
1. **Sentinel (Code Review):** Analyzes business logic, security intent, and architecture context.
2. **Fortress (QA Engine):** Generates and executes test suites. Automatically attempts fixes on failure (up to 3 iterations).
3. **Visual Cortex (Architecture):** Transforms the codebase into a live dependency graph using ReactFlow and GSAP.

**Data Flow:**
1. Developer opens a Pull Request
2. Webhook triggers Amazon API Gateway
3. AWS Lambda Webhook Processor fans out to all agents
4. Agents process changes via Amazon Bedrock (no source code persisted)
5. Sentinel posts reviews, Fortress commits tests, Cortex updates maps

## Technology Stack

- **AI Inference:** Amazon Bedrock (Claude 3.5 Sonnet, Llama 3)
- **Embeddings/RAG:** Amazon Titan Embeddings v2, Amazon Bedrock Knowledge Bases
- **Compute:** AWS Lambda, AWS Step Functions
- **Data:** Amazon DynamoDB
- **Frontend:** Next.js, ReactFlow, GSAP
- **Dev Tooling:** Kiro (Spec-Driven Development)

## API Reference

**Webhook Payload:**
\`\`\`typescript
interface GitHubWebhookPayload {
  action: 'opened' | 'synchronize' | 'closed' | 'reopened';
  pull_request: {
    number: number;
    title: string;
    body: string;
    head: { sha: string; ref: string };
    base: { sha: string; ref: string };
    changed_files: number;
  };
  repository: { id: number; full_name: string; };
  sender: { login: string; id: number; };
}
\`\`\`

## Getting Started

**Installation:**
\`\`\`bash
git clone https://github.com/merge-conflict/velocis.git
cd velocis
npm install
cp .env.example .env.local
npm run dev
\`\`\`

## License
MIT License
Copyright (c) 2026 Merge Conflict
`;
export default README_CONTENT;
