"""Groq API client integration per TRD Section 5 and Security Document Section 10."""

import json
import logging
from typing import Any, Dict, Optional

import httpx
from groq import Groq, APIStatusError, APITimeoutError

from app.core.config import settings
from app.core.exceptions import AIProviderError, AITimeoutError

logger = logging.getLogger(__name__)


class GroqClient:
    def __init__(self):
        self._client: Optional[Groq] = None

    @property
    def client(self) -> Groq:
        if self._client is None:
            self._client = Groq(api_key=settings.GROQ_API_KEY)
        return self._client

    async def chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        response_format: Optional[Dict[str, Any]] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> str:
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            kwargs: Dict[str, Any] = {
                "model": settings.GROQ_MODEL_NAME,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "timeout": settings.AI_REQUEST_TIMEOUT_SECONDS,
            }
            if response_format:
                kwargs["response_format"] = response_format

            response = self.client.chat.completions.create(**kwargs)
            content = response.choices[0].message.content
            if content is None:
                raise AIProviderError("Empty response from AI provider")
            return content.strip()

        except APITimeoutError:
            logger.warning("groq_api_timeout")
            raise AITimeoutError()
        except APIStatusError as e:
            logger.error("groq_api_error", extra={"detail": f"Status {e.status_code}"})
            if e.status_code == 429:
                raise AIProviderError("AI provider rate limit exceeded. Please try again later.")
            raise AIProviderError(f"AI provider error: {e.status_code}")
        except Exception as e:
            logger.error("groq_unexpected_error", extra={"detail": str(e)[:200]})
            raise AIProviderError("Unexpected AI provider error")


groq_client = GroqClient()
