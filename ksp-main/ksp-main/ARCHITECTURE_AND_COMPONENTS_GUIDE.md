# 🛡️ KSP Sentinel AI — System Architecture & Component Specification Document

**Author / Engineering Team:** KSP Sentinel AI Development Team  
**Date:** August 28, 2026  
**Version:** 2.0.0 (Production Release)  
**System Target:** Karnataka State Police (KSP) Command & Decision Support Platform  

---

## 📑 Table of Contents
1. [Executive Overview](#1-executive-overview)
2. [LLM Architecture & Token Lifecycle](#2-llm-architecture--token-lifecycle)
3. [Query Understanding & Processing Pipeline](#3-query-understanding--processing-pipeline)
4. [Hardcoded vs. Dynamic Components (Architectural Matrix)](#4-hardcoded-vs-dynamic-components-architectural-matrix)
5. [Detailed Module-by-Module Technical Audit](#5-detailed-module-by-module-technical-audit)
6. [Division Isolation & Security Protocol](#6-division-isolation--security-protocol)

---

## 1. Executive Overview

The **KSP Sentinel AI Command Platform** is an enterprise-grade, multi-modal intelligence system engineered for the Karnataka State Police. It integrates:
* **Predictive Crime Pattern Intelligence:** Empirical analysis across 31 Karnataka districts and 2,000 baseline crime records.
* **Hierarchical Calendar & Event Intelligence:** Multi-tiered operational scheduling with parent-child division inheritance and proximity reminder alerts.
* **Document RAG (Retrieval-Augmented Generation):** Digital evidence, FIR analysis, and Standard Operating Procedure (SOP) retrieval.
* **Conversational AI Engine:** Dynamic, natural-language generation driven by Zoho Catalyst QuickML GLM-4.7-Flash with zero hardcoded response templates.

---

## 2. LLM Architecture & Token Lifecycle

### 🤖 LLM Specifications
* **LLM Provider / Platform:** Zoho Catalyst QuickML
* **LLM Model Name:** **Zoho Catalyst QuickML GLM-4.7-Flash**
* **Internal Model Identifier:** `crm-di-glm47b_30b_it`
* **API Endpoint:** `https://api.catalyst.zoho.in/quickml/v1/project/54626000000013049/glm/chat`
* **Generation Strategy:** 100% Dynamic synthesis. The engine strips out all legacy template prefixes (e.g., `**INTELLIGENCE BRIEFING**`, static markdown builders) and injects raw context into a unified dynamic prompt.

### 🔄 8-Minute Token Expiry Management
To prevent authentication failures caused by short-lived credentials, the system enforces an **8-minute token refresh cycle (480 seconds)** with a 30-second proactive safety buffer across all services:

```javascript
// Enforced in llmService.js, memoryService.js, and calendarService.js
const TOKEN_TTL_MS = 8 * 60 * 1000; // 8 minutes (480,000 ms)
const SAFETY_BUFFER_MS = 30 * 1000;  // 30 seconds

export async function getCatalystToken(forceRefresh = false) {
  if (!forceRefresh && cachedAccessToken && Date.now() < tokenExpiresAt - SAFETY_BUFFER_MS) {
    return cachedAccessToken;
  }
  // Automated OAuth refresh via https://accounts.zoho.in/oauth/v2/token
  ...
  tokenExpiresAt = Date.now() + Math.min((data.expires_in || 480) * 1000, TOKEN_TTL_MS);
  return cachedAccessToken;
}
```

---

## 3. Query Understanding & Processing Pipeline

```
+-------------------------------------------------------------------------------+
|                             USER CHAT MESSAGE                                 |
|               + Active Session ID + Logged-in Division Context                |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                       1. INTENT & CONTEXT CLASSIFIER                          |
|      - Extracts 31 Karnataka District entities                                |
|      - Carries over multi-turn context (e.g. active comparison targets)       |
|      - Classifies into 9 distinct intent routes                               |
+---------------------------------------+---------------------------------------+
                                        |
         +------------------------------+------------------------------+
         |                              |                              |
         v                              v                              v
+------------------+          +------------------+          +------------------+
|  SECURITY_BLOCK  |          |  CALENDAR_QUERY  |          |  GENERAL_CRIME   |
| Prompt Injection |          |   / REMINDERS    |          |   / COMPARISON   |
| Credential Leaks |          | (Catalyst DB)    |          | (Pattern Engine) |
+--------+---------+          +--------+---------+          +--------+---------+
         |                             |                             |
         v                             +--------------+--------------+
  [Canned Security                                    |
      Protocol]                                       v
                                   +------------------------------------+
                                   |    2. UNIFIED EVIDENCE GATHERING   |
                                   |  - Crime metrics & Hotspots        |
                                   |  - Filtered Calendar Events        |
                                   |  - Grounded Document RAG Chunks    |
                                   +------------------+-----------------+
                                                      |
                                                      v
                                   +------------------------------------+
                                   |  3. DYNAMIC GLM REASONING & CALL   |
                                   |   QuickML GLM-4.7-Flash synthesizes|
                                   |   natural response structure       |
                                   +------------------+-----------------+
                                                      |
                                                      v
                                   +------------------------------------+
                                   |  4. GUARDRAIL OUTPUT VERIFICATION  |
                                   |  - Factuality & Grounding check    |
                                   |  - Secret leak prevention check    |
                                   +------------------+-----------------+
                                                      |
                                                      v
                                   +------------------------------------+
                                   |  5. SESSION MEMORY PERSISTENCE     |
                                   |   Saved to Catalyst ChatMemory     |
                                   +------------------+-----------------+
                                                      |
                                                      v
                                              [Delivered to UI]
```

---

## 4. Hardcoded vs. Dynamic Components (Architectural Matrix)

### 🔒 Category A: Components NECESSARY to be Hardcoded

| Component | Why It MUST be Hardcoded |
| :--- | :--- |
| **Security Guardrails & Jailbreak Filters** | Security policies must be deterministic and hard-blocked at the gateway to prevent prompt injection and unauthorized credential access. |
| **Infrastructure Cloud Endpoints & IDs** | Zoho Catalyst API URLs, BaaS table IDs (`ChatMemory: 54626000000092001`), Project IDs, and Model Identifiers (`crm-di-glm47b_30b_it`) are static infrastructure properties. |
| **Karnataka Jurisdictional Boundaries** | The list of 31 districts and police division hierarchies are statutory boundaries set by state notifications. |
| **2026 Karnataka Gazetted Public Holidays** | State gazetted holidays are officially declared and serve as a resilient offline seed baseline. |
| **Crime Dataset Schema & Normalization Maps** | Crime categories (e.g. *Chain Snatching*, *ATM Tampering*) and temporal slots ensure consistent calculation metrics. |
| **UI Design System & Navigation Routes** | Police brand colors (Khaki, Navy, Gold) and dashboard view layouts maintain uniformity. |

---

### ⚡ Category B: Components that MUST NOT be Hardcoded (Dynamic)

| Component | Why It MUST NOT be Hardcoded | How It Is Dynamically Handled |
| :--- | :--- | :--- |
| **Chatbot Response Text & Formats** | Hardcoded markdown templates make responses robotic and repetitive. | **GLM-4.7-Flash** dynamically decides structure (paragraphs, bullets, comparisons) based on query context. |
| **Crime Trend Analysis & Percentages** | Statistics must reflect verified data rather than static statements. | Calculated dynamically at query time from the 2,000-record indexed dataset. |
| **Document / FIR Question Answering** | Document contents cannot be pre-programmed. | Extracted via PDF parser, chunked into vector storage, and answered via grounded LLM RAG. |
| **Operational Calendar Events** | Police schedules change constantly. | Saved and queried in real-time from the Zoho Catalyst `CalendarEvents` BaaS table. |
| **Multi-Turn Conversational Memory** | Follow-up context (*"Why is that high?"*) varies across turns. | Persisted dynamically per session in the Catalyst `ChatMemory` table. |
| **OAuth Access Tokens** | Tokens expire and cannot remain static in configuration files. | Refreshed dynamically on an automated 8-minute cycle. |

---

## 5. Detailed Module-by-Module Technical Audit

### Module 1: `server/services/llmService.js`
* **Role:** Manages Zoho OAuth token lifecycle, QuickML GLM-4.7-Flash API calls, and prompt synthesis.
* **Hardcoded:** Zoho Token URL, QuickML Chat URL, Model ID, 8-minute TTL constants, system instruction rules.
* **Dynamic:** OAuth token auto-refresh, dynamic evidence injection (`unifiedEvidence`), response text formatting.

### Module 2: `server/services/chatService.js`
* **Role:** Central conversational routing, multi-turn memory integration, and intent parsing.
* **Hardcoded:** Intent classification regex rules, canned security responses, out-of-scope fallback messages.
* **Dynamic:** District entity extraction, conversation state tracking, dynamic RAG synthesis, Catalyst turn logging.

### Module 3: `server/services/calendarService.js`
* **Role:** Hierarchical Calendar and Event Intelligence engine.
* **Hardcoded:** 2026 Karnataka Gazetted Holidays seed data, baseline operational police events, division hierarchy tree.
* **Dynamic:** CRUD operations on Catalyst `CalendarEvents` table, division visibility filtering, 2-day proximity reminder calculation.

### Module 4: `src/crimepattern/crimePatternEngine.js` & `server/services/crimePatternService.js`
* **Role:** Deterministic statistical and crime pattern intelligence engine.
* **Hardcoded:** 2,000 synthetic baseline crime records (`crime_pattern_dataset_2000.csv`), district and locality dictionaries.
* **Dynamic:** Crime share %, peak operational windows, demographic offender correlations, area comparison metrics.

### Module 5: `server/services/guardrailService.js`
* **Role:** 3-tier security, context, and output verification filter.
* **Hardcoded:** RegEx patterns for sensitive terms, prompt injections, system prompt leak patterns, allowed topic whitelists.
* **Dynamic:** Real-time context validity checks, evidence sufficiency verification, output grounding verification.

### Module 6: `server/services/memoryService.js`
* **Role:** Persistent conversation memory storage in Zoho Catalyst BaaS.
* **Hardcoded:** Catalyst Table ID (`54626000000092001`) and Project ID (`54626000000013049`).
* **Dynamic:** Saving and loading turns keyed by `conversationId` and `division` with strict data isolation.

### Module 7: `backend/rag_engine.py` & `backend/ingestion.py`
* **Role:** Document RAG (Retrieval-Augmented Generation) pipeline for FIRs and SOPs.
* **Hardcoded:** Seed Cyber Crime SOP text, chunking parameters (`chunk_size=500`, `chunk_overlap=50`).
* **Dynamic:** OCR & PDF parsing, vector embedding generation, cosine similarity retrieval, context injection.

### Module 8: `backend/app.py` & `backend/database.py`
* **Role:** Flask core backend for complaints management and analytics APIs.
* **Hardcoded:** SQLite database schemas and table definitions.
* **Dynamic:** Live complaint filing, status tracking, and analytics querying.

### Module 9: `frontend/` (React + Vite SPA)
* **Role:** Interactive user interface (Dashboard, Chatbot Modal, Calendar, Analytics, Map, Complaints).
* **Hardcoded:** UI theme tokens, navigation tabs, branding assets, static district dropdown lists.
* **Dynamic:** Live chat stream rendering, interactive calendar grid with division filters, real-time Chart.js graphs, dynamic Leaflet map markers.

---

## 6. Division Isolation & Security Protocol

1. **Pre-LLM Filtering:** Division access rules are enforced strictly in the database/service layer before data reaches the LLM prompt.
2. **Calendar Visibility Hierarchy:**
   - **Common Events:** Visible to all divisions across Karnataka.
   - **Head Division Events:** Visible to the Head Division and all of its subordinate sub-divisions.
   - **Sub-Division Events:** Isolated strictly to that specific sub-division.
   - **Cross-Division Isolation:** Mysuru cannot access Bengaluru operational events; Belagavi cannot access Kalaburagi operational events.
3. **ChatMemory Isolation:** Chat conversation histories are strictly isolated per console session and division. Sub-divisions do not inherit parent division chat logs.

---
*Document officially registered and maintained in repository.*
