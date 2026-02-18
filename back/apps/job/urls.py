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
    path('job/list/', JobBoardView.as_view(), name='jobboard-list'),
    path('job/<uuid:pk>/', JobBoardView.as_view(), name='jobboard-detail'),
    path('job/edit/<uuid:pk>/', JobBoardView.as_view(), name='jobboard-edit'),
    path('job/create/', JobBoardView.as_view(), name='jobboard-create'),
    
    path('job/dashboard/', JobDashboardView.as_view(), name='jobboard-dashboard'),

    path('job/main/', JobMainView.as_view(), name='jobboard-main'),
    path('job/main/<uuid:pk>/', JobMainView.as_view(), name='jobboard-main-detail'),
    path('employee/jobs/', EmployeeJobsListView.as_view(), name='employee-jobs'),
    
    # Applications
    path('applications/create/', ApplyJobView.as_view(), name='application-create'),
    path('enterprise/applications/', EnterpriseApplicationsView.as_view(), name='enterprise-applications'),
    path('employee/applications/', EmployeeApplicationsView.as_view(), name='employee-applications'),
]
