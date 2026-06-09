"""
Minimal compatibility shim for emergentintegrations.llm.chat
Uses google-generativeai under the hood.
"""
import asyncio
import warnings
import os

warnings.filterwarnings("ignore", category=FutureWarning)


class UserMessage:
    def __init__(self, text: str):
        self.text = text


class LlmChat:
    def __init__(self, api_key: str, session_id: str = "", system_message: str = ""):
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message
        self._model_name = "gemini-1.5-flash"
        self._history = []

    def with_model(self, provider: str, model_name: str) -> "LlmChat":
        # Map old model names to current ones
        mapping = {
            "gemini-3-flash-preview": "gemini-1.5-flash",
            "gemini-2.0-flash-exp": "gemini-1.5-flash",
            "gemini-pro": "gemini-1.5-pro",
        }
        self._model_name = mapping.get(model_name, "gemini-1.5-flash")
        return self

    async def send_message(self, message: UserMessage) -> str:
        import google.generativeai as genai

        genai.configure(api_key=self.api_key)

        history_parts = []
        if self.system_message:
            history_parts.append(f"[System]: {self.system_message}\n\n")
        for turn in self._history:
            history_parts.append(f"[{turn['role']}]: {turn['content']}\n")

        full_prompt = "".join(history_parts) + f"[User]: {message.text}"

        model = genai.GenerativeModel(self._model_name)

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: model.generate_content(full_prompt)
        )

        reply = response.text
        self._history.append({"role": "user", "content": message.text})
        self._history.append({"role": "assistant", "content": reply})
        return reply
