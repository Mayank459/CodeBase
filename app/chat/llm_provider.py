from dotenv import load_dotenv
import os
from google import genai

from google.genai import types

load_dotenv()

class LLMProvider:
    def __init__(self):
        self.client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

    def generate(self, prompt):
        response = self.client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=8192,
            )
        )
        return response.text

    def generate_stream(self, prompt):
        for chunk in self.client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                max_output_tokens=8192,
            ),
            stream=True
        ):
            yield chunk.text