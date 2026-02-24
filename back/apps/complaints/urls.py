

from .views import ComplaintsView
from django.urls import path
urlpatterns = [
  path('api/complaints/list/', ComplaintsView.as_view(), name='complaints-list'),
  path('api/complaints/<uuid:pk>/', ComplaintsView.as_view(), name='complaints-detail'),
  path('api/complaints/create/', ComplaintsView.as_view(), name='complaints-create'),
  path('api/complaints/edit/<uuid:pk>/', ComplaintsView.as_view(), name='complaints-edit'),
]
