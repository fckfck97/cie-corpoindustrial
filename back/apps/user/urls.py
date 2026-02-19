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
    path('employee/list/', UserView.as_view(), name='employee-list'),
    path('employee/<uuid:pk>/', UserView.as_view(), name='employee-detail'),
    path('employee/edit/<uuid:pk>/', UserView.as_view(), name='employee-edit'),

    path('enterprise/profile/<uuid:pk>/',EnterprisesProfile.as_view(), name='enterprise-profile'),
    path('enterprise/profile/edit/<uuid:pk>/',EnterprisesProfile.as_view(), name='enterprise-edit'),
    
    path('auth/login/otp/request/web/', OTPLoginRequestWebView.as_view(), name='otp-login-request-web'),
    path('auth/login/otp/verify/', OTPLoginVerifyWebView.as_view(), name='otp-login-verify-web'),
    path('billing/enterprises/', EnterpriseBillingDashboardView.as_view(), name='billing-enterprises'),
    path('billing/generate/', EnterpriseBillingGenerateView.as_view(), name='billing-generate'),
    path('billing/activate/', EnterpriseBillingActivationCronView.as_view(), name='billing-activate'),
    path('billing/payments/<int:payment_id>/mark-paid/', EnterpriseMonthlyPaymentMarkPaidView.as_view(), name='billing-mark-paid'),
    path('billing/report/', EnterpriseBillingReportView.as_view(), name='billing-report'),
    path('billing/notifications/delinquency/', EnterprisePaymentDelinquencyNotificationsView.as_view(), name='billing-delinquency-notifications'),
    path('billing/my-payments/', EnterpriseOwnPaymentsView.as_view(), name='billing-my-payments'),
    path('employee/dashboard/', EmployeeDashboardView.as_view(), name='employee-dashboard'),
    path('employee/companies/', EmployeeCompaniesListView.as_view(), name='employee-companies'),
    path('employee/portal/enterprises/<uuid:enterprise_id>/', EmployeeEnterpriseDetailView.as_view(), name='employee-enterprise-detail'),
]
