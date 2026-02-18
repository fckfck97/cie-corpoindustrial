from django.conf import settings
import os 
import uuid
def image_rut_directory_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f'{uuid.uuid4()}.{ext}'
    file_path = os.path.join('users', 'files', filename)
    full_path = os.path.join(settings.MEDIA_ROOT, file_path)
    if os.path.exists(full_path):
        os.remove(full_path)
    return file_path

def image_picture_directory_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f'{uuid.uuid4()}.{ext}'
    file_path = os.path.join('users', 'pictures', filename)
    full_path = os.path.join(settings.MEDIA_ROOT, file_path)
    if os.path.exists(full_path):
        os.remove(full_path)
    return file_path

def image_banner_directory_path(instance, filename):
    ext = filename.split('.')[-1]
    filename = f'{uuid.uuid4()}.{ext}'
    file_path = os.path.join('users', 'banner', filename)
    full_path = os.path.join(settings.MEDIA_ROOT, file_path)
    if os.path.exists(full_path):
        os.remove(full_path)
    return file_path
