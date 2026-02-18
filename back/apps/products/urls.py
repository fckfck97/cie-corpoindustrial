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
    path('product/list/', ProductView.as_view(), name='product-list'),
    path('product/<uuid:pk>/', ProductView.as_view(), name='product-detail'),
    path('product/edit/<uuid:pk>/', ProductView.as_view(), name='product-edit'),
    path('product/create/', ProductView.as_view(), name='product-create'),
    
    path('product/dashboard/', ProductDashboard.as_view(), name='product-dashboard'),
    path('employee/benefits/', EmployeeBenefitsListView.as_view(), name='employee-benefits'),
    path('product/<uuid:pk>/redeem/', ProductRedeemView.as_view(), name='product-redeem'),
    path('enterprise/benefits/qr/', EnterpriseBenefitsQrView.as_view(), name='enterprise-benefits-qr'),
    path('enterprise/benefits/redemptions/', EnterpriseBenefitRedemptionsReportView.as_view(), name='enterprise-benefits-redemptions'),
    path('employee/benefits/redemptions/', EmployeeBenefitRedemptionsView.as_view(), name='employee-benefits-redemptions'),
    path('api/admin/benefits/redemptions/', AdminBenefitRedemptionsReportView.as_view(), name='admin-benefits-redemptions'),
]
