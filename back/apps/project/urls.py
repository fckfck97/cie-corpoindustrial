from django.urls import path
from .views import (
    ProjectView,
    ProjectMainView,
    ApplyProjectView,
    AdminApplicationsView,
    EnterpriseApplicationsView
)

urlpatterns = [
    path('api/projects/', ProjectView.as_view()),
    path('api/projects/<str:pk>/', ProjectView.as_view()),
    path('api/projects-list/', ProjectMainView.as_view()),
    path('api/projects-list/<str:pk>/', ProjectView.as_view()),
    path('api/projects-apply/', ApplyProjectView.as_view()),
    path('api/projects-applications/admin/', AdminApplicationsView.as_view()),
    path('api/projects-applications/enterprise/', EnterpriseApplicationsView.as_view()),
]
