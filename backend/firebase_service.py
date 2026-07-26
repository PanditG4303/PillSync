import os
import json
import logging

logger = logging.getLogger("pillsync-firebase")

_firebase_app = None


def _resolve_credential_path():
    path = os.getenv("FCM_CREDENTIALS_PATH", "")
    if path and not os.path.isabs(path):
        resolved = os.path.join(os.path.dirname(os.path.abspath(__file__)), path)
        return resolved
    return path


def _get_credential_json():
    return os.getenv("FCM_CREDENTIALS_JSON", "")


def get_firebase_app():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError:
        logger.warning("[FCM] firebase-admin not installed")
        return None

    if firebase_admin._apps:
        _firebase_app = list(firebase_admin._apps.values())[0]
        logger.info("[FCM] Using existing Firebase app")
        return _firebase_app

    fcm_path = _resolve_credential_path()
    fcm_json = _get_credential_json()

    try:
        if fcm_path and os.path.exists(fcm_path):
            cred = credentials.Certificate(fcm_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("[FCM] Firebase Admin initialized successfully")
        elif fcm_json:
            try:
                cred_dict = json.loads(fcm_json)
            except json.JSONDecodeError:
                logger.warning("[FCM] FCM_CREDENTIALS_JSON is not valid JSON - use FCM_CREDENTIALS_PATH instead")
                return None
            cred = credentials.Certificate(cred_dict)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("[FCM] Firebase Admin initialized successfully")
        else:
            logger.warning("[FCM] No Firebase credentials found - FCM notifications disabled")
            return None
    except Exception as e:
        logger.error(f"[FCM] Firebase initialization failed: {e}")
        return None

    return _firebase_app


def send_fcm_notification(token: str, title: str, body: str, data: dict = None):
    app = get_firebase_app()
    if app is None:
        logger.warning("[FCM] Firebase not configured, cannot send notification")
        return False

    try:
        from firebase_admin import messaging

        message = messaging.Message(
            data={"title": title, "body": body, **(data or {})},
            token=token,
        )
        response = messaging.send(message)
        logger.info("[FCM] Notification sent successfully")
        return True
    except Exception as e:
        logger.error(f"[FCM] Notification failed: {e}")
        return False
