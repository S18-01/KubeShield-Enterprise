
FROM python:3.12-alpine

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PROMETHEUS_MULTIPROC_DIR=/tmp/prometheus

WORKDIR /app

RUN apk update && \
    apk upgrade --no-cache && \
    addgroup -S appgroup && \
    adduser -S -u 10001 -G appgroup appuser && \
    mkdir -p /tmp/prometheus && \
    chown -R 10001:10001 /tmp/prometheus

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY gunicorn.conf.py .
COPY start.sh .

USER 10001:10001

EXPOSE 8080 9090

CMD ["sh", "/app/start.sh"]
