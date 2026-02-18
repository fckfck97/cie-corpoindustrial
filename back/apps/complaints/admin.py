from django.contrib import admin
from .models import Complaints
from import_export.admin import ImportExportModelAdmin
from unfold.admin import ModelAdmin
@admin.register(Complaints)
class ComplaintsAdmin(ImportExportModelAdmin, ModelAdmin):
    list_display = ('id', 'type_complaint', 'description', 'user', 'created', 'updated')
    search_fields = ('type_complaint', 'description', 'user__username')
    list_filter = ('type_complaint', 'created', 'updated')
    date_hierarchy = 'created'

    def get_export_fields(self):
        fields = super(ComplaintsAdmin, self).get_export_fields()
        additional_fields = ['user__username', 'user__email']  # Ejemplo de campos adicionales
        return fields + additional_fields

    # Si quieres personalizar aún más, puedes sobrescribir métodos como get_queryset
    # def get_queryset(self, request):
    #     qs = super().get_queryset(request)
    #     # Personaliza el queryset si es necesario
    #     return qs
