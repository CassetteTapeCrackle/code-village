"""A small DeepSeek chat client: urllib only, three retries with backoff, a hard cap on calls.

Model calls happen only in GitHub Actions (spec 12). The key comes from DEEPSEEK_API_KEY, the model id from
DEEPSEEK_MODEL (default deepseek-flash) and the cap from VET_MAX_CALLS (default 3000). Nothing here prints the key.
"""

import http.client
import json
import os
import threading
import time
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping
from dataclasses import dataclass

API = "https://api.deepseek.com"
DEFAULT_MODEL = "deepseek-flash"
DEFAULT_MAX_CALLS = 3000
RETRIES = 3
BACKOFF_SECONDS = (2, 4, 8)
TIMEOUT_SECONDS = 120
RETRY_STATUS = {408, 429, 500, 502, 503, 504}

Transport = Callable[[urllib.request.Request], bytes]


class DeepSeekError(RuntimeError):
    """A call failed for good: bad key, bad request, or the service kept failing."""


class CapReached(DeepSeekError):
    """The run made as many calls as VET_MAX_CALLS allows."""


class ModelMissing(DeepSeekError):
    """The API does not list the model id the job was told to use."""


@dataclass(frozen=True)
class Message:
    role: str
    content: str


class CallCap:
    """Counts calls (retries included) across threads and refuses the one past the limit."""

    def __init__(self, limit: int) -> None:
        self.limit = limit
        self.used = 0
        self._lock = threading.Lock()

    def take(self) -> None:
        with self._lock:
            if self.used >= self.limit:
                raise CapReached(f"{self.limit} calls made: raise VET_MAX_CALLS to go on")
            self.used += 1


@dataclass(frozen=True)
class Settings:
    api_key: str
    model: str
    max_calls: int


def settings_from_env(env: Mapping[str, str] | None = None) -> Settings:
    source = os.environ if env is None else env
    key = source.get("DEEPSEEK_API_KEY", "")
    if not key:
        raise DeepSeekError("DEEPSEEK_API_KEY is not set")
    max_calls = int(source.get("VET_MAX_CALLS") or DEFAULT_MAX_CALLS)
    return Settings(key, source.get("DEEPSEEK_MODEL") or DEFAULT_MODEL, max_calls)


def urlopen_transport(request: urllib.request.Request) -> bytes:
    with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:  # the DeepSeek https API
        body: bytes = response.read()
    return body


class DeepSeek:
    """Calls the API for one run. `transport` and `sleep` are replaceable so tests need no network and no waiting."""

    def __init__(self, settings: Settings, transport: Transport = urlopen_transport,
                 sleep: Callable[[float], None] = time.sleep) -> None:
        self.settings = settings
        self.cap = CallCap(settings.max_calls)
        self._transport = transport
        self._sleep = sleep

    def _request(self, path: str, body: dict[str, object] | None) -> urllib.request.Request:
        data = None if body is None else json.dumps(body).encode()
        headers = {"Authorization": f"Bearer {self.settings.api_key}", "Content-Type": "application/json"}
        method = "GET" if body is None else "POST"
        return urllib.request.Request(f"{API}{path}", data=data, method=method, headers=headers)

    def check_model(self) -> None:
        """GET /models must list the model id; otherwise the job stops before spending anything."""
        try:
            listed = json.loads(self._transport(self._request("/models", None)))
        except (urllib.error.URLError, json.JSONDecodeError, TimeoutError) as e:
            raise DeepSeekError(f"could not list the models: {type(e).__name__}") from e
        ids = {m.get("id") for m in listed.get("data", []) if isinstance(m, dict)}
        if self.settings.model not in ids:
            raise ModelMissing(f"the API does not list the model {self.settings.model}")

    def chat(self, messages: list[Message], *, temperature: float, json_reply: bool = True) -> tuple[str, int]:
        """The model's reply text and the tokens it used. Retries a busy or failing service three times."""
        body: dict[str, object] = {"model": self.settings.model, "temperature": temperature,
                                   "messages": [{"role": m.role, "content": m.content} for m in messages]}
        if json_reply:
            body["response_format"] = {"type": "json_object"}
        request = self._request("/chat/completions", body)
        for attempt in range(RETRIES + 1):
            self.cap.take()
            try:
                data = json.loads(self._transport(request))
                return str(data["choices"][0]["message"]["content"]), int(data.get("usage", {}).get("total_tokens", 0))
            except urllib.error.HTTPError as e:
                if e.code not in RETRY_STATUS:
                    raise DeepSeekError(f"the API answered {e.code}") from e
            except (OSError, http.client.HTTPException, json.JSONDecodeError, KeyError, IndexError, TypeError):
                pass  # a dropped connection, a cut reply or a reply without choices: try again
            if attempt < RETRIES:
                self._sleep(BACKOFF_SECONDS[attempt])
        raise DeepSeekError(f"no usable reply after {RETRIES + 1} tries")
