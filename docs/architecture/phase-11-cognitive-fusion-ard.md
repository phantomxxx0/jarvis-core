# Phase 11 Architecture Review Document: Cognitive Observation & Fusion Engine

## 1. Introduction & Mission
Phase 11 marks the transition of Jarvis from a reactive agent to a continuous, living AI Operating System. We are pausing all feature development (Voice, Vision, Robotics) to build the Reality Integrator. This document outlines the architecture for the Cognitive Observation & Fusion Engine, focusing on transforming raw worker observations into a coherent, managed reality and narrative memory.

## 2. The Core Duality: Reality State vs. Episode
A foundational principle of Phase 11 is the strict separation of current reality and past narrative.
*   **Reality State**: Represents the transient, current state of the world as understood by the system at this exact moment. It is continuously updated, overwritten, and maintained in-memory.
*   **Episode**: Represents a narrative, immutable record of past events. Once an episode is formed and committed to memory, it is historical.
*   **Architectural Constraint**: `Reality State` and `Episode` must NEVER share the same class or domain model. They are fundamentally different ontological concepts.

## 3. The Master Pipeline
The Cognitive Pipeline is the central nervous system of Phase 11. The exact flow of information is as follows:

`Workers -> Observation Bus -> Fusion Engine -> Reality Graph -> [Split: Reflex Bus (to Brain) AND Saliency Engine -> Episode Builder -> Memory] -> Learning -> Personal Intelligence -> Context Prioritizer -> Token Budget Allocator -> Prompt Builder -> Brain`

1.  **Workers**: Sensory inputs and active components generate raw data.
2.  **Observation Bus**: The ingestion layer for all worker data.
3.  **Fusion Engine**: Correlates and normalizes raw observations.
4.  **Reality Graph**: The transient state layer representing "now".
5.  **[Split Routing]**: From the Reality Graph, data flows simultaneously to two destinations:
    *   **Reflex Bus (to Brain)**: For immediate, reactive cognition and rapid response.
    *   **Saliency Engine -> Episode Builder -> Memory**: For long-term narrative formation and storage.
6.  **Learning**: Extracts patterns, concepts, and skills from memory.
7.  **Personal Intelligence**: Updates the user profile and preferences based on learned patterns.
8.  **Context Prioritizer**: Ranks available context (Memory, Knowledge, World, Personal) based on current relevance.
9.  **Token Budget Allocator**: Dynamically allocates context window space based on prioritization.
10. **Prompt Builder**: Constructs the final payload.
11. **Brain**: The core LLM/Cognitive engine receives the optimized prompt.

## 4. The Reality Graph
The Reality Graph acts as an in-memory, transient state layer. It tracks micro-changes in the environment in real-time. It does not store history; it only stores the current configuration of known entities and their relationships. Periodically, or based on significant shifts, this transient state projects into the persistent **World Model**, which acts as the stable baseline of reality.

## 5. Biomimetic Engines
To manage the influx of data and maintain cognitive efficiency, Phase 11 introduces two biomimetic engines:
*   **Saliency Engine**: Scores incoming observations and formed episodes based on novelty, emotional resonance (if applicable), and goal relevance. Only highly salient information is promoted to conscious attention or long-term episodic memory.
*   **Forgetting Engine**: Implements memory decay and archiving. Memories that are not accessed or reinforced gradually lose their retrieval strength and are eventually archived to cold storage to prevent cognitive bloat and reduce search latency.

## 6. Reality Confidence & Sensor Trust
Not all observations are equal. The system must account for sensor reliability and the staleness of information.
*   **Sensor Trust Weights**: Static weights applied to different input modalities based on their inherent reliability.
    *   *Example hierarchy*: Filesystem (1.0) > Vision (0.97) > GPS (0.75).
*   **Confidence Decay**: The confidence in a specific piece of reality state decays over time if not re-observed.
    *   *Example decay curve*: An observation with an initial confidence of 0.98 may decay to 0.31 over 30 minutes of no further reinforcement.

## 7. Context Prioritizer & Token Budget Allocator
To prevent context window collapse, the system cannot feed all known information to the Brain.
*   **Context Prioritizer**: Ranks information from different domains (Memory, Knowledge, World Model, Personal Intelligence) based on the current active goals and the saliency of recent observations.
*   **Token Budget Allocator**: Enforces hard token limits. It dynamically allocates percentages of the available context window to the prioritized domains, ensuring that critical state and relevant memories always fit within the prompt constraints without overflowing.

## 8. Provenance & Time Semantics
Strict data provenance and temporal accuracy are mandatory for the Reality Graph and Episode Builder to function correctly. Every single observation must track:
*   **Identifiers**: `workerId`, `pluginId`, `driverId`, `traceId`.
*   **Five Timestamps**:
    1.  `Observed At`: When the sensor actually captured the data.
    2.  `Occurred At`: When the event is estimated to have happened (may differ from observation).
    3.  `Received At`: When the Observation Bus ingested the data.
    4.  `Processed At`: When the Fusion Engine finalized the observation.
    5.  `Expired At`: When this observation should be considered completely stale and purged from the Reality Graph.
