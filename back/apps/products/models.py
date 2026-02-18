from django.db import models
from django.conf import settings
User = settings.AUTH_USER_MODEL
import uuid
from django.utils import timezone

class Product(models.Model):
    id =                models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True)
    name = models.CharField(max_length=200)
    description = models.TextField(null=True, blank=True)
    # price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    image = models.ImageField(upload_to='products/')
    # quantity = models.IntegerField(default=0, null=True, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE,null=True, blank=True, related_name='products')
    created = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated = models.DateTimeField(auto_now=True, null=True, blank=True)
    finished = models.BooleanField(default=False, null=True, blank=True)
    views = models.IntegerField(default=0, null=True, blank=True)
    category = models.CharField(max_length=20, null=True, blank=True)
    subcategory = models.CharField(max_length=20, null=True, blank=True)
    extracategory = models.CharField(max_length=20, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated = models.DateTimeField(auto_now=True, null=True, blank=True)
    
    def __str__(self):
        return self.name


class ProductRedemption(models.Model):
    id = models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True)
    product = models.ForeignKey(
        Product,
        related_name='redemptions',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    employee = models.ForeignKey(User, related_name='benefit_redemptions', on_delete=models.CASCADE)
    enterprise = models.ForeignKey(User, related_name='benefit_redemptions_received', on_delete=models.CASCADE)
    product_id_snapshot = models.UUIDField(null=True, blank=True)
    product_name_snapshot = models.CharField(max_length=200, blank=True, default='')
    enterprise_name_snapshot = models.CharField(max_length=200, blank=True, default='')
    redeemed_date = models.DateField(default=timezone.localdate, db_index=True)
    redeemed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Canje de Beneficio'
        verbose_name_plural = 'Canjes de Beneficios'
        ordering = ['-redeemed_at']
        unique_together = ('product', 'employee', 'redeemed_date')

    def __str__(self):
        product_name = self.product.name if self.product else self.product_name_snapshot
        return f"{self.employee} -> {product_name}"


class ProductViewLog(models.Model):
    id = models.UUIDField(default=uuid.uuid4, unique=True, primary_key=True)
    product = models.ForeignKey(Product, related_name='view_logs', on_delete=models.CASCADE)
    viewer = models.ForeignKey(User, related_name='benefit_view_logs', on_delete=models.CASCADE)
    viewed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Visualización de Beneficio'
        verbose_name_plural = 'Visualizaciones de Beneficios'
        ordering = ['-viewed_at']
        unique_together = ('product', 'viewer')

    def __str__(self):
        return f"{self.viewer} vio {self.product.name}"
