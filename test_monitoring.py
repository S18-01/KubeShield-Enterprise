
from app.main import app
from app.monitoring import monitoring_app


def test_metrics_not_exposed_on_api():
    client = app.test_client()
    response = client.get("/metrics")
    assert response.status_code == 404


def test_metrics_endpoint_returns_200():
    client = monitoring_app.test_client()
    response = client.get("/metrics")

    assert response.status_code == 200
    assert b"kubeshield_http_requests_total" in response.data
    assert b"kubeshield_http_request_duration_seconds" in response.data


def test_http_request_counter():
    api_client = app.test_client()
    metrics_client = monitoring_app.test_client()

    api_client.get("/healthz")
    response = metrics_client.get("/metrics")

    assert response.status_code == 200
    assert b'endpoint="/healthz"' in response.data
    assert b'method="GET"' in response.data


def test_http_duration_histogram():
    api_client = app.test_client()
    metrics_client = monitoring_app.test_client()

    api_client.get("/readyz")
    response = metrics_client.get("/metrics")

    assert response.status_code == 200
    assert b"kubeshield_http_request_duration_seconds_bucket" in response.data


def test_existing_endpoints_still_work():
    client = app.test_client()

    assert client.get("/healthz").status_code == 200
    assert client.get("/readyz").status_code == 200
    assert client.get("/api/v1/info").status_code == 200
