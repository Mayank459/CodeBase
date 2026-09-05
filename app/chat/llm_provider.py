from dotenv import load_dotenv
import os
import httpx

load_dotenv()

class LLMProvider:
    def __init__(self):
        # For now, use Gemini as primary LLM
        # Grok support ready when API key is validated
        self.grok_api_key = os.getenv("GROK_API_KEY")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")

        # Temporarily disable Grok due to API validation issues
        # Set use_grok = True only after verifying Grok API key format
        self.use_grok = False  # Disabled for now

        if self.use_grok and self.grok_api_key:
            self.model_type = "grok"
            self.api_key = self.grok_api_key
            self.base_url = "https://api.x.ai/v1"
            self.model = "grok-3"
        else:
            self.model_type = "gemini"
            from google import genai
            from google.genai import types
            self.genai = genai
            self.types = types
            self.client = genai.Client(api_key=self.gemini_api_key)

    def generate(self, prompt):
        """Generate text using configured LLM (Grok or Gemini)."""
        if self.use_grok:
            try:
                return self._generate_grok(prompt)
            except Exception as e:
                print(f"[LLM] Grok failed: {e}. Falling back to Gemini...")
                return self._generate_gemini(prompt)
        else:
            return self._generate_gemini(prompt)

    def generate_stream(self, prompt):
        """Generate text using configured LLM with streaming."""
        if self.use_grok:
            try:
                return self._generate_grok_stream(prompt)
            except Exception as e:
                print(f"[LLM] Grok streaming failed: {e}. Falling back to Gemini...")
                return self._generate_gemini_stream(prompt)
        else:
            return self._generate_gemini_stream(prompt)

    def _generate_grok(self, prompt):
        """Generate using Grok API."""
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
            raise RuntimeError(f"Grok API error: {e}")

    def _generate_grok_stream(self, prompt):
        """Generate using Grok API with streaming."""
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
            raise RuntimeError(f"Grok API streaming error: {e}")

    def _generate_gemini(self, prompt):
        """Generate using Google Gemini API."""
        response = self.client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=self.types.GenerateContentConfig(
                max_output_tokens=8192,
            )
        )
        return response.text

    def _generate_gemini_stream(self, prompt):
        """Generate using Google Gemini API with streaming."""
        for chunk in self.client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=self.types.GenerateContentConfig(
                max_output_tokens=8192,
            ),
            stream=True
        ):
            yield chunk.text
