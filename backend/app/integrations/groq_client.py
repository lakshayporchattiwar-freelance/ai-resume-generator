"""Groq API client integration per TRD Section 5 and Security Document Section 10."""

import asyncio
import json
import logging
from typing import Any, Dict, Optional

import httpx
from groq import Groq, APIStatusError, APITimeoutError

from app.core.config import settings
from app.core.exceptions import AIProviderError, AITimeoutError

logger = logging.getLogger(__name__)

MODEL_FALLBACK_CHAIN = [
    "groq/compound-mini",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]


class GroqClient:
    def __init__(self):
        self._client: Optional[Groq] = None
        self._async_client: Optional[httpx.AsyncClient] = None

    @property
    def client(self) -> Groq:
        if self._client is None:
            self._client = Groq(api_key=settings.GROQ_API_KEY)
        return self._client

    @property
    def async_client(self) -> httpx.AsyncClient:
        if self._async_client is None or self._async_client.is_closed:
            self._async_client = httpx.AsyncClient(timeout=httpx.Timeout(settings.AI_REQUEST_TIMEOUT_SECONDS))
        return self._async_client

    async def chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        response_format: Optional[Dict[str, Any]] = None,
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> str:
        models_to_try = [settings.GROQ_MODEL_NAME] + [m for m in MODEL_FALLBACK_CHAIN if m != settings.GROQ_MODEL_NAME]
        last_error = None

        for model in models_to_try:
            try:
                return await self._do_completion_async(
                    system_prompt, user_prompt, response_format, temperature, max_tokens, model
                )
            except AIProviderError as e:
                last_error = e
                error_str = str(e)
                if "404" in error_str or "model" in error_str.lower():
                    logger.warning("groq_model_fallback", extra={"detail": f"Model {model} failed, trying next"})
                    continue
                if "429" in error_str:
                    logger.warning("groq_rate_limited", extra={"detail": f"Model {model} rate limited, trying next"})
                    continue
                raise

        raise last_error or AIProviderError("All model fallbacks failed")

    async def _do_completion_async(
        self,
        system_prompt: str,
        user_prompt: str,
        response_format: Optional[Dict[str, Any]],
        temperature: float,
        max_tokens: int,
        model: str,
    ) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            payload["response_format"] = response_format

        try:
            resp = await self.async_client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )

            if resp.status_code == 429:
                raise AIProviderError("AI provider rate limit exceeded. Please try again later.")
            if resp.status_code == 404:
                raise AIProviderError(f"Model not found: {model}")
            if resp.status_code >= 500:
                raise AIProviderError(f"AI provider server error: {resp.status_code}")
            if resp.status_code != 200:
                error_detail = resp.text[:200]
                raise AIProviderError(f"AI provider error: {resp.status_code} - {error_detail}")

            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content")
            if content is None:
                raise AIProviderError("Empty response from AI provider")
            return content.strip()

        except httpx.TimeoutException:
            logger.warning("groq_api_timeout", extra={"detail": f"Model: {model}"})
            raise AITimeoutError()
        except (AIProviderError, AITimeoutError):
            raise
        except Exception as e:
            logger.error("groq_unexpected_error", extra={"detail": f"Model: {model}, Error: {str(e)[:200]}"})
            raise AIProviderError("Unexpected AI provider error")

    async def _do_completion_sync(
        self,
        system_prompt: str,
        user_prompt: str,
        response_format: Optional[Dict[str, Any]],
        temperature: float,
        max_tokens: int,
        model: str,
    ) -> str:
        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
            kwargs: Dict[str, Any] = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "timeout": settings.AI_REQUEST_TIMEOUT_SECONDS,
            }
            if response_format:
                kwargs["response_format"] = response_format

            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: self.client.chat.completions.create(**kwargs))
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
            if e.status_code == 404:
                raise AIProviderError(f"Model not found: {model}")
            raise AIProviderError(f"AI provider error: {e.status_code}")
        except Exception as e:
            logger.error("groq_unexpected_error", extra={"detail": str(e)[:200]})
            raise AIProviderError("Unexpected AI provider error")


groq_client = GroqClient()
