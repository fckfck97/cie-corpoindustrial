from .views import (
    ProductView,
    ProductDashboard,
    EmployeeBenefitsListView,
    ProductRedeemView,
    EnterpriseBenefitsQrView,
    EnterpriseBenefitRedemptionsReportView,
    EmployeeBenefitRedemptionsView,
    AdminBenefitRedemptionsReportView,
)
from django.urls import path
urlpatterns = [
    path('api/product/list/', ProductView.as_view(), name='product-list'),
    path('api/product/<uuid:pk>/', ProductView.as_view(), name='product-detail'),
    path('api/product/edit/<uuid:pk>/', ProductView.as_view(), name='product-edit'),
    path('api/product/create/', ProductView.as_view(), name='product-create'),
    
    path('api/product/dashboard/', ProductDashboard.as_view(), name='product-dashboard'),
    path('api/employee/benefits/', EmployeeBenefitsListView.as_view(), name='employee-benefits'),
    path('api/product/<uuid:pk>/redeem/', ProductRedeemView.as_view(), name='product-redeem'),
    path('api/enterprise/benefits/qr/', EnterpriseBenefitsQrView.as_view(), name='enterprise-benefits-qr'),
    path('api/enterprise/benefits/redemptions/', EnterpriseBenefitRedemptionsReportView.as_view(), name='enterprise-benefits-redemptions'),
    path('api/employee/benefits/redemptions/', EmployeeBenefitRedemptionsView.as_view(), name='employee-benefits-redemptions'),
    path('api/admin/benefits/redemptions/', AdminBenefitRedemptionsReportView.as_view(), name='admin-benefits-redemptions'),
]
