from django.db import models
import uuid
from django.conf import settings
import os
from .utils.mail import send_complaint_email
from django.contrib.auth import get_user_model

User = get_user_model()
from django.db.models.signals import post_save
from django.dispatch import receiver
import threading
TYPE_COMPLAINTS = (
    ("Robo", "Robo"),
    ("Fraude", "Fraude"),
    ("Estafa", "Estafa"),
    ("Otro", "Otro")
)

def image_complaints_directory_path(instance, filename):
    img = '{0}/{1}/{2}/{3}'.format(
        instance.type_complaint, instance.user.enterprise, instance.user.nuip, filename)
    full_path = os.path.join(settings.MEDIA_ROOT, img)
    if os.path.exists(full_path):
        os.remove(full_path)
    return img

class Complaints(models.Model):
    id = models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True)
    type_complaint = models.CharField(
        max_length=20, choices=TYPE_COMPLAINTS, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    picture = models.ImageField(
        upload_to=image_complaints_directory_path, blank=True, null=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE,
                             null=True, blank=True, related_name='complaints')
    created = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated = models.DateTimeField(auto_now=True, null=True, blank=True)\
      
    def __str__(self):
        return f'{self.type_complaint}'
      
    class Meta:
        verbose_name = "Denuncia"
        verbose_name_plural = "Denuncias"
        ordering = ['-created']


@receiver(post_save, sender=Complaints)
def send_email_notification(sender, instance, created, **kwargs):
    if created:
        # Definir una función para enviar el correo electrónico
        def send_email():
            users = User.objects.all()
            complaint_details = f"{instance.type_complaint} - {instance.description[:50]}..."  # Resumen de la denuncia
            for user in users:
                send_complaint_email(user.email, complaint_details)
        # Crear un hilo para enviar el correo electrónico
        email_thread = threading.Thread(target=send_email)
        email_thread.start()
