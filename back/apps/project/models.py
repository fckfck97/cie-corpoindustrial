from django.db import models
from django.conf import settings
User = settings.AUTH_USER_MODEL
import uuid
from ckeditor.fields import RichTextField

class Project(models.Model):
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
    amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    department = models.CharField(max_length=255)
    municipality = models.CharField(max_length=255)
    
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(User, related_name="projects", on_delete=models.CASCADE)
    image = models.ImageField(upload_to='projects/')
    status = models.CharField(max_length=10, choices=options_status, default='published')
    priority = models.CharField(max_length=10, choices=options_priority, default='Baja')
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name_plural = 'Proyectos'
        verbose_name = 'Proyecto'
        ordering = ['-created']

    def __str__(self):
        return self.title

class ProjectApplication(models.Model):
    id = models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True)
    project = models.ForeignKey(Project, related_name='applications', on_delete=models.CASCADE)
    applicant = models.ForeignKey(User, related_name='project_applications', on_delete=models.SET_NULL, null=True, blank=True)
    
    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True, null=True)
    message = models.TextField(blank=True, null=True)
    capital_investment = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Postulación a Proyecto'
        verbose_name_plural = 'Postulaciones a Proyectos'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} - {self.project.title}"
