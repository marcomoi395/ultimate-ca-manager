from types import SimpleNamespace


def test_certificates_proxy_forwards_auth_query_and_response(client, monkeypatch):
    captured = {}

    def fake_get(url, headers, timeout):
        captured.update(url=url, headers=headers, timeout=timeout)
        return SimpleNamespace(
            content=b'{"data":[]}',
            status_code=200,
            headers={'Content-Type': 'application/json'},
        )

    monkeypatch.setattr('api.v3_proxy.requests.get', fake_get)
    response = client.get(
        '/api/v3/certificates?page=2&status=valid&status=expired',
        headers={'Cookie': 'session=x', 'X-API-Key': 'key'},
    )

    assert response.status_code == 200
    assert captured['url'] == 'http://ejbca-gateway:8081/api/v3/certificates?page=2&status=valid&status=expired'
    assert captured['headers']['Cookie'] == 'session=x'
    assert captured['headers']['X-API-Key'] == 'key'
    assert captured['timeout'] == 30
