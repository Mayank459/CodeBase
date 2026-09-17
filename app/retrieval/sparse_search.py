"""BM25 and exact symbol sparse retrieval module for code entities."""
import re
import math
from collections import defaultdict, Counter
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field


def tokenize_code(text: str) -> List[str]:
    """Tokenize code identifiers, camelCase, snake_case, and standard text terms."""
    if not text:
        return []
    # Split camelCase: 'verifyJwtToken' -> 'verify', 'Jwt', 'Token'
    s1 = re.sub(r'([a-z0-9])([A-Z])', r'\1 \2', text)
    # Extract alpha-numeric tokens
    raw_tokens = re.findall(r'[a-zA-Z0-9_\.]+', s1.lower())
    tokens = []
    for tok in raw_tokens:
        tokens.append(tok)
        if "_" in tok:
            tokens.extend([part for part in tok.split("_") if part])
        if "." in tok:
            tokens.extend([part for part in tok.split(".") if part])
    return [t for t in tokens if len(t) > 1]


@dataclass
class SparseDocument:
    id: str
    graph_node_id: str
    name: str
    file_path: str
    content: str
    repository_name: str
    entity_type: str = "symbol"
    tokens: List[str] = field(default_factory=list)


@dataclass
class ScoredSparseResult:
    id: str
    score: float
    payload: Dict[str, Any]


class BM25Retriever:
    """
    In-memory BM25 index for repository code entities and exact symbols.
    Provides fast, deterministic symbol and token-based code search.
    """

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.documents: Dict[str, SparseDocument] = {}
        self.inverted_index: Dict[str, List[str]] = defaultdict(list)
        self.doc_term_freqs: Dict[str, Counter] = {}
        self.doc_lengths: Dict[str, int] = {}
        self.avg_doc_length: float = 0.0
        self.repo_doc_ids: Dict[str, List[str]] = defaultdict(list)

    def add_document(
        self,
        doc_id: str,
        graph_node_id: str,
        name: str,
        file_path: str,
        content: str,
        repository_name: str,
        entity_type: str = "symbol"
    ):
        """Add a single entity document to the BM25 index."""
        # Index name with higher weight by repeating tokens
        name_tokens = tokenize_code(name) * 3
        path_tokens = tokenize_code(file_path) * 2
        content_tokens = tokenize_code(content[:4000])  # limit very large files
        all_tokens = name_tokens + path_tokens + content_tokens

        doc = SparseDocument(
            id=doc_id,
            graph_node_id=graph_node_id,
            name=name,
            file_path=file_path,
            content=content,
            repository_name=repository_name,
            entity_type=entity_type,
            tokens=all_tokens
        )
        self.documents[doc_id] = doc
        self.repo_doc_ids[repository_name.lower()].append(doc_id)

        term_counts = Counter(all_tokens)
        self.doc_term_freqs[doc_id] = term_counts
        self.doc_lengths[doc_id] = len(all_tokens)

        for term in term_counts.keys():
            self.inverted_index[term].append(doc_id)

        total_length = sum(self.doc_lengths.values())
        self.avg_doc_length = total_length / len(self.documents) if self.documents else 0.0

    def index_entities(self, repository_name: str, entities: List[Any]):
        """Index a batch of extracted entities for a repository."""
        # Clean existing repository entries if re-indexing
        repo_key = repository_name.lower()
        if repo_key in self.repo_doc_ids:
            for old_id in self.repo_doc_ids[repo_key]:
                self.documents.pop(old_id, None)
                self.doc_term_freqs.pop(old_id, None)
                self.doc_lengths.pop(old_id, None)
            self.repo_doc_ids[repo_key] = []
            # Rebuild inverted index
            self.inverted_index = defaultdict(list)
            for d_id, tf in self.doc_term_freqs.items():
                for term in tf.keys():
                    self.inverted_index[term].append(d_id)

        for entity in entities:
            doc_id = str(getattr(entity, "id", f"{getattr(entity, 'file_path', '')}::{getattr(entity, 'name', '')}"))
            self.add_document(
                doc_id=doc_id,
                graph_node_id=getattr(entity, "graph_node_id", doc_id),
                name=getattr(entity, "name", ""),
                file_path=getattr(entity, "file_path", ""),
                content=getattr(entity, "content", "") or getattr(entity, "code", ""),
                repository_name=repository_name,
                entity_type=getattr(entity, "entity_type", "symbol")
            )

    def search(
        self,
        query: str,
        top_k: int = 10,
        repository_name: Optional[str] = None
    ) -> List[ScoredSparseResult]:
        """Search BM25 index with query tokens and exact symbol boost."""
        if not self.documents:
            return []

        query_tokens = tokenize_code(query)
        if not query_tokens:
            return []

        N = len(self.documents)
        scores: Dict[str, float] = defaultdict(float)

        target_doc_ids = None
        if repository_name:
            target_doc_ids = set(self.repo_doc_ids.get(repository_name.lower(), []))
            if not target_doc_ids:
                return []

        for term in query_tokens:
            matching_doc_ids = self.inverted_index.get(term, [])
            if not matching_doc_ids:
                continue

            n_q = len(matching_doc_ids)
            idf = math.log(1.0 + (N - n_q + 0.5) / (n_q + 0.5))

            for doc_id in matching_doc_ids:
                if target_doc_ids is not None and doc_id not in target_doc_ids:
                    continue

                tf = self.doc_term_freqs[doc_id].get(term, 0)
                doc_len = self.doc_lengths.get(doc_id, 1)
                denom = tf + self.k1 * (1.0 - self.b + self.b * (doc_len / (self.avg_doc_length or 1.0)))
                score = idf * ((tf * (self.k1 + 1.0)) / denom)
                scores[doc_id] += score

        # Exact match boosting for name or file_path matches
        normalized_query_terms = set(query.lower().split())
        for doc_id in list(scores.keys()):
            doc = self.documents[doc_id]
            if doc.name.lower() in normalized_query_terms:
                scores[doc_id] += 10.0
            if any(term in doc.name.lower() for term in normalized_query_terms):
                scores[doc_id] += 3.0

        sorted_docs = sorted(scores.items(), key=lambda item: item[1], reverse=True)[:top_k]

        results = []
        for doc_id, score in sorted_docs:
            doc = self.documents[doc_id]
            results.append(
                ScoredSparseResult(
                    id=doc.id,
                    score=round(score, 4),
                    payload={
                        "repository_name": doc.repository_name,
                        "graph_node_id": doc.graph_node_id,
                        "name": doc.name,
                        "file_path": doc.file_path,
                        "content": doc.content,
                        "entity_type": doc.entity_type
                    }
                )
            )

        return results


# Global singleton BM25 retriever
bm25_retriever = BM25Retriever()
