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


class LicitationOpportunity(models.Model):
    options_status = (
        ('draft', 'Draft'),
        ('published', 'Published'),
    )
    options_priority = (
        ("Baja", "Baja"),
        ("Media", "Media"),
        ("Alta", "Alta")
    )
    options_opportunity_type = (
        ("licitacion_publica", "Licitación pública"),
        ("contratacion_privada", "Contratación privada"),
        ("alianza_empresarial", "Alianza empresarial"),
        ("proyecto_inversion", "Proyecto de inversión"),
        ("proveedor_estrategico", "Proveedor estratégico"),
    )

    id = models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True)
    title = models.CharField(max_length=255)
    economic_sector = models.CharField(max_length=255, blank=True, null=True)
    opportunity_type = models.CharField(
        max_length=40,
        choices=options_opportunity_type,
        default="licitacion_publica",
    )
    contracting_entity = models.CharField(max_length=255, blank=True, null=True)
    general_scope = models.TextField(blank=True, null=True)
    estimated_value = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    required_company_type = models.CharField(max_length=255, blank=True, null=True)
    description = RichTextField(blank=True, null=True)
    department = models.CharField(max_length=255)
    municipality = models.CharField(max_length=255)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(User, related_name="licitations", on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=options_status, default='published')
    priority = models.CharField(max_length=10, choices=options_priority, default='Baja')
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name_plural = 'Licitaciones'
        verbose_name = 'Licitación'
        ordering = ['-created']

    def __str__(self):
        return self.title


class LicitationApplication(models.Model):
    options_interest_type = (
        ("liderar", "Liderar"),
        ("participar", "Participar"),
        ("proveer", "Proveer"),
    )

    id = models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True)
    licitation = models.ForeignKey(LicitationOpportunity, related_name='applications', on_delete=models.CASCADE)
    applicant = models.ForeignKey(User, related_name='licitation_applications', on_delete=models.SET_NULL, null=True, blank=True)

    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    company_name = models.CharField(max_length=255, blank=True, null=True)
    company_sector = models.CharField(max_length=255, blank=True, null=True)
    relevant_experience = models.TextField(blank=True, null=True)
    interest_type = models.CharField(
        max_length=20,
        choices=options_interest_type,
        default="participar",
    )
    phone = models.CharField(max_length=50, blank=True, null=True)
    message = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Postulación a Licitación'
        verbose_name_plural = 'Postulaciones a Licitaciones'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.full_name} - {self.licitation.title}"
