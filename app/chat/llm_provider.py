from dotenv import load_dotenv
import os
import httpx

load_dotenv()

class LLMProvider:
    def __init__(self):
        self.groq_api_key = (os.getenv("GROQ_API_KEY") or os.getenv("GROK_API_KEY") or "").strip()
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")

        # Always initialize Gemini client for fallback support
        from google import genai
        from google.genai import types
        self.genai = genai
        self.types = types
        self.client = genai.Client(api_key=self.gemini_api_key)

        # Use Groq if API key is provided, with automatic Gemini fallback
        self.use_groq = bool(self.groq_api_key)
        self.use_grok = self.use_groq  # Backward-compatible alias

        if self.use_groq:
            self.model_type = "groq"
            self.api_key = self.groq_api_key
            self.base_url = "https://api.groq.com/openai/v1"
            self.model = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
        else:
            self.model_type = "gemini"

    def generate(self, prompt):
        """Generate text using configured LLM (Groq or Gemini)."""
        if self.use_groq:
            try:
                return self._generate_groq(prompt)
            except Exception as e:
                print(f"[LLM] Groq failed: {e}. Falling back to Gemini...")
                return self._generate_gemini(prompt)
        else:
            return self._generate_gemini(prompt)

    def generate_stream(self, prompt):
        """Generate text using configured LLM with streaming and automatic fallback."""
        if self.use_groq:
            try:
                stream = self._generate_groq_stream(prompt)
                first_chunk = next(stream, None)
                if first_chunk is not None:
                    yield first_chunk
                    yield from stream
                    return
            except Exception as e:
                print(f"[LLM] Groq streaming failed: {e}. Falling back to Gemini...")

            yield from self._generate_gemini_stream(prompt)
        else:
            yield from self._generate_gemini_stream(prompt)

    def _generate_groq(self, prompt):
        """Generate using Groq API."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 8192,
            "temperature": 0.7
        }

        try:
            with httpx.Client() as client:
                response = client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                    timeout=60.0
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        except httpx.HTTPError as e:
            raise RuntimeError(f"Groq API error: {e}")

    def _generate_groq_stream(self, prompt):
        """Generate using Groq API with streaming."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 8192,
            "temperature": 0.7,
            "stream": True
        }

        try:
            with httpx.Client() as client:
                with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                    timeout=60.0
                ) as response:
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
                            except:
                                pass
        except httpx.HTTPError as e:
            raise RuntimeError(f"Groq API streaming error: {e}")

    # Aliases for backward compatibility
    _generate_grok = _generate_groq
    _generate_grok_stream = _generate_groq_stream

    def _generate_gemini(self, prompt):
        """Generate using Google Gemini API."""
        response = self.client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
            config=self.types.GenerateContentConfig(
                max_output_tokens=8192,
            )
        )
        return response.text

    def _generate_gemini_stream(self, prompt):
        """Generate using Google Gemini API with streaming."""
        for chunk in self.client.models.generate_content(
            model='gemini-3.6-flash',
            contents=prompt,
            config=self.types.GenerateContentConfig(
                max_output_tokens=8192,
            ),
            stream=True
        ):
            yield chunk.text
