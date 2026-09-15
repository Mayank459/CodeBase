---
name: rag-evaluator
description: Guides the design, benchmark execution, and metric analysis for retrieval and generation systems (Hit Rate@K, MRR, Context Precision, Faithfulness, and Citation Grounding).
---

# RAG & Generative Output Evaluator

This skill guides the agent to benchmark, evaluate, and regression-test retrieval systems, search algorithms, and generative LLM workflows.

## When to Use
- When evaluating the retrieval accuracy of a search or RAG pipeline.
- When benchmarking different embedding models, chunking strategies, or rerankers.
- When measuring LLM hallucination rate, factual faithfulness, and citation validity.

## Core Metrics & Formulas

### 1. Retrieval Metrics
* **Hit Rate @ K**:
  $$\text{Hit Rate@K} = \frac{\text{Number of queries where relevant document is in top-K}}{\text{Total queries}}$$
* **Mean Reciprocal Rank (MRR @ K)**:
  $$\text{MRR} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}$$
  Where $\text{rank}_i$ is the position of the *first* relevant chunk for query $i$.
* **Context Precision & Recall**:
  - **Precision**: Proportion of retrieved chunks that are actually relevant to the query.
  - **Recall**: Proportion of all known ground-truth chunks that were successfully retrieved.

### 2. Generative Output Metrics
* **Faithfulness / Groundedness**:
  Measures whether the claims in the generated response can be directly inferred from the retrieved context. High faithfulness = zero hallucinations.
* **Citation Grounding Score**:
  $$\text{Citation Score} = \frac{\text{Valid verified citations}}{\text{Total cited references}}$$
* **Answer Relevancy**:
  Semantic alignment between the user's initial question and the generated answer, penalizing superfluous or evasive content.

## Evaluation Workflow

1. **Curate Benchmark Dataset (`dataset.json`)**:
   - Create 10–50 representative query scenarios.
   - For each query, specify expected ground-truth files, expected symbol identifiers, and reference answer facts.
2. **Execute Retrieval & Generation**:
   - Run candidate queries through the pipeline.
   - Record retrieved context IDs, latency, and generated text.
3. **Compute Metric Scores**:
   - Compute Hit Rate@1, Hit Rate@3, and MRR.
   - Score faithfulness and citation grounding.
4. **Generate Evaluation Report**:
   - Output structured JSON summary and human-readable markdown table.
   - Establish minimum regression thresholds (e.g. Hit Rate@3 $\ge 85\%$) in CI/CD.
