"""Unified LLM Provider module supporting Model Routing, TTFT telemetry, and automatic fallback."""
from dotenv import load_dotenv
import os
import time
from typing import Protocol, runtime_checkable, Generator, Optional, Dict, Any
import httpx

from app.observability.metrics import metrics

load_dotenv()


@runtime_checkable
class LLMProviderProtocol(Protocol):
    """Common LLM provider interface for benchmarking and model routing."""

    def generate(
        self,
        prompt: str,
        *,
        task_type: str = "general",
        temperature: float = 0.7,
        max_tokens: int = 8192
    ) -> str:
        ...

    def generate_stream(
        self,
        prompt: str,
        *,
        task_type: str = "general",
        temperature: float = 0.7,
        max_tokens: int = 8192
    ) -> Generator[str, None, None]:
        ...


class LLMProvider:
    """
    Production-ready LLM provider supporting model routing (fast vs advanced models),
    resilient fallback (Groq -> Gemini), and stage-level TTFT & throughput telemetry.
    """

    # Model catalog
    FAST_MODEL_GROQ = os.getenv("GROQ_FAST_MODEL", "qwen/qwen3.8-27b")
    ADVANCED_MODEL_GROQ = os.getenv("GROQ_ADVANCED_MODEL", "qwen/qwen3.8-27b")

    FAST_MODEL_GEMINI = os.getenv("GEMINI_FAST_MODEL", "gemini-3.6-flash")
    ADVANCED_MODEL_GEMINI = os.getenv("GEMINI_ADVANCED_MODEL", "gemini-3.6-flash")

    def __init__(self):
        self.groq_api_key = (os.getenv("GROQ_API_KEY") or os.getenv("GROK_API_KEY") or "").strip()
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")

        # Initialize Gemini client for primary/fallback
        from google import genai
        from google.genai import types
        self.genai = genai
        self.types = types
        self.client = genai.Client(api_key=self.gemini_api_key)

        self.use_groq = bool(self.groq_api_key)
        self.use_grok = self.use_groq
        self.base_url = "https://api.groq.com/openai/v1"

    def _resolve_model(self, task_type: str = "general", provider: str = "groq") -> str:
        """Route model based on task complexity (fast vs advanced)."""
        is_advanced = task_type in ["security_fix", "patch_generation", "code_reasoning", "security_analysis"]

        if provider == "groq":
            default_model = os.getenv("GROQ_MODEL")
            if default_model:
                return default_model
            return self.ADVANCED_MODEL_GROQ if is_advanced else self.FAST_MODEL_GROQ
        else:
            resolved = self.ADVANCED_MODEL_GEMINI if is_advanced else self.FAST_MODEL_GEMINI
            if "gemini-2.5-flash" in resolved:
                resolved = "gemini-3.6-flash"
            return resolved

    def generate(
        self,
        prompt: str,
        *,
        task_type: str = "general",
        temperature: float = 0.7,
        max_tokens: int = 8192
    ) -> str:
        """Generate text with automatic model routing and provider fallback."""
        start_time = time.perf_counter()
        result = ""
        model_used = ""

        if self.use_groq:
            model_used = self._resolve_model(task_type, provider="groq")
            try:
                result = self._generate_groq(prompt, model=model_used, temperature=temperature, max_tokens=max_tokens)
            except Exception as e:
                print(f"[LLM] Groq failed: {e}. Falling back to Gemini...")
                model_used = self._resolve_model(task_type, provider="gemini")
                result = self._generate_gemini(prompt, model=model_used, max_tokens=max_tokens)
        else:
            model_used = self._resolve_model(task_type, provider="gemini")
            result = self._generate_gemini(prompt, model=model_used, max_tokens=max_tokens)

        elapsed = time.perf_counter() - start_time
        metrics.record_latency("llm_generation", elapsed)
        # Rough token estimation for metrics (4 chars ~ 1 token)
        est_tokens = max(1, len(result) // 4)
        if elapsed > 0:
            metrics.record_tokens_per_sec(model_used, est_tokens / elapsed)
        metrics.record_tokens(model_used, prompt_tokens=len(prompt) // 4, completion_tokens=est_tokens)

        return result

    def generate_stream(
        self,
        prompt: str,
        *,
        task_type: str = "general",
        temperature: float = 0.7,
        max_tokens: int = 8192
    ) -> Generator[str, None, None]:
        """Stream text tokens while tracking TTFT and tokens/sec telemetry."""
        start_time = time.perf_counter()
        first_token_received = False
        token_count = 0
        model_used = ""

        generator = None
        if self.use_groq:
            model_used = self._resolve_model(task_type, provider="groq")
            try:
                generator = self._generate_groq_stream(prompt, model=model_used, temperature=temperature, max_tokens=max_tokens)
                first_chunk = next(generator, None)
                if first_chunk is not None:
                    ttft = time.perf_counter() - start_time
                    metrics.record_ttft(model_used, ttft)
                    first_token_received = True
                    token_count += 1
                    yield first_chunk
            except Exception as e:
                print(f"[LLM] Groq streaming failed: {e}. Falling back to Gemini...")
                generator = None

        if generator is None:
            model_used = self._resolve_model(task_type, provider="gemini")
            generator = self._generate_gemini_stream(prompt, model=model_used, max_tokens=max_tokens)

        for chunk in generator:
            if not first_token_received:
                ttft = time.perf_counter() - start_time
                metrics.record_ttft(model_used, ttft)
                first_token_received = True
            token_count += 1
            yield chunk

        total_elapsed = time.perf_counter() - start_time
        metrics.record_latency("llm_generation", total_elapsed)
        if total_elapsed > 0 and token_count > 0:
            metrics.record_tokens_per_sec(model_used, token_count / total_elapsed)

    def _generate_groq(self, prompt: str, model: str, temperature: float = 0.7, max_tokens: int = 8192) -> str:
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": temperature
        }
        with httpx.Client(timeout=httpx.Timeout(10.0, connect=5.0)) as client:
            response = client.post(f"{self.base_url}/chat/completions", json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]

    def _generate_groq_stream(self, prompt: str, model: str, temperature: float = 0.7, max_tokens: int = 8192):
        headers = {
            "Authorization": f"Bearer {self.groq_api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": True
        }
        with httpx.Client(timeout=httpx.Timeout(10.0, connect=5.0)) as client:
            with client.stream("POST", f"{self.base_url}/chat/completions", json=payload, headers=headers) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            import json
                            data = json.loads(data_str)
                            content = data.get("choices", [{}])[0].get("delta", {}).get("content")
                            if content:
                                yield content
                        except Exception:
                            pass

    def _sanitize_gemini_model(self, model: str) -> str:
        if not model or "gemini-2.5-flash" in model:
            return "gemini-3.6-flash"
        return model

    def _generate_gemini(self, prompt: str, model: str, max_tokens: int = 8192) -> str:
        model = self._sanitize_gemini_model(model)
        try:
            response = self.client.models.generate_content(
                model=model,
                contents=prompt,
                config=self.types.GenerateContentConfig(max_output_tokens=max_tokens)
            )
            return response.text
        except Exception as e:
            if model != "gemini-flash-latest":
                print(f"[LLM] Gemini call with '{model}' failed ({e}). Retrying with 'gemini-flash-latest'...")
                response = self.client.models.generate_content(
                    model="gemini-flash-latest",
                    contents=prompt,
                    config=self.types.GenerateContentConfig(max_output_tokens=max_tokens)
                )
                return response.text
            raise

    def _generate_gemini_stream(self, prompt: str, model: str, max_tokens: int = 8192):
        model = self._sanitize_gemini_model(model)
        try:
            for chunk in self.client.models.generate_content_stream(
                model=model,
                contents=prompt,
                config=self.types.GenerateContentConfig(max_output_tokens=max_tokens),
            ):
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            if model != "gemini-flash-latest":
                print(f"[LLM] Gemini stream with '{model}' failed ({e}). Retrying with 'gemini-flash-latest'...")
                for chunk in self.client.models.generate_content_stream(
                    model="gemini-flash-latest",
                    contents=prompt,
                    config=self.types.GenerateContentConfig(max_output_tokens=max_tokens),
                ):
                    if chunk.text:
                        yield chunk.text
            else:
                raise
