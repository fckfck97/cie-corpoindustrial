from .views import (
    UserView,
    EnterprisesProfile,
    OTPLoginRequestWebView,
    OTPLoginVerifyWebView,
    EnterpriseBillingDashboardView,
    EnterpriseBillingGenerateView,
    EnterpriseBillingActivationCronView,
    EnterpriseMonthlyPaymentMarkPaidView,
    EnterpriseBillingReportView,
    EnterpriseOwnPaymentsView,
    EnterprisePaymentDelinquencyNotificationsView,
    EmployeeEnterpriseDetailView,
    EmployeeDashboardView,
    EmployeeCompaniesListView,
)
from django.urls import path
urlpatterns = [
    path('api/employee/list/', UserView.as_view(), name='employee-list'),
    path('api/employee/<uuid:pk>/', UserView.as_view(), name='employee-detail'),
    path('api/employee/edit/<uuid:pk>/', UserView.as_view(), name='employee-edit'),

    path('api/enterprise/profile/<uuid:pk>/',EnterprisesProfile.as_view(), name='enterprise-profile'),
    path('api/enterprise/profile/edit/<uuid:pk>/',EnterprisesProfile.as_view(), name='enterprise-edit'),
    
    path('authentication/login/otp/request/web/', OTPLoginRequestWebView.as_view(), name='otp-login-request-web'),
    path('authentication/login/otp/verify/', OTPLoginVerifyWebView.as_view(), name='otp-login-verify-web'),
    path('api/billing/enterprises/', EnterpriseBillingDashboardView.as_view(), name='billing-enterprises'),
    path('api/billing/generate/', EnterpriseBillingGenerateView.as_view(), name='billing-generate'),
    path('api/billing/activate/', EnterpriseBillingActivationCronView.as_view(), name='billing-activate'),
    path('api/billing/payments/<int:payment_id>/mark-paid/', EnterpriseMonthlyPaymentMarkPaidView.as_view(), name='billing-mark-paid'),
    path('api/billing/report/', EnterpriseBillingReportView.as_view(), name='billing-report'),
    path('api/billing/notifications/delinquency/', EnterprisePaymentDelinquencyNotificationsView.as_view(), name='billing-delinquency-notifications'),
    path('api/billing/my-payments/', EnterpriseOwnPaymentsView.as_view(), name='billing-my-payments'),
    path('api/employee/dashboard/', EmployeeDashboardView.as_view(), name='employee-dashboard'),
    path('api/employee/companies/', EmployeeCompaniesListView.as_view(), name='employee-companies'),
    path('api/employee/portal/enterprises/<uuid:enterprise_id>/', EmployeeEnterpriseDetailView.as_view(), name='employee-enterprise-detail'),
]
