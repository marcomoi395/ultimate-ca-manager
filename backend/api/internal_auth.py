import base64
import hmac
import os
import re
import logging
from cryptography import x509

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import pkcs12
from flask import Blueprint, Response, request

from auth.unified import AuthManager, has_permission
from models import Certificate
from utils.key_codec import load_pem_bytes
from utils.response import error_response, success_response


bp = Blueprint('internal_auth', __name__)
logger = logging.getLogger(__name__)


def _authorize_internal_request():
    configured_secret = os.getenv('UCM_INTERNAL_AUTH_SECRET')
    presented_secret = request.headers.get('X-UCM-Internal-Auth', '')
    if not configured_secret or not hmac.compare_digest(presented_secret, configured_secret):
        return error_response('Unauthorized', 401)

    result = AuthManager().authenticate_request(request)
    if not result:
        return error_response('Authentication required', 401)
    permissions = result['permissions']
    if '*' not in permissions and not has_permission('read:certificates', permissions):
        return error_response('Insufficient permissions', 403)
    if '*' not in permissions and not has_permission('read:private_keys', permissions):
        return error_response('Private key export requires the read:private_keys permission', 403)
    return None


def _decode_der(value, field_name):
    if not isinstance(value, str) or not value:
        raise ValueError(f'{field_name} is required')
    try:
        return base64.b64decode(value, validate=True)
    except Exception as exc:
        raise ValueError(f'{field_name} must be base64 DER') from exc


def _find_private_key(certificate):
    public_key = certificate.public_key().public_bytes(
        serialization.Encoding.DER,
        serialization.PublicFormat.SubjectPublicKeyInfo,
    )
    matches = []
    for row in Certificate.query.filter(Certificate.csr.isnot(None), Certificate.prv.isnot(None)).all():
        try:
            csr_pem = row.csr.encode() if row.csr.startswith('-----BEGIN') else base64.b64decode(row.csr)
            csr = x509.load_pem_x509_csr(csr_pem, default_backend())
            csr_public_key = csr.public_key().public_bytes(
                serialization.Encoding.DER,
                serialization.PublicFormat.SubjectPublicKeyInfo,
            )
            if hmac.compare_digest(csr_public_key, public_key):
                matches.append(row)
        except Exception:
            continue
    if len(matches) > 1:
        raise ValueError('Multiple UCM private keys match the certificate')
    if not matches:
        return None
    return load_pem_bytes(matches[0].prv, context=f'certificate {matches[0].id}')


def _named_cas(certificates):
    named = []
    for cert in certificates:
        try:
            attrs = cert.subject.get_attributes_for_oid(x509.oid.NameOID.COMMON_NAME)
            name = attrs[0].value if attrs else cert.subject.rfc4514_string()
        except Exception:
            name = cert.subject.rfc4514_string()
        named.append(pkcs12.PKCS12Certificate(cert, name.encode()))
    return named or None


@bp.route('/internal/auth/introspect', methods=['POST'])
def introspect():
    """Authenticate a forwarded v2 credential for a trusted internal caller."""
    configured_secret = os.getenv('UCM_INTERNAL_AUTH_SECRET')
    presented_secret = request.headers.get('X-UCM-Internal-Auth', '')
    if not configured_secret or not hmac.compare_digest(presented_secret, configured_secret):
        return error_response('Unauthorized', 401)

    result = AuthManager().authenticate_request(request)
    if not result:
        return error_response('Authentication required', 401)

    user = result['user']
    return success_response(data={
        'authenticated': True,
        'user': {'id': user.id, 'username': user.username},
        'auth_method': result['auth_method'],
        'permissions': result['permissions'],
    })


@bp.route('/internal/certificates/export', methods=['POST'])
def export_certificate_for_gateway():
    """Export a v3/EJBCA certificate using a matching UCM-stored private key."""
    denied = _authorize_internal_request()
    if denied:
        return denied

    data = request.get_json(silent=True) or {}
    export_format = str(data.get('format', '')).lower()
    if export_format not in ('pem', 'key', 'pkcs12', 'pfx', 'jks'):
        return error_response(f'Unsupported private-key export format: {export_format}', 400)
    if export_format in ('pkcs12', 'pfx', 'jks') and not isinstance(data.get('password'), str):
        return error_response(f'Password required for {export_format.upper()} export', 400)
    if export_format in ('pkcs12', 'pfx', 'jks') and not data['password']:
        return error_response(f'Password required for {export_format.upper()} export', 400)
    if data.get('include_key') is not True and export_format == 'pem':
        return error_response('include_key must be true for internal private-key export', 400)

    try:
        cert_der = _decode_der(data.get('certificate'), 'certificate')
        certificate = x509.load_der_x509_certificate(cert_der, default_backend())
        key_pem = _find_private_key(certificate)
        if not key_pem:
            return error_response('Certificate private key is not available in UCM', 404)
        private_key = serialization.load_pem_private_key(key_pem, password=None, backend=default_backend())
        chain = [
            x509.load_der_x509_certificate(_decode_der(item, 'chain certificate'), default_backend())
            for item in (data.get('chain') or [])
        ]
        filename = re.sub(r'[^A-Za-z0-9._-]', '_', str(data.get('filename') or 'certificate')) or 'certificate'
        password = data.get('password')

        if export_format == 'key':
            result = key_pem
            if password:
                result = private_key.private_bytes(
                    serialization.Encoding.PEM,
                    serialization.PrivateFormat.PKCS8,
                    serialization.BestAvailableEncryption(password.encode()),
                )
            return Response(result, mimetype='application/x-pem-file', headers={
                'Content-Disposition': f'attachment; filename="{filename}.key"',
            })

        if export_format == 'pem':
            result = certificate.public_bytes(serialization.Encoding.PEM)
            result += b'\n' + key_pem
            for item in chain:
                result += b'\n' + item.public_bytes(serialization.Encoding.PEM)
            suffix = '_full_chain' if chain else '_with_key'
            return Response(result, mimetype='application/x-pem-file', headers={
                'Content-Disposition': f'attachment; filename="{filename}{suffix}.pem"',
            })

        if export_format in ('pkcs12', 'pfx'):
            result = pkcs12.serialize_key_and_certificates(
                name=filename.encode(),
                key=private_key,
                cert=certificate,
                cas=_named_cas(chain),
                encryption_algorithm=serialization.BestAvailableEncryption(password.encode()),
            )
            extension = 'pfx' if export_format == 'pfx' else 'p12'
            return Response(result, mimetype='application/x-pkcs12', headers={
                'Content-Disposition': f'attachment; filename="{filename}.{extension}"',
            })

        import jks
        key_pkcs8 = private_key.private_bytes(
            serialization.Encoding.DER,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
        cert_chain = [('X.509', certificate.public_bytes(serialization.Encoding.DER))]
        cert_chain.extend(('X.509', item.public_bytes(serialization.Encoding.DER)) for item in chain)
        entry = jks.PrivateKeyEntry(
            alias=filename.lower().replace(' ', '-'),
            cert_chain=cert_chain,
            pkey_pkcs8=key_pkcs8,
            timestamp=0,
        )
        result = jks.KeyStore.new('jks', [entry]).saves(password)
        return Response(result, mimetype='application/x-java-keystore', headers={
            'Content-Disposition': f'attachment; filename="{filename}.jks"',
        })
    except ValueError as exc:
        logger.warning('Private-key export rejected: %s', exc)
        return error_response(str(exc), 400)
    except Exception as exc:
        logger.exception('Private-key export failed: %s', exc.__class__.__name__)
        return error_response('Private-key export failed', 500)
