
import os
import time

from flask import Flask, Response, g, jsonify, request
from prometheus_client import (
    CollectorRegistry,
    Counter,
    Histogram,
    CONTENT_TYPE_LATEST,
    generate_latest,
    multiprocess,
)

app = Flask(__name__)

HTTP_REQUESTS = Counter(
    "kubeshield_http_requests_total",
    "Total HTTP requests handled by KubeShield",
    ["method", "endpoint", "status"],
)

HTTP_DURATION = Histogram(
    "kubeshield_http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
)


@app.before_request
def start_timer():
    g.start_time = time.perf_counter()


@app.after_request
def record_metrics(response):
    if request.path == "/metrics":
        return response

    endpoint = request.url_rule.rule if request.url_rule else "unmatched"
    method = request.method

    HTTP_REQUESTS.labels(
        method=method,
        endpoint=endpoint,
        status=str(response.status_code),
    ).inc()

    HTTP_DURATION.labels(
        method=method,
        endpoint=endpoint,
    ).observe(time.perf_counter() - g.start_time)

    return response


@app.get("/healthz")
def health():
    return jsonify(status="ok"), 200


@app.get("/readyz")
def ready():
    return jsonify(status="ready"), 200


@app.get("/api/v1/info")
def info():
    return jsonify(name="KubeShield Enterprise", version="0.1.0"), 200
