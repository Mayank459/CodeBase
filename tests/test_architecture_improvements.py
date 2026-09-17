"""Unit tests for the Architecture Review & Improvement Plan implementations."""
import unittest
import networkx as nx

from app.graph.graph_types import EdgeType, NodeType
from app.graph.builder import RepositoryGraphBuilder
from app.graph.symbol_table import SymbolTable
from app.retrieval.context_expander import GraphContextExpander
from app.retrieval.sparse_search import BM25Retriever
from app.retrieval.ranking import ResultRanker
from app.agents.router import classify_intents
from app.pr_generator.diff_generator import DiffGenerator
from app.storage.db import db_manager, SessionFactory, RepositoryModel, IndexingJobModel
from app.indexing.job_manager import BackgroundJobManager
from app.parsers.models.parsed_file import ParsedFile
from app.parsers.models.parsed_function import ParsedFunction
from app.parsers.models.parsed_class import ParsedClass
from app.parsers.models.parsed_call import ParsedCall


class TestArchitectureImprovements(unittest.TestCase):

    def test_multidigraph_and_edge_types(self):
        """Test MultiDiGraph construction with typed edges and inheritance."""
        symbol_table = SymbolTable()
        symbol_table.register_function("verify_jwt", "auth.py::verify_jwt")
        symbol_table.register_class("BaseAuth", "auth.py::BaseAuth")

        builder = RepositoryGraphBuilder(symbol_table)

        # File 1: defines verify_jwt
        f1 = ParsedFile(file_path="auth.py", source_code="")
        f1.functions.append(ParsedFunction(name="verify_jwt", start_line=1, end_line=10, code="def verify_jwt(): pass"))
        f1.classes.append(ParsedClass(name="BaseAuth", start_line=12, end_line=20, code="class BaseAuth: pass"))
        builder.add_parsed_file(f1)

        # File 2: calls verify_jwt and inherits BaseAuth
        f2 = ParsedFile(file_path="login.py", source_code="")
        fn_login = ParsedFunction(name="handle_login", start_line=1, end_line=15, code="def handle_login(): verify_jwt()")
        fn_login.calls.append(ParsedCall(name="verify_jwt"))
        f2.functions.append(fn_login)

        cls_login = ParsedClass(name="OAuthLogin", start_line=16, end_line=30, code="class OAuthLogin(BaseAuth): pass", bases=["BaseAuth"])
        f2.classes.append(cls_login)
        builder.add_parsed_file(f2)

        graph = builder.get_graph()
        self.assertIsInstance(graph, nx.MultiDiGraph)

        # Check nodes
        self.assertIn("auth.py::verify_jwt", graph)
        self.assertIn("login.py::handle_login", graph)
        self.assertIn("login.py::OAuthLogin", graph)

        # Check call edge from handle_login -> verify_jwt
        edge_data = graph.get_edge_data("login.py::handle_login", "auth.py::verify_jwt")
        self.assertIsNotNone(edge_data)
        relations = [attrs.get("relation") for attrs in edge_data.values()]
        self.assertIn(EdgeType.CALLS.value, relations)

        # Check inheritance edge OAuthLogin -> BaseAuth
        edge_data_inherit = graph.get_edge_data("login.py::OAuthLogin", "auth.py::BaseAuth")
        self.assertIsNotNone(edge_data_inherit)
        inherit_relations = [attrs.get("relation") for attrs in edge_data_inherit.values()]
        self.assertIn(EdgeType.INHERITS.value, inherit_relations)

    def test_bidirectional_bfs_expansion(self):
        """Test GraphContextExpander traverses incoming callers and outgoing callees."""
        g = nx.MultiDiGraph()
        # Edge: handle_login -> verify_jwt
        g.add_node("auth.py::verify_jwt", type="function", name="verify_jwt")
        g.add_node("login.py::handle_login", type="function", name="handle_login")
        g.add_node("crypto.py::sha256", type="function", name="sha256")

        g.add_edge("login.py::handle_login", "auth.py::verify_jwt", relation="calls")
        g.add_edge("auth.py::verify_jwt", "crypto.py::sha256", relation="calls")

        expander = GraphContextExpander(g)

        # Starting at verify_jwt, expand bidirectionally
        # Should find caller 'handle_login' and callee 'sha256'
        expanded = expander.expand("auth.py::verify_jwt", depth=1)
        expanded_nodes = [item["node"] for item in expanded]

        self.assertIn("auth.py::verify_jwt", expanded_nodes)
        self.assertIn("login.py::handle_login", expanded_nodes)  # Incoming caller!
        self.assertIn("crypto.py::sha256", expanded_nodes)       # Outgoing callee!

        # Check relationship tags
        caller_entry = next(i for i in expanded if i["node"] == "login.py::handle_login")
        self.assertEqual(caller_entry["relationship"], "caller")

        callee_entry = next(i for i in expanded if i["node"] == "crypto.py::sha256")
        self.assertEqual(callee_entry["relationship"], "callee")

    def test_bm25_and_rrf_ranking(self):
        """Test BM25 symbol retriever and Reciprocal Rank Fusion."""
        bm25 = BM25Retriever()
        bm25.add_document(
            doc_id="1",
            graph_node_id="auth.py::verify_jwt",
            name="verify_jwt",
            file_path="auth.py",
            content="def verify_jwt(token):\n    decode_jwt(token)",
            repository_name="my_repo"
        )
        bm25.add_document(
            doc_id="2",
            graph_node_id="login.py::handle_login",
            name="handle_login",
            file_path="login.py",
            content="def handle_login(request):\n    user = auth()",
            repository_name="my_repo"
        )

        results = bm25.search("verify_jwt", top_k=2, repository_name="my_repo")
        self.assertTrue(len(results) > 0)
        self.assertEqual(results[0].payload["name"], "verify_jwt")

        # Test RRF fusion
        ranker = ResultRanker(rrf_k=60)
        fused = ranker.reciprocal_rank_fusion(dense_results=[], sparse_results=results, top_k=5)
        self.assertTrue(len(fused) > 0)
        self.assertEqual(fused[0].name, "verify_jwt")

    def test_structured_agent_router(self):
        """Test structured multi-intent router extracts secondary intents and flags."""
        decision1 = classify_intents("How does authentication flow work and can you find security vulnerabilities?")
        self.assertIn("architecture", decision1["intent"] if decision1["intent"] == "architecture" else decision1["secondary_intents"])
        self.assertIn("security", decision1["intent"] if decision1["intent"] == "security" else decision1["secondary_intents"])
        self.assertTrue(decision1["requires_retrieval"])
        self.assertFalse(decision1["requires_write_access"])

        decision2 = classify_intents("Please create a pull request to fix security issues")
        self.assertEqual(decision2["intent"], "pr")
        self.assertTrue(decision2["requires_write_access"])

    def test_patch_validation_and_safety(self):
        """Test DiffGenerator validates syntax and catches path traversal."""
        diff_gen = DiffGenerator()

        class DummyPatch:
            def __init__(self, file_path, original_code, replacement_code):
                self.file_path = file_path
                self.original_code = original_code
                self.replacement_code = replacement_code

        # Valid python patch
        valid_patch = DummyPatch("auth.py", "x = 1", "x = 2")
        is_valid, err = diff_gen.validate_patch(valid_patch)
        self.assertTrue(is_valid)
        self.assertIsNone(err)

        # Invalid syntax patch
        invalid_syntax = DummyPatch("auth.py", "x = 1", "def foo(:: broken syntax")
        is_valid, err = diff_gen.validate_patch(invalid_syntax)
        self.assertFalse(is_valid)
        self.assertIn("syntax error", err.lower())

        # Path traversal attempt
        traversal_patch = DummyPatch("../../etc/passwd", "root:x", "root:pwned")
        is_valid, err = diff_gen.validate_patch(traversal_patch)
        self.assertFalse(is_valid)
        self.assertIn("traversal", err.lower())

    def test_job_manager_lifecycle(self):
        """Test BackgroundJobManager creates jobs and handles cancellation."""
        jm = BackgroundJobManager()
        job_id = jm.create_job("https://github.com/example/testrepo.git")
        status = jm.get_job_status(job_id)

        self.assertIsNotNone(status)
        self.assertEqual(status["status"], "queued")

        # Test cancellation
        success = jm.cancel_job(job_id)
        self.assertTrue(success)
        self.assertTrue(jm.is_cancelled(job_id))

        status_after = jm.get_job_status(job_id)
        self.assertEqual(status_after["status"], "cancelled")


if __name__ == "__main__":
    unittest.main()
