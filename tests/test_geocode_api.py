import pytest
import requests
from fastapi.testclient import TestClient

from schoolsmap import geocode_proxy
from schoolsmap.api import app, get_geocode_search


def _result(address="123 EXAMPLE ROAD", lat=1.35, lng=103.82):
    return {"ADDRESS": address, "LATITUDE": lat, "LONGITUDE": lng}


def _client_with_search(search_fn):
    app.dependency_overrides[get_geocode_search] = lambda: search_fn
    return TestClient(app)


def test_geocode_returns_multiple_candidates():
    results = [_result("1 A ROAD", 1.1, 103.1), _result("2 B ROAD", 1.2, 103.2)]
    client = _client_with_search(lambda q: results)

    resp = client.get("/api/geocode", params={"q": "example"})
    app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 2
    assert body[0] == {"label": "1 A ROAD", "latitude": 1.1, "longitude": 103.1}
    assert body[1] == {"label": "2 B ROAD", "latitude": 1.2, "longitude": 103.2}


def test_geocode_returns_empty_list_for_no_matches():
    client = _client_with_search(lambda q: [])

    resp = client.get("/api/geocode", params={"q": "nonsense query"})
    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json() == []


def test_geocode_rejects_too_short_query_without_calling_search():
    calls = []
    client = _client_with_search(lambda q: calls.append(q) or [_result()])

    resp = client.get("/api/geocode", params={"q": "a"})
    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json() == []
    assert calls == []


def test_cached_token_reused_across_requests(monkeypatch):
    monkeypatch.setattr(geocode_proxy, "_cached_token", None)
    monkeypatch.setenv("ONEMAP_EMAIL", "test@example.com")
    monkeypatch.setenv("ONEMAP_PASSWORD", "password")

    token_calls = []

    def fake_get_token(email, password):
        token_calls.append((email, password))
        return "token-1"

    def fake_search(query, token, *, cache_dir=None):
        return [_result()]

    monkeypatch.setattr(geocode_proxy.onemap, "get_token", fake_get_token)
    monkeypatch.setattr(geocode_proxy.onemap, "search", fake_search)

    geocode_proxy.search("first query")
    geocode_proxy.search("second query")

    assert len(token_calls) == 1


def test_auth_failure_triggers_one_reauth_and_retry(monkeypatch):
    monkeypatch.setattr(geocode_proxy, "_cached_token", None)
    monkeypatch.setenv("ONEMAP_EMAIL", "test@example.com")
    monkeypatch.setenv("ONEMAP_PASSWORD", "password")

    token_calls = []

    def fake_get_token(email, password):
        token_calls.append((email, password))
        return f"token-{len(token_calls)}"

    search_calls = []

    def fake_search(query, token, *, cache_dir=None):
        search_calls.append(token)
        if token == "token-1":
            response = requests.Response()
            response.status_code = 401
            raise requests.HTTPError(response=response)
        return [_result()]

    monkeypatch.setattr(geocode_proxy.onemap, "get_token", fake_get_token)
    monkeypatch.setattr(geocode_proxy.onemap, "search", fake_search)

    results = geocode_proxy.search("some query")

    assert results == [_result()]
    assert token_calls == [("test@example.com", "password"), ("test@example.com", "password")]
    assert search_calls == ["token-1", "token-2"]
