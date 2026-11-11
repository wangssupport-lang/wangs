import os
import io
import base64
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def is_cloudinary_configured():
    """
    Checks if Cloudinary credentials are provided via CLOUDINARY_URL or separate keys.
    """
    if os.environ.get('CLOUDINARY_URL') or getattr(settings, 'CLOUDINARY_URL', None):
        return True
    cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME') or getattr(settings, 'CLOUDINARY_CLOUD_NAME', None)
    api_key = os.environ.get('CLOUDINARY_API_KEY') or getattr(settings, 'CLOUDINARY_API_KEY', None)
    api_secret = os.environ.get('CLOUDINARY_API_SECRET') or getattr(settings, 'CLOUDINARY_API_SECRET', None)
    return bool(cloud_name and api_key and api_secret)

def init_cloudinary():
    """
    Initializes Cloudinary configuration with provided credentials.
    """
    try:
        import cloudinary
        cloudinary_url = os.environ.get('CLOUDINARY_URL') or getattr(settings, 'CLOUDINARY_URL', None)
        if cloudinary_url:
            cloudinary.config(cloudinary_url=cloudinary_url)
            return True

        cloud_name = os.environ.get('CLOUDINARY_CLOUD_NAME') or getattr(settings, 'CLOUDINARY_CLOUD_NAME', None)
        api_key = os.environ.get('CLOUDINARY_API_KEY') or getattr(settings, 'CLOUDINARY_API_KEY', None)
        api_secret = os.environ.get('CLOUDINARY_API_SECRET') or getattr(settings, 'CLOUDINARY_API_SECRET', None)

        if cloud_name and api_key and api_secret:
            cloudinary.config(
                cloud_name=cloud_name,
                api_key=api_key,
                api_secret=api_secret,
                secure=True
            )
            return True
        return False
    except Exception as exc:
        logger.warning("Cloudinary initialization failed: %s", exc)
        return False

def upload_image_to_cloudinary(file_source, folder="wangs/products", public_id=None):
    """
    Uploads an image (raw bytes, base64 data URI, file path, or URL) to Cloudinary.
    Returns the secure HTTPS URL on success, or None on failure.
    """
    if not is_cloudinary_configured():
        return None

    try:
        import cloudinary
        import cloudinary.uploader

        if not init_cloudinary():
            return None

        upload_options = {
            "folder": folder,
            "resource_type": "image",
            "overwrite": True,
        }
        if public_id:
            upload_options["public_id"] = public_id

        # Handle base64 data URI or raw bytes
        if isinstance(file_source, bytes):
            result = cloudinary.uploader.upload(io.BytesIO(file_source), **upload_options)
        else:
            result = cloudinary.uploader.upload(file_source, **upload_options)

        secure_url = result.get("secure_url") or result.get("url")
        if secure_url:
            logger.info("Successfully uploaded image to Cloudinary: %s", secure_url)
            return secure_url
        return None
    except Exception as exc:
        logger.error("Failed to upload image to Cloudinary: %s", exc)
        return None
