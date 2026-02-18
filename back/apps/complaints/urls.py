

from .views import ComplaintsView
from django.urls import path
urlpatterns = [
  path('complaints/list/', ComplaintsView.as_view(), name='complaints-list'),
  path('complaints/<uuid:pk>/', ComplaintsView.as_view(), name='complaints-detail'),
  path('complaints/create/', ComplaintsView.as_view(), name='complaints-create'),
  path('complaints/edit/<uuid:pk>/', ComplaintsView.as_view(), name='complaints-edit'),
]