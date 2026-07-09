"""
Gemini Client.

Thin, dependency-isolating wrapper around Google's `google-generativeai`
SDK. Centralizes API-key handling, model selection, timeout, and error
classification in one place -- mirroring the Node backend's
`AiServiceClient` (see `backend/src/clients/aiServiceClient.js`) --
so callers (`CandidateIdentificationService`) never touch the SDK
directly and never have to special-case "no API key configured"
themselves.

Deliberately knows nothing about prompts or candidate identification --
it only knows how to turn a `(system_prompt, user_prompt)` pair into
raw text, or raise `GeminiError` explaining why it couldn't. Prompt
construction lives in `app.services.prompt_service.PromptService`;
response interpretation lives in
`app.services.candidate_identification_service`.

Usage:

    from app.services.gemini_client import GeminiClient

    client = GeminiClient()
    if client.is_configured():
        text = client.generate(system_prompt, user_prompt)
"""

from typing import Optional

from app.core.config import GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TIMEOUT_SECONDS


class GeminiError(Exception):
    """Raised when a configured Gemini client fails to produce a
    response (SDK missing, API error, timeout, empty response, ...).
    Never raised for the "not configured" case -- callers should check
    `is_configured()` first and take their own fallback path."""


class GeminiClient:
    """Not stateless in the trivial sense (it lazily builds an SDK
    model instance) but holds no per-request state -- safe to
    instantiate once and share, or construct fresh per-request/test
    with explicit overrides.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout_seconds: Optional[float] = None,
    ):
        self.api_key = api_key if api_key is not None else GEMINI_API_KEY
        self.model_name = model_name or GEMINI_MODEL
        self.timeout_seconds = timeout_seconds or GEMINI_TIMEOUT_SECONDS
        self._model = None

    def is_configured(self) -> bool:
        """Whether an API key is present. Callers use this to decide
        whether to attempt a Gemini call at all, rather than triggering
        an SDK error path for the common "no key in this environment"
        case."""
        return bool(self.api_key)

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        """Sends `user_prompt` to Gemini (with `system_prompt` as the
        model's system instruction) and returns the raw text response.

        @raises GeminiError if the client isn't configured, the SDK
            isn't installed, the request fails, times out, or the model
            returns no usable text.
        """
        if not self.is_configured():
            raise GeminiError("GEMINI_API_KEY is not set; Gemini client is not configured.")

        model = self._get_model(system_prompt)

        try:
            response = model.generate_content(
                user_prompt,
                request_options={"timeout": self.timeout_seconds},
            )
        except Exception as exc:  # noqa: BLE001 - SDK raises several distinct exception types
            raise GeminiError(f"Gemini request failed: {exc}") from exc

        text = getattr(response, "text", None)
        if not text:
            raise GeminiError("Gemini returned an empty response.")

        return text

    # -- internal helpers ---------------------------------------------------

    def _get_model(self, system_prompt: str):
        """Lazily imports the SDK (so the rest of the service stays
        importable even in environments where `google-generativeai`
        isn't installed) and builds/caches a configured model instance.
        """
        if self._model is not None:
            return self._model

        try:
            import google.generativeai as genai
        except ImportError as exc:
            raise GeminiError(
                "The google-generativeai package is not installed. "
                "Run `pip install -r requirements.txt`."
            ) from exc

        genai.configure(api_key=self.api_key)
        self._model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=system_prompt,
            generation_config={"response_mime_type": "application/json"},
        )
        return self._model
