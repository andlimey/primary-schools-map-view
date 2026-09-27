import pytest
import requests

from schoolsmap import onemap_token


@pytest.fixture(autouse=True)
def _reset_token(monkeypatch):
    monkeypatch.setattr(onemap_token, "_cached_token", None)
    monkeypatch.setenv("ONEMAP_EMAIL", "test@example.com")
    monkeypatch.setenv("ONEMAP_PASSWORD", "password")


def test_token_fetched_once_and_reused(monkeypatch):
    calls = []
    monkeypatch.setattr(
        onemap_token.onemap, "get_token", lambda e, p: calls.append((e, p)) or "tok-1"
    )

    results = [onemap_token.with_token(lambda t: t) for _ in range(3)]

    assert results == ["tok-1", "tok-1", "tok-1"]
    assert len(calls) == 1


def test_reauth_once_on_401_then_retry(monkeypatch):
    tokens = iter(["tok-1", "tok-2"])
    monkeypatch.setattr(onemap_token.onemap, "get_token", lambda e, p: next(tokens))

    seen = []

    def call(token):
        seen.append(token)
        if token == "tok-1":
            resp = requests.Response()
            resp.status_code = 401
            raise requests.HTTPError(response=resp)
        return "ok"

    assert onemap_token.with_token(call) == "ok"
    assert seen == ["tok-1", "tok-2"]


def test_stale_token_refreshed_once_across_rejections(monkeypatch):
    tokens = iter(["tok-1", "tok-2"])
    monkeypatch.setattr(onemap_token.onemap, "get_token", lambda e, p: next(tokens))
    onemap_token.get_token()

    # Two requests both rejected with tok-1: the first re-fetches, the second reuses tok-2.
    assert onemap_token.get_token(stale="tok-1") == "tok-2"
    assert onemap_token.get_token(stale="tok-1") == "tok-2"


def test_non_auth_http_error_propagates(monkeypatch):
    monkeypatch.setattr(onemap_token.onemap, "get_token", lambda e, p: "tok-1")

    def call(token):
        resp = requests.Response()
        resp.status_code = 500
        raise requests.HTTPError(response=resp)

    with pytest.raises(requests.HTTPError):
        onemap_token.with_token(call)


def test_missing_credentials_raises_config_error(monkeypatch):
    monkeypatch.delenv("ONEMAP_EMAIL", raising=False)
    monkeypatch.delenv("ONEMAP_PASSWORD", raising=False)
    monkeypatch.setattr(onemap_token, "load_dotenv", lambda *a, **k: None)

    with pytest.raises(onemap_token.OneMapConfigError):
        onemap_token.get_token()
