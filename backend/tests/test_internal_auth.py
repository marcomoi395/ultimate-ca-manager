import datetime
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

def test_private_key_export_consumes_key_once(app, auth_client, monkeypatch):
    import base64
    import uuid
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.x509.oid import NameOID
    from models import Certificate, db
    from utils.key_codec import store_pem_bytes

    monkeypatch.setenv('UCM_INTERNAL_AUTH_SECRET', 'internal-secret')
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, 'one-time-export.example')])
    csr = x509.CertificateSigningRequestBuilder().subject_name(name).sign(key, hashes.SHA256())
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now)
        .not_valid_after(now + datetime.timedelta(days=1))
        .sign(key, hashes.SHA256())
    )
    with app.app_context():
        row = Certificate(
            refid=str(uuid.uuid4()),
            descr='one-time-export.example',
            crt=base64.b64encode(cert.public_bytes(serialization.Encoding.DER)).decode(),
            csr=base64.b64encode(csr.public_bytes(serialization.Encoding.PEM)).decode(),
            prv=store_pem_bytes(key.private_bytes(
                serialization.Encoding.PEM,
                serialization.PrivateFormat.PKCS8,
                serialization.NoEncryption(),
            )),
        )
        db.session.add(row)
        db.session.commit()
        row_id = row.id

    body = {
        'certificate': base64.b64encode(cert.public_bytes(serialization.Encoding.DER)).decode(),
        'filename': 'one-time-export',
        'format': 'key',
        'include_key': True,
    }
    headers = {'X-UCM-Internal-Auth': 'internal-secret'}
    first = auth_client.post('/internal/certificates/export', json=body, headers=headers)
    assert first.status_code == 200
    assert b'BEGIN PRIVATE KEY' in first.data

    with app.app_context():
        assert db.session.get(Certificate, row_id).prv is None

    second = auth_client.post('/internal/certificates/export', json=body, headers=headers)
    assert second.status_code == 404
