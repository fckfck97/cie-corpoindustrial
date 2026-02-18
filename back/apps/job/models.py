from django.db import models
from django.conf import settings
User = settings.AUTH_USER_MODEL
import uuid
from ckeditor.fields import RichTextField


class JobBoard(models.Model):
    options_status = (
        ('draft', 'Draft'),
        ('published', 'Published'),
    )
    options_priority = (
        ("Baja", "Baja"),
        ("Media", "Media"),
        ("Alta", "Alta")
    )
    id = models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True)
    title = models.CharField(max_length=255)
    description = RichTextField(blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(User, related_name="job_board", on_delete=models.CASCADE)
    image = models.ImageField(upload_to='jobBoard/')
    status =        models.CharField(max_length=10, choices=options_status, default='published')
    priority =      models.CharField(max_length=10, choices=options_priority, default='Baja')
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name_plural = 'Bolsa de empleo'
        verbose_name = 'Bolsa de empleo'
        ordering = ['-created']
    def __str__(self):
        return self.title

class JobApplication(models.Model):
    id = models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True)
    job = models.ForeignKey(JobBoard, related_name='applications', on_delete=models.CASCADE)
    applicant = models.ForeignKey(User, related_name='applications', on_delete=models.SET_NULL, null=True, blank=True)
    
    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True, null=True)
    cv = models.FileField(upload_to='jobBoard/cvs/')
    cover_letter = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Postulación'
        verbose_name_plural = 'Postulaciones'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} - {self.job.title}"
      
    