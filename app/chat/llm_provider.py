from dotenv import load_dotenv
import os
import httpx

load_dotenv()

class LLMProvider:
    def __init__(self):
        self.api_key = os.getenv("GROK_API_KEY")
        if not self.api_key:
            raise ValueError("GROK_API_KEY environment variable not set")
        self.base_url = "https://api.x.ai/v1"
        self.model = "grok-2"

    def generate(self, prompt):
        """Generate text using Grok API."""
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

    def generate_stream(self, prompt):
        """Generate text using Grok API with streaming."""
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
                            data_str = line[6:]  # Remove "data: " prefix
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
