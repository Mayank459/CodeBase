"""Retrieval ranking module."""

class ResultRanker:
    def rank(self, query: str, results: list) -> list:
        # A simple lexical overlap booster for semantic search results
        query_terms = set(query.lower().split())
        
        ranked_results = []
        for result in results:
            score = 0
            if hasattr(result, 'name') and result.name:
                name_terms = set(result.name.lower().split('_'))
                overlap = len(query_terms.intersection(name_terms))
                score += overlap * 2.0  # Boost for direct name match
                
            ranked_results.append((score, result))
            
        # Sort by boosted score (descending), preserving original order if scores tie
        ranked_results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in ranked_results]
