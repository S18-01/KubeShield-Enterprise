from flask import Flask, jsonify

app = Flask(__name__)

@app.get('/healthz')
def health():
    return jsonify(status='ok'), 200

@app.get('/readyz')
def ready():
    return jsonify(status='ready'), 200

@app.get('/api/v1/info')
def info():
    return jsonify(name='KubeShield Enterprise', version='0.1.0'), 200
