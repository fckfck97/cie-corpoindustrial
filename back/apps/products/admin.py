from django.contrib import admin
from .models import Product, ProductRedemption, ProductViewLog
from unfold.admin import ModelAdmin


@admin.register(Product)
class ProductAdmin(ModelAdmin):
    list_display = ('id', 'name', 'user', 'category', 'subcategory', 'views', 'redemptions_total', 'created', 'updated')
    list_filter = ('category', 'subcategory', 'extracategory', 'created', 'updated')
    search_fields = ('name', 'category', 'subcategory', 'extracategory', 'user__email', 'user__enterprise')
    readonly_fields = ('created', 'updated')

    fieldsets = (
        ('Product Information', {
            'fields': ('name', 'description', 'image')
        }),
        ('Additional Information', {
            'fields': ('category', 'subcategory', 'extracategory')
        }),
        ('Status', {
            'fields': ('finished', 'views')
        }),
        ('User Information', {
            'fields': ('user',)
        }),
        ('Timestamps', {
            'fields': ('created', 'updated')
        })
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return self.readonly_fields + ('user',)
        return self.readonly_fields

    def save_model(self, request, obj, form, change):
        if not obj.user:
            obj.user = request.user
        super().save_model(request, obj, form, change)

    def redemptions_total(self, obj):
        return obj.redemptions.count()
    redemptions_total.short_description = 'Canjes'


@admin.register(ProductRedemption)
class ProductRedemptionAdmin(ModelAdmin):
    list_display = ('id', 'product', 'product_name_snapshot', 'enterprise', 'employee', 'redeemed_date', 'redeemed_at')
    list_filter = ('redeemed_date', 'redeemed_at', 'enterprise')
    search_fields = (
        'product__name',
        'product_name_snapshot',
        'enterprise__email',
        'enterprise__enterprise',
        'employee__email',
        'employee__first_name',
        'employee__last_name',
    )
    readonly_fields = ('redeemed_date', 'redeemed_at', 'product_id_snapshot', 'product_name_snapshot', 'enterprise_name_snapshot')


@admin.register(ProductViewLog)
class ProductViewLogAdmin(ModelAdmin):
    list_display = ('id', 'product', 'viewer', 'viewed_at')
    list_filter = ('viewed_at', 'product')
    search_fields = ('product__name', 'viewer__email', 'viewer__first_name', 'viewer__last_name')
    readonly_fields = ('viewed_at',)
