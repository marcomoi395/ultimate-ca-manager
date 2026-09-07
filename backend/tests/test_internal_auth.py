import json


def test_introspection_rejects_missing_internal_secret(client, monkeypatch):
    monkeypatch.setenv('UCM_INTERNAL_AUTH_SECRET', 'internal-secret')
    response = client.post('/internal/auth/introspect')
    assert response.status_code == 401


def test_introspection_reuses_v2_session_auth(auth_client, monkeypatch):
    monkeypatch.setenv('UCM_INTERNAL_AUTH_SECRET', 'internal-secret')
    response = auth_client.post(
        '/internal/auth/introspect',
        headers={'X-UCM-Internal-Auth': 'internal-secret'},
    )
    assert response.status_code == 200
    payload = json.loads(response.data)
    assert payload['data']['authenticated'] is True
    assert payload['data']['auth_method'] == 'session'
    assert payload['data']['user']['username'] == 'admin'
    assert '*' in payload['data']['permissions']
