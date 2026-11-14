
import os

from flask import Flask, Response
from prometheus_client import (
    CollectorRegistry,
    CONTENT_TYPE_LATEST,
    generate_latest,
    multiprocess,
)

monitoring_app = Flask(__name__)


@monitoring_app.get("/metrics")
def metrics():
    if os.environ.get("PROMETHEUS_MULTIPROC_DIR"):
        registry = CollectorRegistry()
        multiprocess.MultiProcessCollector(registry)
        output = generate_latest(registry)
    else:
        from app.main import HTTP_REQUESTS, HTTP_DURATION
        output = generate_latest()

    return Response(output, content_type=CONTENT_TYPE_LATEST)
