from app.main import app


def test_health():
    response = app.test_client().get('/healthz')
    assert response.status_code == 200
    assert response.json == {'status': 'ok'}


def test_ready():
    assert app.test_client().get('/readyz').status_code == 200


def test_info():
    assert app.test_client().get('/api/v1/info').json['name'] == 'KubeShield Enterprise'
