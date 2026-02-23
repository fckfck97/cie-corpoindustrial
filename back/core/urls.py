from django.contrib import admin
from django.urls import path, include
from django.conf.urls.static import static
from django.conf import settings

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),
    #Auth Djoser
    path('auth/', include('djoser.urls')),
    path('auth/', include('djoser.urls.jwt')),
    path('auth/', include('djoser.social.urls')),
    path('', include('apps.user.urls')),
    path('', include('apps.products.urls')),
    path('', include('apps.job.urls')),
    path('', include('apps.project.urls')),
    path('', include('apps.complaints.urls')),


] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
