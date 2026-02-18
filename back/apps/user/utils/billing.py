import calendar
import re
from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone

from ..models import EnterpriseMonthlyPayment, UserAccount


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def month_end_date(year: int, month: int) -> date:
    last_day = calendar.monthrange(year, month)[1]
    return date(year, month, last_day)


def months_for_payment_cycle(reference: date):
    # Ciclo anual: mes actual + meses restantes del anio.
    # Adicionalmente incluye el mes anterior solo si pertenece al mismo anio.
    # Ejemplo en febrero: enero, febrero, ... diciembre.
    months = []
    if reference.month > 1:
        months.append((reference.year, reference.month - 1))
    months.extend((reference.year, month) for month in range(reference.month, 13))
    return months


def previous_year_month(year: int, month: int):
    if month == 1:
        return year - 1, 12
    return year, month - 1


def can_register_payment_today(payment: EnterpriseMonthlyPayment, today: date):
    # Regla:
    # - siempre se puede registrar mes actual y anterior.
    # - meses futuros se liberan al último día del mes inmediatamente anterior.
    current_key = today.year * 100 + today.month
    payment_key = payment.year * 100 + payment.month

    if payment_key <= current_key:
        return True

    prev_year, prev_month = previous_year_month(payment.year, payment.month)
    release_date = month_end_date(prev_year, prev_month)
    return today >= release_date


def parse_bool_value(raw_value):
    if isinstance(raw_value, bool):
        return raw_value
    return str(raw_value or "").strip().lower() in {"1", "true", "yes", "on", "si"}


def normalize_sms_phone(raw_phone: str):
    if not raw_phone:
        return None
    digits = re.sub(r"\D", "", raw_phone)
    if not digits:
        return None
    if raw_phone.strip().startswith("+"):
        normalized = f"+{digits}"
        return normalized if len(digits) >= 10 else None
    if len(digits) == 10:
        return f"+57{digits}"
    if len(digits) == 12 and digits.startswith("57"):
        return f"+{digits}"
    return None


def payment_notification_stage(payment: EnterpriseMonthlyPayment, today: date):
    if payment.status == EnterpriseMonthlyPayment.STATUS_PAID:
        return None

    due_date = payment.due_date
    days_to_due = (due_date - today).days
    days_after_due = (today - due_date).days

    if days_to_due == 2:
        return 1
    if days_to_due == 1:
        return 2
    if days_to_due == 0:
        return 3
    if days_after_due == 1 and today <= payment.grace_date:
        return 4
    if days_after_due >= 2:
        return 5
    return None


def payment_stage_messages(payment: EnterpriseMonthlyPayment, stage: int, today: date):
    enterprise_name = payment.enterprise.enterprise or payment.enterprise.username or payment.enterprise.email
    period = f"{payment.month:02d}/{payment.year}"
    amount = f"{payment.amount}"
    due_str = payment.due_date.strftime("%Y-%m-%d")
    grace_str = payment.grace_date.strftime("%Y-%m-%d")
    blocked = today > payment.grace_date

    stage_map = {
        1: {
            "label": "Vence en 2 dias",
            "subject": f"[Inside] Tu pago vence en 2 dias ({period})",
            "email": (
                f"Hola {enterprise_name},\n\n"
                f"Tu pago mensual ({period}) por valor de {amount} vence el {due_str}.\n"
                "Te recomendamos pagarlo para evitar bloqueos.\n\n"
                "Equipo Inside"
            ),
            "sms": f"Inside: Tu pago {period} por {amount} vence en 2 dias ({due_str}).",
        },
        2: {
            "label": "Vence en 1 dia",
            "subject": f"[Inside] Recordatorio: tu pago vence manana ({period})",
            "email": (
                f"Hola {enterprise_name},\n\n"
                f"Recordatorio: tu pago mensual ({period}) por {amount} vence manana ({due_str}).\n"
                "Si no se registra, podrias entrar en mora.\n\n"
                "Equipo Inside"
            ),
            "sms": f"Inside: Recordatorio, tu pago {period} por {amount} vence manana.",
        },
        3: {
            "label": "Vence hoy",
            "subject": f"[Inside] Tu pago vence hoy ({period})",
            "email": (
                f"Hola {enterprise_name},\n\n"
                f"Hoy vence tu pago mensual ({period}) por {amount}.\n"
                f"Tienes plazo de gracia hasta el {grace_str}.\n\n"
                "Equipo Inside"
            ),
            "sms": f"Inside: Tu pago {period} vence hoy. Gracia hasta {grace_str}.",
        },
        4: {
            "label": "Dia 1 de gracia",
            "subject": f"[Inside] Estas en dia 1 de gracia ({period})",
            "email": (
                f"Hola {enterprise_name},\n\n"
                f"Tu pago mensual ({period}) por {amount} esta en dia 1 de gracia.\n"
                f"Fecha limite de gracia: {grace_str}.\n"
                "Si no pagas, tus usuarios perderan acceso temporal.\n\n"
                "Equipo Inside"
            ),
            "sms": f"Inside: Dia 1 de gracia para pago {period}. Limite {grace_str}.",
        },
        5: {
            "label": "Dia 2 de gracia / bloqueado",
            "subject": f"[Inside] Ultimo aviso de mora ({period})",
            "email": (
                f"Hola {enterprise_name},\n\n"
                f"Tu pago mensual ({period}) por {amount} esta en mora avanzada.\n"
                f"Limite de gracia: {grace_str}.\n"
                f"{'Tu empresa ya se encuentra bloqueada para acceso de usuarios.' if blocked else 'Hoy es el ultimo dia de gracia antes del bloqueo.'}\n\n"
                "Equipo Inside"
            ),
            "sms": (
                f"Inside: Mora en pago {period}. "
                + ("Empresa bloqueada por mora." if blocked else "Ultimo dia de gracia hoy.")
            ),
        },
    }
    return stage_map.get(stage)


def count_enterprise_employees(enterprise: UserAccount):
    refs = [str(enterprise.id), enterprise.enterprise, enterprise.username, enterprise.email]
    refs = [value for value in refs if value]
    if not refs:
        return 0
    return UserAccount.objects.filter(role="employees", enterprise__in=refs).count()


def resolve_enterprise_for_user(user: UserAccount):
    if user.role == "enterprise":
        return user
    if user.role != "employees":
        return None
    enterprise_ref = (user.enterprise or "").strip()
    if not enterprise_ref:
        return None

    # 1) Referencia por UUID en el campo enterprise.
    try:
        enterprise_by_id = UserAccount.objects.filter(
            role="enterprise",
            pk=enterprise_ref,
        ).first()
        if enterprise_by_id:
            return enterprise_by_id
    except Exception:
        pass

    # 2) Match por nombre de empresa.
    enterprise = UserAccount.objects.filter(
        role="enterprise",
        enterprise__iexact=enterprise_ref,
    ).first()
    if enterprise:
        return enterprise

    # 3) Fallback por username del usuario enterprise.
    enterprise = UserAccount.objects.filter(
        role="enterprise",
        username__iexact=enterprise_ref,
    ).first()
    if enterprise:
        return enterprise

    # 4) Fallback por email del usuario enterprise.
    enterprise = UserAccount.objects.filter(
        role="enterprise",
        email__iexact=enterprise_ref,
    ).first()
    if enterprise:
        return enterprise

    # 5) Fallback tolerante: comparar nombre normalizado (sin espacios/símbolos).
    def _normalize_name(value: str) -> str:
        return re.sub(r"[^a-z0-9]", "", (value or "").strip().lower())

    normalized_ref = _normalize_name(enterprise_ref)
    if normalized_ref:
        candidates = UserAccount.objects.filter(role="enterprise").only("id", "enterprise", "username")
        for candidate in candidates:
            if _normalize_name(candidate.enterprise or "") == normalized_ref:
                return candidate
            if _normalize_name(candidate.username or "") == normalized_ref:
                return candidate

    return None


def ensure_payment_for_month(enterprise: UserAccount, year: int, month: int):
    amount = Decimal("0.00")
    due_date = month_end_date(year, month)
    grace_date = due_date + timedelta(days=2)

    payment, _ = EnterpriseMonthlyPayment.objects.get_or_create(
        enterprise=enterprise,
        year=year,
        month=month,
        defaults={
            "amount": amount,
            "due_date": due_date,
            "grace_date": grace_date,
            "status": EnterpriseMonthlyPayment.STATUS_PENDING,
        },
    )

    return payment


def is_enterprise_blocked(enterprise: UserAccount):
    if not enterprise or enterprise.role != "enterprise":
        return False

    today = timezone.localdate()

    # Marca como vencidos los pagos no cancelados cuyo periodo de gracia ya expiró.
    enterprise.monthly_payments.filter(
        status=EnterpriseMonthlyPayment.STATUS_PENDING,
        grace_date__lt=today,
    ).update(status=EnterpriseMonthlyPayment.STATUS_OVERDUE)

    # Bloqueo: existe al menos un pago no pagado con gracia expirada.
    return enterprise.monthly_payments.filter(
        grace_date__lt=today,
    ).exclude(
        status=EnterpriseMonthlyPayment.STATUS_PAID,
    ).exists()


def user_access_blocked(user: UserAccount):
    if not user or user.role == "Admin":
        return False

    enterprise = resolve_enterprise_for_user(user)
    if not enterprise:
        return False

    return is_enterprise_blocked(enterprise)


def employee_login_context_valid(user: UserAccount):
    """
    Regla de acceso para empleados:
    - Deben tener empresa asociada resoluble.
    - La empresa asociada debe estar activa.
    """
    if user.role != "employees":
        return True, None

    enterprise = resolve_enterprise_for_user(user)
    if not enterprise:
        return (
            False,
            "Tu cuenta de empleado no tiene empresa asociada. Contacta al administrador.",
        )
    if enterprise.is_active is False:
        return (
            False,
            "Tu empresa está inactiva. Contacta al administrador.",
        )
    return True, None
