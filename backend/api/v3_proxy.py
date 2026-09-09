"""Proxy read-only v3 requests to the EJBCA gateway."""

import os
from urllib.parse import urlencode

import requests
from flask import Blueprint, Response, request

v3_proxy_bp = Blueprint('v3_proxy', __name__)


def _proxy(resource, suffix):
    gateway_url = os.getenv('EJBCA_GATEWAY_URL', 'http://ejbca-gateway:8081').rstrip('/')
    path = f'/api/v3/{resource}' + (f'/{suffix}' if suffix else '')
    query = urlencode(request.args, doseq=True)
    url = f'{gateway_url}{path}' + (f'?{query}' if query else '')
    headers = {'Accept': 'application/json'}
    for name in ('Cookie', 'X-API-Key'):
        value = request.headers.get(name)
        if value:
            headers[name] = value

    upstream = requests.get(url, headers=headers, timeout=30)
    response_headers = {
        name: value for name, value in upstream.headers.items()
        if name.lower() in ('content-type', 'cache-control')
    }
    return Response(upstream.content, status=upstream.status_code, headers=response_headers)


@v3_proxy_bp.route('/api/v3/certificates', defaults={'suffix': ''}, methods=['GET'], strict_slashes=False)
@v3_proxy_bp.route('/api/v3/certificates/<path:suffix>', methods=['GET'], strict_slashes=False)
def certificates_proxy(suffix):
    return _proxy('certificates', suffix)


@v3_proxy_bp.route('/api/v3/cas', defaults={'suffix': ''}, methods=['GET'], strict_slashes=False)
@v3_proxy_bp.route('/api/v3/cas/<path:suffix>', methods=['GET'], strict_slashes=False)
def cas_proxy(suffix):
    return _proxy('cas', suffix)
