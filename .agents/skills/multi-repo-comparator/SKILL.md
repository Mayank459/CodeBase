---
name: multi-repo-comparator
description: Compares architectures, tech stacks, API surfaces, dependency trees, and design patterns across two or more repositories or modular codebases.
---

# Multi-Repository & Architecture Comparator

This skill guides the agent to systematically cross-examine and compare architectures, dependencies, and design patterns across multiple repositories or projects.

## When to Use
- When deciding between two codebases, frameworks, or microservices.
- When performing a migration analysis (e.g., migrating from Repo A to Repo B).
- When comparing structural complexity, API surfaces, or code velocity across team repositories.

## Comparative Dimensions

### 1. Architectural Topology
- Directory layout and separation of concerns (Layered, Clean Architecture, Hexagonal, Monolithic vs Microservices).
- State management and dependency injection patterns.

### 2. Dependency & Stack Comparison
- Framework choices (e.g. FastAPI vs Flask, React vs Next.js).
- Heavy external dependencies, database drivers, and serialization libraries.
- Version drift across shared internal libraries.

### 3. API Surface & Interface Contracts
- Compare route endpoints, request/response models, and serialization schemas.
- Identify missing endpoints, breaking contract deviations, or deprecated fields.

### 4. Code Quality & Test Density
- Compare test-to-code ratios, linter configurations, and CI/CD pipelines.

## Output Structure
Present findings in a structured comparative matrix:
```markdown
| Dimension | Repository A | Repository B | Recommendation / Impact |
|---|---|---|---|
| Architecture Pattern | Layered MVC | Event-Driven Microservice | Repo B scales better for async workloads |
| API Contracts | REST + OpenAPI | GraphQL + gRPC | High performance in Repo B, simpler debug in Repo A |
| Test Coverage | 85% Pytest | 40% Unittest | Adopt Repo A's testing harness |
```
