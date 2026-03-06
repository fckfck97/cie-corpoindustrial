from django.urls import path
from .views import (
    ProjectView,
    ProjectMainView,
    ApplyProjectView,
    AdminApplicationsView,
    EnterpriseApplicationsView,
    LicitationView,
    LicitationMainView,
    ApplyLicitationView,
    AdminLicitationApplicationsView,
    EnterpriseLicitationApplicationsView,
)

urlpatterns = [
    path('api/projects/', ProjectView.as_view()),
    path('api/projects/<str:pk>/', ProjectView.as_view()),
    path('api/projects-list/', ProjectMainView.as_view()),
    path('api/projects-list/<str:pk>/', ProjectView.as_view()),
    path('api/projects-apply/', ApplyProjectView.as_view()),
    path('api/projects-applications/admin/', AdminApplicationsView.as_view()),
    path('api/projects-applications/enterprise/', EnterpriseApplicationsView.as_view()),
    path('api/licitations/', LicitationView.as_view()),
    path('api/licitations/<str:pk>/', LicitationView.as_view()),
    path('api/licitations-list/', LicitationMainView.as_view()),
    path('api/licitations-list/<str:pk>/', LicitationView.as_view()),
    path('api/licitations-apply/', ApplyLicitationView.as_view()),
    path('api/licitations-applications/admin/', AdminLicitationApplicationsView.as_view()),
    path('api/licitations-applications/enterprise/', EnterpriseLicitationApplicationsView.as_view()),
]
