from rest_framework import permissions

class IsEnterpriseOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.method in permissions.SAFE_METHODS or
            request.user and request.user.role == 'enterprise'
        )

# Siguiente paso: Implementar las clases de serialización en serializers.py
