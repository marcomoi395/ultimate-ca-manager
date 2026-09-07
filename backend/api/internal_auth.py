import hmac
import os

from flask import Blueprint, request

from auth.unified import AuthManager
from utils.response import error_response, success_response


bp = Blueprint('internal_auth', __name__)


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
