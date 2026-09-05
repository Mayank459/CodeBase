"""
Codebase RAG Assistant — Streamlit Frontend
"""
import streamlit as st
import requests
import json
import os
from dotenv import load_dotenv

# Force load the .env file so Streamlit actually sees API_BASE
load_dotenv()

# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="Codebase RAG Assistant",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------------------------
# API base URL
# ---------------------------------------------------------------------------
# Try to get API_BASE from Streamlit secrets (if deployed on Streamlit Cloud),
# fall back to an environment variable, and finally fall back to localhost.
try:
    API_BASE = st.secrets["API_BASE"]
except (FileNotFoundError, KeyError):
    API_BASE = os.getenv("API_BASE", "http://localhost:8000")

# ---------------------------------------------------------------------------
# Custom CSS
# ---------------------------------------------------------------------------
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif;
    }

    /* Dark sidebar */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, #0f0f23 0%, #1a1a3e 100%);
    }
    [data-testid="stSidebar"] * {
        color: #e2e8f0 !important;
    }

    /* Main area */
    .stApp {
        background: #0d1117;
        color: #c9d1d9;
    }

    /* Header banner */
    .hero-banner {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
        border-radius: 16px;
        padding: 2rem 2.5rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4);
    }
    .hero-banner h1 {
        color: white !important;
        font-size: 2rem;
        font-weight: 700;
        margin: 0 0 0.25rem 0;
    }
    .hero-banner p {
        color: rgba(255,255,255,0.85) !important;
        margin: 0;
        font-size: 1rem;
    }

    /* Cards */
    .metric-card {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 12px;
        padding: 1.25rem;
        text-align: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .metric-card .metric-value {
        font-size: 2rem;
        font-weight: 700;
        color: #79c0ff;
    }
    .metric-card .metric-label {
        font-size: 0.8rem;
        color: #8b949e;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    /* Chat messages */
    .chat-user {
        background: linear-gradient(135deg, #1f4068, #1b262c);
        border-left: 3px solid #79c0ff;
        border-radius: 0 12px 12px 12px;
        padding: 1rem 1.25rem;
        margin: 0.75rem 0;
    }
    .chat-assistant {
        background: linear-gradient(135deg, #1e2033, #2d2c3e);
        border-left: 3px solid #b48eff;
        border-radius: 0 12px 12px 12px;
        padding: 1rem 1.25rem;
        margin: 0.75rem 0;
    }
    .chat-role {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin-bottom: 0.4rem;
    }

    /* Tabs spacing */
    .stTabs [data-baseweb="tab-list"] {
        gap: 1.5rem;
    }
    .stTabs [data-baseweb="tab"] {
        padding-left: 0.5rem !important;
        padding-right: 0.5rem !important;
    }

    /* Input area */
    .stTextInput > div > div > input,
    .stTextArea > div > div > textarea {
        background: #161b22 !important;
        border: 1px solid #30363d !important;
        border-radius: 10px !important;
        color: #c9d1d9 !important;
    }

    /* Buttons */
    .stButton > button {
        background: linear-gradient(135deg, #667eea, #764ba2) !important;
        color: white !important;
        border: none !important;
        border-radius: 8px !important;
        font-weight: 600 !important;
        transition: all 0.2s ease !important;
    }
    .stButton > button:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.5) !important;
    }

    /* Success / error badges */
    .status-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
    }
    .badge-success { background: rgba(56,161,105,0.2); color: #68d391; border: 1px solid #38a169; }
    .badge-error   { background: rgba(229,62,62,0.2);  color: #fc8181; border: 1px solid #e53e3e; }
    .badge-info    { background: rgba(102,126,234,0.2); color: #90cdf4; border: 1px solid #667eea; }

    /* Code blocks */
    .stMarkdown pre {
        background: #161b22 !important;
        border: 1px solid #30363d !important;
        border-radius: 10px !important;
    }

    /* Divider */
    hr { border-color: #30363d !important; }

    /* Tab styling */
    .stTabs [data-baseweb="tab-list"] {
        background: #161b22;
        border-radius: 10px;
        padding: 4px;
        gap: 4px;
    }
    .stTabs [data-baseweb="tab"] {
        border-radius: 8px;
        color: #8b949e;
        font-weight: 500;
    }
    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #667eea, #764ba2) !important;
        color: white !important;
    }
</style>
""", unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []
if "indexed_repo" not in st.session_state:
    st.session_state.indexed_repo = None
if "index_stats" not in st.session_state:
    st.session_state.index_stats = {}
if "thread_id" not in st.session_state:
    st.session_state.thread_id = "default"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def api_post(endpoint: str, payload: dict) -> dict:
    try:
        resp = requests.post(f"{API_BASE}{endpoint}", json=payload, timeout=120)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.ConnectionError:
        return {"error": "⚠️ Cannot connect to the API. Make sure `uvicorn main:app --reload --reload-dir app` is running."}
    except requests.exceptions.Timeout:
        return {"error": "⚠️ Request timed out. The operation may still be running."}
    except Exception as e:
        return {"error": str(e)}


def api_stream_index(repo_url: str):
    """Generator: yields progress event dicts from the /repository/index-stream SSE endpoint."""
    try:
        with requests.post(
            f"{API_BASE}/repository/index-stream",
            json={"repo_url": repo_url},
            stream=True,
            timeout=600,
        ) as resp:
            resp.raise_for_status()
            for raw_line in resp.iter_lines():
                if raw_line and raw_line.startswith(b"data: "):
                    try:
                        yield json.loads(raw_line[6:])
                    except Exception:
                        pass
    except requests.exceptions.ConnectionError:
        yield {"step": "error", "message": "⚠️ Cannot connect to the API."}
    except Exception as exc:
        yield {"step": "error", "message": str(exc)}


def render_chat_bubble(role: str, content: str):
    css_class = "chat-user" if role == "user" else "chat-assistant"
    role_color = "#79c0ff" if role == "user" else "#b48eff"
    icon = "👤" if role == "user" else "🤖"
    st.markdown(
        f"""<div class="{css_class}">
            <div class="chat-role" style="color:{role_color};">{icon} {role.upper()}</div>
            <div>{content}</div>
        </div>""",
        unsafe_allow_html=True
    )


# ---------------------------------------------------------------------------
# Sidebar
# ---------------------------------------------------------------------------
with st.sidebar:
    st.markdown("## 🧠 Codebase RAG")
    st.markdown("---")

    # API connection status
    try:
        _health = requests.get(f"{API_BASE}/", timeout=5)
        _connected = _health.status_code == 200
    except Exception:
        _connected = False
    if _connected:
        st.markdown('<span class="status-badge badge-success">🟢 API connected</span>',
                    unsafe_allow_html=True)
    else:
        st.markdown(f'<span class="status-badge badge-error">🔴 API offline — is `uvicorn` running at {API_BASE}?</span>',
                    unsafe_allow_html=True)
    st.markdown("<br>", unsafe_allow_html=True)

    st.markdown("### 📦 Index Repository")

    repo_url = st.text_input(
        "GitHub URL or local path",
        placeholder="https://github.com/user/repo",
        key="repo_url_input"
    )

    if st.button("🚀 Index Repository", use_container_width=True):
        if not repo_url.strip():
            st.warning("Please enter a repository URL.")
        else:
            result = None
            errored = False

            terminal_placeholder = st.empty()
            terminal_logs = []

            def render_terminal():
                log_text = "\n".join(terminal_logs)
                terminal_placeholder.markdown(f"```shell\n{log_text}\n```")

            for event in api_stream_index(repo_url.strip()):
                step = event.get("step", "")
                msg  = event.get("message", "")

                if step == "done":
                    result = event
                    # Add a nice footer
                    terminal_logs.append(f"[indexer] ✅ Indexing complete in {event.get('index_time_seconds', '?')}s")
                    render_terminal()
                elif step == "error":
                    errored = True
                    terminal_logs.append(f"[indexer] ❌ ERROR: {msg}")
                    render_terminal()
                    st.error("Indexing failed. Check logs above.")
                    break
                else:
                    # Print the exact message from the backend, prefixing it to match original console look
                    terminal_logs.append(f"[indexer] {msg}")
                    render_terminal()

            if result and not errored:
                st.session_state.indexed_repo = result.get("repository", repo_url)
                st.session_state.index_stats  = result
                st.session_state.chat_history = []
                st.rerun()

    if st.session_state.index_stats:
        stats = st.session_state.index_stats
        st.markdown("---")
        st.markdown("#### 📊 Index Stats")
        cols = st.columns(2)
        with cols[0]:
            st.markdown(
                f'<div class="metric-card"><div class="metric-value">{stats.get("files_parsed", "—")}</div>'
                f'<div class="metric-label">Files</div></div>',
                unsafe_allow_html=True
            )
        with cols[1]:
            st.markdown(
                f'<div class="metric-card"><div class="metric-value">{stats.get("entities", "—")}</div>'
                f'<div class="metric-label">Entities</div></div>',
                unsafe_allow_html=True
            )
        cols2 = st.columns(2)
        with cols2[0]:
            st.markdown(
                f'<div class="metric-card"><div class="metric-value">{stats.get("graph_nodes", "—")}</div>'
                f'<div class="metric-label">Graph Nodes</div></div>',
                unsafe_allow_html=True
            )
        with cols2[1]:
            st.markdown(
                f'<div class="metric-card"><div class="metric-value">{stats.get("graph_edges", "—")}</div>'
                f'<div class="metric-label">Graph Edges</div></div>',
                unsafe_allow_html=True
            )
        if stats.get("index_time_seconds"):
            st.markdown(
                f'<div class="metric-card" style="margin-top:0.5rem">'
                f'<div class="metric-value" style="font-size:1.3rem">⏱️ {stats["index_time_seconds"]}s</div>'
                f'<div class="metric-label">Index Time</div></div>',
                unsafe_allow_html=True
            )

    st.markdown("---")
    st.markdown(
        "<div style='color:#8b949e;font-size:0.75rem;'>Codebase RAG Assistant<br/>Powered by Gemini + LangGraph</div>",
        unsafe_allow_html=True
    )


# ---------------------------------------------------------------------------
# Main content
# ---------------------------------------------------------------------------
st.markdown("""
<div class="hero-banner">
    <h1>🧠 Codebase RAG Assistant</h1>
    <p>AI-powered repository understanding. Ask anything about your codebase.</p>
</div>
""", unsafe_allow_html=True)

# Show active repo badge
if st.session_state.indexed_repo:
    st.markdown(
        f'<span class="status-badge badge-success">✅ Active repo: {st.session_state.indexed_repo}</span>',
        unsafe_allow_html=True
    )
else:
    st.markdown(
        '<span class="status-badge badge-info">ℹ️ Index a repository using the sidebar to begin</span>',
        unsafe_allow_html=True
    )

st.markdown("<br>", unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Tabs
# ---------------------------------------------------------------------------
tab_chat, tab_architecture, tab_security, tab_dead_code, tab_docs, tab_uml, tab_compare, tab_evolution, tab_pr = st.tabs([
    "💬 Chat",
    "🏗️ Architecture",
    "🔒 Security",
    "🗑️ Dead Code",
    "📄 Documentation",
    "📐 UML",
    "🔁 Compare",
    "📈 Evolution",
    "🚀 PR Creation",
])


# ── Chat tab ─────────────────────────────────────────────────────────────────
with tab_chat:
    st.markdown("### 💬 Chat with Your Repository")
    st.caption("Ask anything about your codebase in natural language.")

    # Render history
    for msg in st.session_state.chat_history:
        render_chat_bubble(msg["role"], msg["content"])

    with st.form("chat_form", clear_on_submit=True):
        user_input = st.text_area(
            "Your question",
            placeholder="e.g. Where is authentication implemented? / What happens when a user logs in?",
            height=80,
            label_visibility="collapsed"
        )
        col1, col2 = st.columns([5, 1])
        with col2:
            submitted = st.form_submit_button("Send ➤", use_container_width=True)

    if submitted and user_input.strip():
        if not st.session_state.indexed_repo:
            st.warning("Please index a repository first.")
        else:
            st.session_state.chat_history.append({"role": "user", "content": user_input})

            with st.spinner("Thinking…"):
                result = api_post("/agent/chat", {
                    "repository_name": st.session_state.indexed_repo,
                    "question": user_input,
                    "history": st.session_state.chat_history[:-1]  # prior turns (exclude current)
                })

            answer = result.get("answer") or result.get("error", "No response.")
            st.session_state.chat_history.append({"role": "assistant", "content": answer})
            st.rerun()

    if st.session_state.chat_history:
        if st.button("🗑️ Clear conversation"):
            st.session_state.chat_history = []
            st.rerun()


# ── Architecture tab ──────────────────────────────────────────────────────────
with tab_architecture:
    st.markdown("### 🏗️ Architecture Analysis")
    st.caption("Generate a structural breakdown of the repository architecture.")

    if st.button("🔍 Analyze Architecture", use_container_width=False):
        if not st.session_state.indexed_repo:
            st.warning("Index a repository first.")
        else:
            with st.spinner("Analyzing architecture…"):
                result = api_post("/repository/architecture", {
                    "repository_name": st.session_state.indexed_repo
                })
            if "error" in result:
                st.error(result["error"])
            else:
                st.success("Analysis complete!")
                
                # Top metrics
                nodes = result.get("graph_nodes", 0)
                edges = result.get("graph_edges", 0)
                modules = result.get("modules", {})
                
                m1, m2, m3 = st.columns(3)
                m1.metric("Total Files", len(modules))
                m2.metric("Total Graph Nodes", nodes)
                m3.metric("Dependency Edges", edges)
                
                st.markdown("#### 📂 File Complexity Overview")
                st.caption("Files with the most classes, functions, and variables.")

                import pandas as pd
                if modules:
                    # Convert to dataframe
                    df_modules = pd.DataFrame.from_dict(modules, orient='index')
                    df_modules.index.name = "File Path"
                    # Add a total complexity column
                    df_modules["Total Complexity"] = df_modules["classes"] + df_modules["functions"] + df_modules["variables"]
                    df_modules = df_modules.sort_values("Total Complexity", ascending=False).head(20)
                    st.dataframe(df_modules, use_container_width=True)
                else:
                    st.info("No module data returned. The repository may have no Python source files.")

                st.markdown("#### 🕸️ Top Connected Components")
                st.caption("The most depended-on components in the codebase (highest degree centrality).")

                top_nodes = result.get("top_nodes", [])
                if top_nodes:
                    df_nodes = pd.DataFrame(top_nodes, columns=["Component", "Connections"])
                    df_nodes = df_nodes.set_index("Component")
                    st.bar_chart(df_nodes)
                else:
                    st.info("No connected components data available.")


# ── Security tab ──────────────────────────────────────────────────────────────
with tab_security:
    st.markdown("### 🔒 Security Audit")
    st.caption("Scan the codebase for hardcoded secrets, SQL injections, weak patterns, and more.")

    col1, col2 = st.columns(2)
    with col1:
        if st.button("🔎 Run Security Scan", use_container_width=True):
            if not st.session_state.indexed_repo:
                st.warning("Index a repository first.")
            else:
                with st.spinner("Scanning for vulnerabilities…"):
                    result = api_post("/agent/chat", {
                        "repository_name": st.session_state.indexed_repo,
                        "question": "security audit"
                    })
                if "error" in result:
                    st.error(result["error"])
                else:
                    st.markdown(result.get("answer") or "No response.")
    with col2:
        if st.button("🛠️ Suggest Security Fixes", use_container_width=True):
            if not st.session_state.indexed_repo:
                st.warning("Index a repository first.")
            else:
                with st.spinner("Generating remediation suggestions…"):
                    result = api_post("/agent/chat", {
                        "repository_name": st.session_state.indexed_repo,
                        "question": "fix security vulnerabilities and suggest remediation"
                    })
                if "error" in result:
                    st.error(result["error"])
                else:
                    st.markdown(result.get("answer") or "No response.")


# ── Dead Code tab ─────────────────────────────────────────────────────────────
with tab_dead_code:
    st.markdown("### 🗑️ Dead Code Detection")
    st.caption("Identify unused functions, classes, and methods in the repository.")

    if st.button("🔍 Find Dead Code", use_container_width=False):
        if not st.session_state.indexed_repo:
            st.warning("Index a repository first.")
        else:
            with st.spinner("Analyzing for dead code…"):
                result = api_post("/agent/chat", {
                    "repository_name": st.session_state.indexed_repo,
                    "question": "find dead code and unused functions"
                })
            if "error" in result:
                st.error(result["error"])
            else:
                st.markdown(result.get("answer") or "No response.")


# ── Documentation tab ─────────────────────────────────────────────────────────
with tab_docs:
    st.markdown("### 📄 Documentation Generator")
    st.caption("Auto-generate structured documentation for all classes and functions.")

    if st.button("📝 Generate Documentation", use_container_width=False):
        if not st.session_state.indexed_repo:
            st.warning("Index a repository first.")
        else:
            with st.spinner("Generating documentation…"):
                result = api_post("/agent/chat", {
                    "repository_name": st.session_state.indexed_repo,
                    "question": "generate documentation for this repository"
                })
            if "error" in result:
                st.error(result["error"])
            else:
                answer = result.get("answer") or "No response."
                st.markdown(answer)
                # Only show download button on successful generation
                st.download_button(
                    label="⬇️ Download as Markdown",
                    data=answer,
                    file_name=f"{st.session_state.indexed_repo}_docs.md",
                    mime="text/markdown"
                )


# ── UML tab ───────────────────────────────────────────────────────────────────
with tab_uml:
    st.markdown("### 📐 UML Diagram Generation")
    st.caption("Generate Mermaid / PlantUML class and dependency diagrams.")

    diagram_type = st.radio("Diagram type", ["Class Diagram", "Dependency Diagram", "Architecture Diagram"], horizontal=True)

    if st.button("🎨 Generate Diagram", use_container_width=False):
        if not st.session_state.indexed_repo:
            st.warning("Index a repository first.")
        else:
            query = f"generate {diagram_type.lower()} uml"
            with st.spinner(f"Generating {diagram_type}…"):
                result = api_post("/agent/chat", {
                    "repository_name": st.session_state.indexed_repo,
                    "question": query
                })
            if "error" in result:
                st.error(result["error"])
            else:
                st.markdown(result.get("answer") or "No response.")


# ── Compare tab ───────────────────────────────────────────────────────────────
with tab_compare:
    st.markdown("### 🔁 Multi-Repository Comparison")
    st.caption("Compare architecture and implementations across multiple indexed repositories.")

    st.info("Both repositories must be indexed before comparing.")

    repos_input = st.text_area(
        "Repository names to compare (one per line)",
        placeholder="repo-a\nrepo-b",
        height=100
    )

    if st.button("🔁 Compare Repositories"):
        repos = [r.strip() for r in repos_input.strip().splitlines() if r.strip()]
        if len(repos) < 2:
            st.warning("Please enter at least 2 repository names.")
        else:
            with st.spinner("Comparing repositories…"):
                result = api_post("/agent/compare", {"repositories": repos})
            if "error" in result:
                st.error(result["error"])
            else:
                st.markdown(result.get("answer") or "No response.")


# ── Evolution tab ─────────────────────────────────────────────────────────────
with tab_evolution:
    st.markdown("### 📈 Repository Evolution")
    st.caption("Analyze how a repository changed between two indexed versions.")

    st.info("Both repository versions must be indexed before comparing their evolution.")

    old_repo = st.text_input(
        "Old version (repository name)",
        placeholder="my-repo@v1",
        key="evo_old_repo"
    )
    new_repo = st.text_input(
        "New version (repository name)",
        placeholder="my-repo@v2",
        key="evo_new_repo"
    )

    if st.button("📈 Analyze Evolution", use_container_width=False):
        if not old_repo.strip() or not new_repo.strip():
            st.warning("Please enter both the old and new repository names.")
        else:
            with st.spinner("Analyzing repository evolution…"):
                result = api_post("/agent/evolution", {
                    "old_repository": old_repo.strip(),
                    "new_repository": new_repo.strip()
                })
            if "error" in result:
                st.error(result["error"])
            else:
                st.markdown(result.get("answer") or "No response.")


# ── PR Creation tab ───────────────────────────────────────────────────────────
with tab_pr:
    st.markdown("### 🚀 Pull Request Creation")
    st.caption("Detect security issues and generate a pull request with fixes.")

    # Track the pending approval across reruns
    if "pr_pending" not in st.session_state:
        st.session_state.pr_pending = None

    if st.button("🚀 Generate Pull Request", use_container_width=False):
        if not st.session_state.indexed_repo:
            st.warning("Index a repository first.")
        else:
            st.session_state.pr_pending = None
            with st.spinner("Detecting issues and preparing PR…"):
                result = api_post("/agent/chat", {
                    "repository_name": st.session_state.indexed_repo,
                    "question": "create a pull request to fix security vulnerabilities",
                    "thread_id": st.session_state.thread_id,
                })
            if "error" in result:
                st.error(result["error"])
            elif result.get("approval_needed"):
                st.session_state.pr_pending = result
                st.rerun()
            else:
                st.markdown(result.get("answer") or "No response.")

    # Surface a pending Human-in-the-Loop approval request
    if st.session_state.pr_pending:
        pending = st.session_state.pr_pending
        approval = pending.get("approval_request", {})
        findings = approval.get("findings", [])

        st.warning("🛑 **Approval required** — found security issues to fix in the PR.")
        if findings:
            st.markdown("**Issues detected:**")
            for f in findings:
                st.markdown(f"- 🟡 `{f.get('file', '?')}` — {f.get('type', '')}")
        else:
            st.markdown("No specific findings listed.")

        col_yes, col_no = st.columns(2)
        with col_yes:
            if st.button("✅ Approve & Generate PR", use_container_width=True):
                with st.spinner("Generating pull request…"):
                    result = api_post("/agent/approve", {
                        "request_id": pending.get("request_id"),
                        "approved": True,
                    })
                st.session_state.pr_pending = None
                if "error" in result:
                    st.error(result["error"])
                else:
                    st.markdown(result.get("answer") or "No response.")
        with col_no:
            if st.button("❌ Reject", use_container_width=True):
                with st.spinner("Rejecting…"):
                    result = api_post("/agent/approve", {
                        "request_id": pending.get("request_id"),
                        "approved": False,
                    })
                st.session_state.pr_pending = None
                if "error" in result:
                    st.error(result["error"])
                else:
                    st.info(result.get("answer") or "PR generation rejected.")
