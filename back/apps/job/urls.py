from .views import (
    JobBoardView, 
    JobDashboardView, 
    JobMainView, 
    EmployeeJobsListView,
    ApplyJobView,
    EnterpriseApplicationsView,
    EmployeeApplicationsView,
)
from django.urls import path

urlpatterns = [
    path('api/job/list/', JobBoardView.as_view(), name='jobboard-list'),
    path('api/job/<uuid:pk>/', JobBoardView.as_view(), name='jobboard-detail'),
    path('api/job/edit/<uuid:pk>/', JobBoardView.as_view(), name='jobboard-edit'),
    path('api/job/create/', JobBoardView.as_view(), name='jobboard-create'),
    
    path('api/job/dashboard/', JobDashboardView.as_view(), name='jobboard-dashboard'),

    path('api/job/main/', JobMainView.as_view(), name='jobboard-main'),
    path('api/job/main/<uuid:pk>/', JobMainView.as_view(), name='jobboard-main-detail'),
    path('api/employee/jobs/', EmployeeJobsListView.as_view(), name='employee-jobs'),
    
    # Applications
    path('api/applications/create/', ApplyJobView.as_view(), name='application-create'),
    path('api/enterprise/applications/', EnterpriseApplicationsView.as_view(), name='enterprise-applications'),
    path('api/employee/applications/', EmployeeApplicationsView.as_view(), name='employee-applications'),
]
