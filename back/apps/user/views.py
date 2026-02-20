from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import UserAccount, UserProfile, OneTimePassword
from .serializers import (
    UserSerializer,
    EditUserSerializer,
    EditUserEnterpriseSerializer,
    EditUserEmployeesSerializer,
    UserProfileSerializer,
    UserEnterpriseProfileSerializer,
    OTPWebRequestSerializer,
    OTPWebVerifySerializer,
    UserCreateByRoleSerializer,
    EnterpriseMonthlyPaymentSerializer,
    EmployeeEnterpriseListSerializer,
)
from .utils.pagination import SmallSetPagination
from django.http import Http404
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from django.conf import settings
from django.core.mail import send_mail
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from datetime import timedelta
from decimal import Decimal, InvalidOperation
from .models import EnterpriseMonthlyPayment, EnterprisePaymentNotificationLog
from django.db import IntegrityError
from apps.products.models import Product
from apps.job.models import JobBoard
from django.db.models import Case, When, Value, IntegerField, Q, Count
import re
from apps.products.serializers import EmployeeBenefitListSerializer
from apps.job.serializers import EmployeeJobListSerializer
from .utils.sendOTP import send_sms_in_background
from .utils.billing import (
    normalize_email,
    months_for_payment_cycle,
    can_register_payment_today,
    parse_bool_value,
    normalize_sms_phone,
    payment_notification_stage,
    payment_stage_messages,
    count_enterprise_employees,
    resolve_enterprise_for_user,
    ensure_payment_for_month,
    is_enterprise_blocked,
    user_access_blocked,
    employee_login_context_valid,
    previous_year_month
)

User = get_user_model()


def _mutable_request_data(request):
    """
    Build a mutable payload without QueryDict.deepcopy().
    In Python 3.12, deepcopy can fail for uploaded files (BufferedRandom).
    """
    incoming = request.data

    if hasattr(incoming, "lists"):
        payload = {}
        for key, values in incoming.lists():
            payload[key] = values[0] if len(values) == 1 else list(values)
        return payload

    if isinstance(incoming, dict):
        return incoming.copy()

    return dict(incoming)


def normalize_colombian_phone(raw_phone):
    phone = re.sub(r"\D+", "", str(raw_phone or ""))
    if phone.startswith("57") and len(phone) == 12:
        phone = phone[2:]
    return phone


def validate_unique_phone(phone_raw, current_user_id=None):
    normalized_phone = normalize_colombian_phone(phone_raw)
    if not normalized_phone:
        return normalized_phone

    if not re.fullmatch(r"3\d{9}", normalized_phone):
        raise ValueError("El teléfono debe ser colombiano: 10 dígitos e iniciar por 3.")

    existing_users = UserAccount.objects.exclude(phone__isnull=True).exclude(phone="")
    if current_user_id:
        existing_users = existing_users.exclude(pk=current_user_id)

    already_used = any(
        normalize_colombian_phone(existing.phone) == normalized_phone
        for existing in existing_users.only("id", "phone")
    )
    if already_used:
        raise ValueError(
            "El número de teléfono ingresado pertenece a un usuario ya registrado en el portal."
        )
    return normalized_phone


def _enterprise_profile_is_complete(enterprise: UserAccount):
    if not enterprise or enterprise.role != "enterprise":
        return False

    profile = getattr(enterprise, "userprofile", None)

    def _normalized(value):
        if value is None:
            return None
        if isinstance(value, str):
            return value.strip()
        return value

    required_values = [
        enterprise.email,
        enterprise.first_name,
        enterprise.last_name,
        enterprise.enterprise,
        enterprise.phone,
        getattr(profile, "document_type_enterprise", None) if profile else None,
        getattr(profile, "nuip_enterprise", None) if profile else None,
        getattr(profile, "description", None) if profile else None,
        getattr(profile, "niche", None) if profile else None,
        getattr(profile, "address", None) if profile else None,
    ]
    return all(_normalized(value) not in [None, ""] for value in required_values)


def _enterprise_is_visible_to_employees(enterprise: UserAccount):
    if not enterprise or enterprise.role != "enterprise":
        return False
    if not enterprise.is_active or not enterprise.verified:
        return False
    if not _enterprise_profile_is_complete(enterprise):
        return False
    if is_enterprise_blocked(enterprise):
        return False
    return True

class UserView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self, pk):
        try:
            return UserAccount.objects.get(pk=pk)
        except UserAccount.DoesNotExist:
            raise Http404
        
    def get(self, request, *args, **kwargs):
        if 'pk' in kwargs:
            employee = self.get_object(kwargs['pk'])
            
            if request.user.role == 'Admin':
                serializer = EditUserSerializer(employee)
                return Response({'employee': serializer.data})
            elif request.user.role == 'enterprise':
                serializer = EditUserEnterpriseSerializer(employee)
                return Response({'employee': serializer.data})
            elif request.user.role == 'employees':
                if str(employee.id) != str(request.user.id):
                    return Response(
                        {'error': 'Solo puedes consultar tu propio perfil.'},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                serializer = EditUserEmployeesSerializer(employee)
                return Response({'employee': serializer.data})
            else:
                return Response({'error': 'employee does not belong to this user'}, status=status.HTTP_404_NOT_FOUND)
        else:
            if request.user.role == 'enterprise':
                enterprise = request.user.enterprise
                employees = UserAccount.objects.filter(
                    enterprise=enterprise,
                    role='employees',
                ).order_by('-date_joined')
                paginator = SmallSetPagination()
                results = paginator.paginate_queryset(employees, request)
                serializer = UserSerializer(results, many=True)
                return paginator.get_paginated_response({'employees': serializer.data})
            elif request.user.role == 'Admin':
                employees = UserAccount.objects.filter(role='enterprise').order_by('-date_joined')
                paginator = SmallSetPagination()
                results = paginator.paginate_queryset(employees, request)
                serializer = UserSerializer(results, many=True)
                return paginator.get_paginated_response({'employees': serializer.data})
            else:
                return Response({'error': 'user does not have permission'}, status=status.HTTP_404_NOT_FOUND)
    
    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object(kwargs['pk'])
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': 'Error al obtener el Beneficiario: {}'.format(e)}, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, *args, **kwargs):
        try:
            data = _mutable_request_data(request)
            pk = data.get("id") or kwargs.get("pk")
            if not pk:
                return Response(
                    {"error": "Id de usuario requerido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user = UserAccount.objects.get(pk=pk)
            actor = request.user

            if actor.role == "Admin":
                is_self_edit = str(user.id) == str(actor.id)
                if user.role != "enterprise" and not is_self_edit:
                    return Response(
                        {"error": "Admin solo puede editar empresas o su propio perfil."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            elif actor.role == "enterprise":
                if user.role != "employees" or user.enterprise != actor.enterprise:
                    return Response(
                        {"error": "Solo puedes editar empleados de tu empresa."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            elif actor.role == "employees":
                if str(user.id) != str(actor.id):
                    return Response(
                        {"error": "Solo puedes editar tu propio perfil."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
            else:
                return Response(
                    {"error": "No tienes permisos para editar usuarios."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # actualizar categoria por partes
            incoming_email = data.get("email")
            if incoming_email not in [None, "", "undefined"]:
                normalized_email = str(incoming_email).strip().lower()
                user.email = normalized_email
                # Mantener consistencia: username siempre igual al correo.
                user.username = normalized_email
            elif data.get('username') and data['username'] not in ['undefined', '']:
                user.username = data['username']
            if data.get('first_name') and data['first_name'] not in ['undefined', '']:
                data['first_name'] = data['first_name'].title()
                user.first_name = data['first_name']
            if data.get('last_name') and data['last_name'] not in ['undefined', '']:
                data['last_name'] = data['last_name'].title()
                user.last_name = data['last_name']
            if actor.role == "Admin" and data.get('enterprise') and data['enterprise'] not in ['undefined', '']:
                old_enterprise_name = user.enterprise
                new_enterprise_name = data['enterprise']
                user.enterprise = new_enterprise_name
            if data.get('document_type') and data['document_type'] not in ['undefined', '']:
                user.document_type = data['document_type']
            if data.get('nuip') and data['nuip'] not in ['undefined', '']:
                user.nuip = data['nuip']
            if data.get('phone') and data['phone'] not in ['undefined', '']:
                try:
                    user.phone = validate_unique_phone(data['phone'], current_user_id=user.id)
                except ValueError as exc:
                    return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

            if data.get('picture') and data['picture'] not in ['undefined', '']:
                user.picture = data['picture']
            if data.get('banner') and data['banner'] not in ['undefined', '']:
                user.banner = data['banner']
            if actor.role == "Admin" and data.get("is_active") not in [None, "", "undefined"]:
                user.is_active = str(data.get("is_active")).lower() in ["true", "1", "yes"]
            user.updated_at = timezone.now()
            user.save()

            # Si admin cambia nombre de empresa, actualizar referencia en empleados ligados.
            if (
                actor.role == "Admin"
                and user.role == "enterprise"
                and 'old_enterprise_name' in locals()
                and old_enterprise_name
                and old_enterprise_name != user.enterprise
            ):
                UserAccount.objects.filter(
                    role="employees",
                    enterprise=old_enterprise_name,
                ).update(enterprise=user.enterprise)

            return Response({'success': 'Titular Editado Correctamente.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Error al Editar el Titular: {}'.format(e)}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request, *args, **kwargs):
        data = _mutable_request_data(request)
        actor = request.user

        if actor.role == "Admin":
            data["role"] = "enterprise"
            if not data.get("enterprise"):
                data["enterprise"] = data.get("username") or data.get("email", "").split("@")[0]
        elif actor.role == "enterprise":
            data["role"] = "employees"
            data["enterprise"] = actor.enterprise
        else:
            return Response(
                {"error": "No tienes permisos para crear usuarios."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Campos opcionales del perfil empresarial (UserProfile).
        profile_fields = [
            "document_type_enterprise",
            "nuip_enterprise",
            "description",
            "niche",
            "address",
            "facebook",
            "instagram",
            "X",
        ]
        profile_payload = {}
        for field in profile_fields:
            value = data.get(field)
            if value not in [None, "", "undefined"]:
                profile_payload[field] = value
            if field in data:
                data.pop(field)

        serializer = UserCreateByRoleSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        created_payment = None

        # Un admin crea empresas verificadas para habilitar operación inmediata.
        if actor.role == "Admin":
            user.verified = True
            user.save(update_fields=["verified"])
            today = timezone.localdate()
            for year, month in months_for_payment_cycle(today):
                payment = ensure_payment_for_month(user, year, month)
                if month == today.month:
                    created_payment = payment
            if profile_payload:
                profile = getattr(user, "userprofile", None)
                if profile is None:
                    profile = UserProfile.objects.create(user=user)
                for field, value in profile_payload.items():
                    setattr(profile, field, value)
                try:
                    profile.save()
                except IntegrityError:
                    return Response(
                        {"error": "No se pudo guardar el perfil empresarial. Revisa NIT/NUIP duplicado."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        payload = {"user": UserSerializer(user).data}
        if created_payment is not None:
            payload["payment"] = EnterpriseMonthlyPaymentSerializer(created_payment).data
        return Response(payload, status=status.HTTP_201_CREATED)

    def delete(self, request, *args, **kwargs):
        if "pk" not in kwargs:
            return Response(
                {"error": "Id de usuario requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target = self.get_object(kwargs["pk"])
        actor = request.user

        if actor.role == "Admin":
            if target.role != "enterprise":
                return Response(
                    {"error": "Admin solo puede eliminar cuentas enterprise."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif actor.role == "enterprise":
            if target.role != "employees" or target.enterprise != actor.enterprise:
                return Response(
                    {"error": "Solo puedes eliminar empleados de tu empresa."},
                    status=status.HTTP_403_FORBIDDEN,
                )
        else:
            return Response(
                {"error": "No tienes permisos para eliminar usuarios."},
                status=status.HTTP_403_FORBIDDEN,
            )

        target.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)



class EnterprisesProfile(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer
    
    def get_object(self, pk):
        try:
            return UserProfile.objects.get(user=pk)
        except UserProfile.DoesNotExist:
            raise Http404
    
    def get(self, request, *args, **kwargs):
        if 'pk' in kwargs:
            enterprise = self.get_object(kwargs['pk'])
            if request.user.role == 'enterprise':
                serializer = UserProfileSerializer(enterprise)
                return Response({'enterprise': serializer.data})
            elif request.user.role == "employees" :
                serializer = UserEnterpriseProfileSerializer(enterprise)
                return Response({'enterprise': serializer.data})
            elif request.user.role == "Admin" :
                serializer = UserProfileSerializer(enterprise)
                return Response({'enterprise': serializer.data})
            else:
                return Response({'error': 'enterprise does not belong to this user'}, status=status.HTTP_404_NOT_FOUND)
        else:
            return Response({'error': 'user does not have permission'}, status=status.HTTP_404_NOT_FOUND)
    
    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object(kwargs['pk'])
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': 'Error al obtener el Beneficiario: {}'.format(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def put(self,request, *args, **kwargs):
        try:
            data = _mutable_request_data(request)
            actor = request.user

            pk = kwargs.get("pk") or data.get("id")
            if not pk:
                return Response(
                    {"error": "Id de empresa requerido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = UserAccount.objects.filter(pk=pk, role="enterprise").first()
            if not user:
                return Response(
                    {"error": "Empresa no encontrada."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if actor.role == "enterprise":
                if str(actor.id) != str(user.id):
                    return Response(
                        {"error": "Solo puedes editar tu propio perfil empresarial."},
                        status=status.HTTP_403_FORBIDDEN,
                    )
                edit_deadline = user.date_joined + timedelta(days=7)
                if timezone.now() > edit_deadline:
                    return Response(
                        {
                            "error": (
                                "La ventana de edición expiró. "
                                "Solo puedes editar tu perfil durante los primeros 7 días."
                            )
                        },
                        status=status.HTTP_403_FORBIDDEN,
                    )
            elif actor.role != "Admin":
                return Response(
                    {"error": "No tienes permisos para editar este perfil."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            enterprise, _ = UserProfile.objects.get_or_create(user=user)

            incoming_email = data.get("email")
            if incoming_email not in [None, "", "undefined"]:
                normalized_email = str(incoming_email).strip().lower()
                user.email = normalized_email
                # Mantener consistencia: username siempre igual al correo.
                user.username = normalized_email
            elif data.get('username') and data['username'] not in ['undefined', '']:
                user.username = data['username'].strip()
            if data.get('first_name') and data['first_name'] not in ['undefined', '']:
                user.first_name = data['first_name'].strip().title()
            if data.get('last_name') and data['last_name'] not in ['undefined', '']:
                user.last_name = data['last_name'].strip().title()
            if data.get('enterprise') and data['enterprise'] not in ['undefined', '']:
                user.enterprise = data['enterprise'].strip()
            if data.get('picture') and data['picture'] not in ['undefined', '']:
                user.picture = data['picture']
            if data.get('banner') and data['banner'] not in ['undefined', '']:
                user.banner = data['banner']

            if data.get('document_type_enterprise') and data['document_type_enterprise'] not in ['undefined', '']:
                enterprise.document_type_enterprise = data['document_type_enterprise']
            if data.get('nuip_enterprise') and data['nuip_enterprise'] not in ['undefined', '']:
                enterprise.nuip_enterprise = data['nuip_enterprise']
            if data.get('description') and data['description'] not in ['undefined', '']:
                enterprise.description = data['description']
            if data.get('niche') and data['niche'] not in ['undefined', '']:
                enterprise.niche = data['niche']
            if data.get('phone') and data['phone'] not in ['undefined', '']:
                try:
                    user.phone = validate_unique_phone(data['phone'], current_user_id=user.id)
                except ValueError as exc:
                    return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
            if data.get('address') and data['address'] not in ['undefined', '']:
                enterprise.address = data['address']
            if data.get('facebook') and data['facebook'] not in ['undefined', '']:
                enterprise.facebook = data['facebook']
            if data.get('instagram') and data['instagram'] not in ['undefined', '']:
                enterprise.instagram = data['instagram']
            if data.get('X') and data['X'] not in ['undefined', '']:
                enterprise.X = data['X']
            if data.get('rut') and data['rut'] not in ['undefined', '']:
                enterprise.rut = data['rut']

            user.updated_at = timezone.now()
            user.save()
            enterprise.updated_at = timezone.now()
            enterprise.save()

            return Response(
                {
                    'success': 'Perfil empresarial actualizado correctamente.',
                    'enterprise': UserProfileSerializer(enterprise).data,
                },
                status=status.HTTP_200_OK,
            )
        except IntegrityError:
            return Response(
                {'error': 'No se pudo guardar. Revisa correo, usuario o NIT/NUIP duplicado.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return Response({'error': 'Error al Editar el Titular: {}'.format(e)}, status=status.HTTP_400_BAD_REQUEST)
        

class EmployeeDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != "employees":
            return Response(
                {"detail": "Solo empleados."},
                status=status.HTTP_403_FORBIDDEN,
            )

        base_enterprises = (
            UserAccount.objects.filter(role="enterprise", is_active=True, verified=True)
            .select_related("userprofile")
            .order_by("enterprise", "username")
        )
        visible_enterprise_ids = [
            enterprise.id
            for enterprise in base_enterprises
            if _enterprise_is_visible_to_employees(enterprise)
        ]

        enterprises = (
            UserAccount.objects.filter(id__in=visible_enterprise_ids)
            .select_related("userprofile")
            .annotate(
                jobs_count=Count("job_board", filter=Q(job_board__status="published"), distinct=True),
                benefits_count=Count(
                    "products",
                    filter=Q(products__finished=False) | Q(products__finished__isnull=True),
                    distinct=True,
                ),
            )
            .order_by("enterprise", "username")
        )
        enterprise_serializer = EmployeeEnterpriseListSerializer(
            enterprises,
            many=True,
            context={"request": request},
        )

        jobs_qs = (
            JobBoard.objects.filter(
                status="published",
                user_id__in=visible_enterprise_ids,
            )
            .select_related("user")
            .order_by("-created")[:3]
        )
        benefits_qs = (
            Product.objects.filter(user_id__in=visible_enterprise_ids)
            .filter(Q(finished=False) | Q(finished__isnull=True))
            .select_related("user")
            .order_by("-created")[:3]
        )

        jobs_serializer = EmployeeJobListSerializer(
            jobs_qs,
            many=True,
            context={"request": request},
        )
        benefits_serializer = EmployeeBenefitListSerializer(
            benefits_qs,
            many=True,
            context={"request": request},
        )

        payload = {
            "enterprises": enterprise_serializer.data,
            "jobs": jobs_serializer.data,
            "benefits": benefits_serializer.data,
            "meta": {
                "total_enterprises": enterprises.count(),
                "total_jobs": JobBoard.objects.filter(
                    status="published",
                    user_id__in=visible_enterprise_ids,
                ).count(),
                "total_benefits": Product.objects.filter(
                    user_id__in=visible_enterprise_ids,
                ).filter(Q(finished=False) | Q(finished__isnull=True)).count(),
            },
        }
        return Response(payload, status=status.HTTP_200_OK)


class EmployeeCompaniesListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != "employees":
            return Response(
                {"detail": "Solo empleados."},
                status=status.HTTP_403_FORBIDDEN,
            )

        search = (request.query_params.get("search") or "").strip()
        base_enterprises = (
            UserAccount.objects.filter(role="enterprise", is_active=True, verified=True)
            .select_related("userprofile")
            .order_by("enterprise", "username")
        )
        visible_enterprise_ids = [
            enterprise.id
            for enterprise in base_enterprises
            if _enterprise_is_visible_to_employees(enterprise)
        ]

        enterprises = (
            UserAccount.objects.filter(id__in=visible_enterprise_ids)
            .select_related("userprofile")
            .annotate(
                jobs_count=Count("job_board", filter=Q(job_board__status="published"), distinct=True),
                benefits_count=Count(
                    "products",
                    filter=Q(products__finished=False) | Q(products__finished__isnull=True),
                    distinct=True,
                ),
            )
            .order_by("enterprise", "username")
        )
        if search:
            enterprises = enterprises.filter(
                Q(enterprise__icontains=search)
                | Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(userprofile__description__icontains=search)
                | Q(userprofile__niche__icontains=search)
            )
        paginator = SmallSetPagination()
        paginated = paginator.paginate_queryset(enterprises, request)
        serializer = EmployeeEnterpriseListSerializer(
            paginated,
            many=True,
            context={"request": request},
        )
        return paginator.get_paginated_response(serializer.data)


class EmployeeEnterpriseDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, enterprise_id, *args, **kwargs):
        if request.user.role != "employees":
            return Response(
                {"detail": "Solo empleados."},
                status=status.HTTP_403_FORBIDDEN,
            )

        enterprise = UserAccount.objects.filter(
            id=enterprise_id,
            role="enterprise",
            is_active=True,
        ).select_related("userprofile").first()
        if not enterprise or not _enterprise_is_visible_to_employees(enterprise):
            return Response(
                {"detail": "Empresa no encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        profile = getattr(enterprise, "userprofile", None)
        niche = (getattr(profile, "niche", None) or "").strip()

        jobs_qs = JobBoard.objects.filter(
            user=enterprise,
            status="published",
        ).annotate(applications_count=Count('applications')).order_by("-created")[:60]
        benefits_qs = Product.objects.filter(
            user=enterprise,
        ).filter(
            Q(finished=False) | Q(finished__isnull=True)
        ).order_by("-created")[:60]

        categories = set()
        for benefit in benefits_qs:
            for value in [benefit.category, benefit.subcategory, benefit.extracategory]:
                if value:
                    categories.add(value.strip().lower())

        niche_enterprise_ids = []
        if niche:
            suggested_candidate_ids = list(
                UserProfile.objects.filter(niche__iexact=niche)
                .exclude(user=enterprise)
                .values_list("user_id", flat=True)
            )
            suggested_candidates = UserAccount.objects.filter(
                id__in=suggested_candidate_ids,
                role="enterprise",
                is_active=True,
                verified=True,
            ).select_related("userprofile")
            niche_enterprise_ids = [
                candidate.id
                for candidate in suggested_candidates
                if _enterprise_is_visible_to_employees(candidate)
            ]

        suggestions_benefits_qs = Product.objects.filter(
            user_id__in=niche_enterprise_ids,
        ).filter(
            Q(finished=False) | Q(finished__isnull=True)
        ).exclude(user=enterprise).select_related("user").order_by("-created")

        if categories:
            category_filter = Q()
            for category in categories:
                category_filter |= Q(category__icontains=category) | Q(subcategory__icontains=category)
            suggestions_benefits_qs = suggestions_benefits_qs.filter(category_filter)

        suggestions_jobs_qs = JobBoard.objects.filter(
            user_id__in=niche_enterprise_ids,
            status="published",
        ).exclude(user=enterprise).select_related("user").annotate(applications_count=Count('applications')).order_by("-created")[:30]

        def _file_url(field):
            if not field:
                return None
            url = getattr(field, "url", None)
            if not url:
                return None
            return request.build_absolute_uri(url)

        jobs = [
            {
                "id": str(job.id),
                "title": job.title,
                "description": job.description,
                "priority": job.priority,
                "status": job.status,
                "created": job.created,
                "image": _file_url(job.image),
                "applications_count": getattr(job, 'applications_count', 0),
            }
            for job in jobs_qs
        ]

        benefits = [
            {
                "id": str(benefit.id),
                "name": benefit.name,
                "description": benefit.description,
                "category": benefit.category,
                "subcategory": benefit.subcategory,
                "extracategory": benefit.extracategory,
                "created": benefit.created,
                "image": _file_url(benefit.image),
            }
            for benefit in benefits_qs
        ]

        suggested_benefits = [
            {
                "id": str(benefit.id),
                "name": benefit.name,
                "description": benefit.description,
                "category": benefit.category,
                "subcategory": benefit.subcategory,
                "enterprise": benefit.user.enterprise or benefit.user.username,
                "image": _file_url(benefit.image),
            }
            for benefit in suggestions_benefits_qs[:30]
        ]

        suggested_jobs = [
            {
                "id": str(job.id),
                "title": job.title,
                "priority": job.priority,
                "enterprise": job.user.enterprise or job.user.username,
                "created": job.created,
                "image": _file_url(job.image),
                "applications_count": getattr(job, 'applications_count', 0),
            }
            for job in suggestions_jobs_qs
        ]

        payload = {
            "enterprise": {
                "id": str(enterprise.id),
                "name": enterprise.enterprise or enterprise.username,
                "email": enterprise.email,
                "description": getattr(profile, "description", None),
                "niche": niche or None,
                "phone": enterprise.phone,
                "address": getattr(profile, "address", None),
                "facebook": getattr(profile, "facebook", None),
                "instagram": getattr(profile, "instagram", None),
                "X": getattr(profile, "X", None),
                "avatar": _file_url(enterprise.picture),
                "banner": _file_url(enterprise.banner),
            },
            "jobs": jobs,
            "benefits": benefits,
            "suggested_jobs": suggested_jobs,
            "suggested_benefits": suggested_benefits,
            "meta": {
                "total_jobs": len(jobs),
                "total_benefits": len(benefits),
                "niche": niche or None,
            },
        }
        return Response(payload, status=status.HTTP_200_OK)





class EnterpriseBillingDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != "Admin":
            return Response(
                {"detail": "Solo administrador."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.localdate()
        enterprises = UserAccount.objects.filter(role="enterprise").select_related("userprofile")
        cycle = months_for_payment_cycle(today)

        results = []
        for enterprise in enterprises:
            for year, month in cycle:
                ensure_payment_for_month(enterprise, year, month)

            # Actualiza estados pendientes->vencidos y calcula bloqueo real.
            blocked = is_enterprise_blocked(enterprise)

            cycle_filter = Q()
            for year, month in cycle:
                cycle_filter |= Q(year=year, month=month)

            # Incluye ciclo actual + cualquier deuda antigua no pagada para que admin pueda normalizar la empresa.
            unpaid_legacy_ids = list(
                enterprise.monthly_payments.filter(
                    grace_date__lt=today,
                )
                .exclude(status=EnterpriseMonthlyPayment.STATUS_PAID)
                .exclude(cycle_filter)
                .values_list("id", flat=True)
            )

            payments_qs = enterprise.monthly_payments.filter(
                cycle_filter | Q(id__in=unpaid_legacy_ids)
            ).order_by("-year", "-month")

            payments = []
            for payment in payments_qs:
                payment_data = EnterpriseMonthlyPaymentSerializer(payment, context={"request": request}).data
                payment_data["can_register"] = can_register_payment_today(payment, today)
                payments.append(payment_data)

            current_payment = next((p for p in payments if p["year"] == today.year and p["month"] == today.month), None)
            prev_year, prev_month = previous_year_month(today.year, today.month)
            previous_payment = (
                next((p for p in payments if p["year"] == prev_year and p["month"] == prev_month), None)
            )
            results.append(
                {
                    "enterprise": UserSerializer(enterprise).data,
                    "current_payment": current_payment,
                    "previous_payment": previous_payment,
                    "payments": payments,
                    "is_blocked": blocked,
                }
            )

        return Response({"enterprises": results}, status=status.HTTP_200_OK)


class EnterpriseBillingGenerateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if request.user.role != "Admin":
            return Response(
                {"detail": "Solo administrador."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.localdate()
        year = int(request.data.get("year", today.year))
        month = int(request.data.get("month", today.month))

        created_or_updated = 0
        enterprises = UserAccount.objects.filter(role="enterprise").select_related("userprofile")
        for enterprise in enterprises:
            ensure_payment_for_month(enterprise, year, month)
            created_or_updated += 1

        return Response(
            {
                "detail": "Mensualidades generadas.",
                "year": year,
                "month": month,
                "processed": created_or_updated,
            },
            status=status.HTTP_200_OK,
        )


class EnterpriseBillingActivationCronView(APIView):
    """
    Endpoint para n8n/cron para activar (crear) mensualidades de empresas.
    Authorization:
    - Admin autenticado por JWT, o
    - Header X-CRON-TOKEN con settings.BILLING_NOTIFICATIONS_CRON_TOKEN
    """

    permission_classes = [AllowAny]

    def _is_authorized(self, request):
        user = getattr(request, "user", None)
        if user and user.is_authenticated and getattr(user, "role", None) == "Admin":
            return True, "admin_jwt"

        configured_token = getattr(settings, "BILLING_NOTIFICATIONS_CRON_TOKEN", "")
        provided_token = (
            request.headers.get("X-CRON-TOKEN")
            or request.query_params.get("token")
            or request.data.get("token")
        )
        if configured_token and provided_token and provided_token == configured_token:
            return True, "cron_token"

        return False, None

    def _resolve_target_period(self, request):
        today = timezone.localdate()
        mode = (
            request.query_params.get("mode")
            or request.data.get("mode")
            or "next"
        ).strip().lower()

        if mode not in {"next", "current", "month"}:
            raise ValueError("Parametro mode invalido. Usa: next, current o month.")

        if mode == "current":
            return today.year, today.month, mode

        if mode == "next":
            if today.month == 12:
                return today.year + 1, 1, mode
            return today.year, today.month + 1, mode

        year_raw = request.query_params.get("year") or request.data.get("year")
        month_raw = request.query_params.get("month") or request.data.get("month")
        if not year_raw or not month_raw:
            raise ValueError("Para mode=month debes enviar year y month.")
        try:
            year = int(year_raw)
            month = int(month_raw)
        except (TypeError, ValueError):
            raise ValueError("year/month deben ser numericos.")
        if month < 1 or month > 12:
            raise ValueError("month fuera de rango. Usa 1..12.")
        if year < 2000 or year > 2100:
            raise ValueError("year fuera de rango permitido.")
        return year, month, mode

    def _run(self, request):
        is_authorized, auth_source = self._is_authorized(request)
        if not is_authorized:
            return Response(
                {"detail": "No autorizado para activar mensualidades."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            year, month, mode = self._resolve_target_period(request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        enterprise_id = (
            request.query_params.get("enterprise_id")
            or request.data.get("enterprise_id")
            or ""
        ).strip()
        dry_run = parse_bool_value(
            request.query_params.get("dry_run") or request.data.get("dry_run")
        )

        enterprises = UserAccount.objects.filter(role="enterprise")
        if enterprise_id:
            enterprises = enterprises.filter(pk=enterprise_id)

        enterprise_ids = list(enterprises.values_list("id", flat=True))

        if not dry_run:
            for enterprise in enterprises:
                ensure_payment_for_month(enterprise, year, month)

        return Response(
            {
                "detail": (
                    "Simulacion de activacion completada."
                    if dry_run
                    else "Mensualidades activadas correctamente."
                ),
                "mode": mode,
                "year": year,
                "month": month,
                "dry_run": dry_run,
                "processed": len(enterprise_ids),
                "enterprise_ids": [str(eid) for eid in enterprise_ids],
                "auth_source": auth_source,
            },
            status=status.HTTP_200_OK,
        )

    def get(self, request, *args, **kwargs):
        return self._run(request)

    def post(self, request, *args, **kwargs):
        return self._run(request)


class EnterpriseMonthlyPaymentMarkPaidView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, payment_id, *args, **kwargs):
        if request.user.role != "Admin":
            return Response(
                {"detail": "Solo administrador."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            payment = EnterpriseMonthlyPayment.objects.get(pk=payment_id)
        except EnterpriseMonthlyPayment.DoesNotExist:
            return Response(
                {"detail": "Pago no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        today = timezone.localdate()
        if not can_register_payment_today(payment, today):
            return Response(
                {
                    "detail": (
                        "Este pago aún no está habilitado. "
                        "Solo puedes registrar mes actual/anterior o meses liberados al cierre mensual."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_method = request.data.get("payment_method")
        paid_amount_raw = request.data.get("paid_amount")
        payment_reference = request.data.get("payment_reference")
        notes = request.data.get("notes")
        payment_proof = request.FILES.get("payment_proof")

        if payment_method not in dict(EnterpriseMonthlyPayment.METHOD_CHOICES):
            return Response(
                {"detail": "Método de pago inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if paid_amount_raw in [None, "", "undefined"]:
            return Response(
                {"detail": "El valor pagado es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            paid_amount = Decimal(str(paid_amount_raw))
        except (InvalidOperation, ValueError):
            return Response(
                {"detail": "El valor pagado no es válido."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if paid_amount <= 0:
            return Response(
                {"detail": "El valor pagado debe ser mayor a cero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment.status = EnterpriseMonthlyPayment.STATUS_PAID
        payment.payment_method = payment_method
        payment.payment_reference = payment_reference if payment_reference not in [None, "", "undefined"] else None
        payment.paid_amount = paid_amount
        if payment_proof:
            payment.payment_proof = payment_proof
        payment.paid_reported_by = request.user
        payment.paid_at = timezone.now()
        if notes not in [None, "", "undefined"]:
            payment.notes = notes
        payment.save()

        return Response(
            {
                "detail": "Pago marcado como pagado.",
                "payment": EnterpriseMonthlyPaymentSerializer(payment, context={"request": request}).data,
            },
            status=status.HTTP_200_OK,
        )


class EnterpriseBillingReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != "Admin":
            return Response(
                {"detail": "Solo administrador."},
                status=status.HTTP_403_FORBIDDEN,
            )

        enterprise_id = request.query_params.get("enterprise_id")
        year = request.query_params.get("year")
        month = request.query_params.get("month")

        payments = EnterpriseMonthlyPayment.objects.select_related("enterprise", "paid_reported_by")
        if enterprise_id:
            payments = payments.filter(enterprise_id=enterprise_id)
        if year:
            payments = payments.filter(year=int(year))
        if month:
            payments = payments.filter(month=int(month))

        payments = payments.order_by("-year", "-month", "enterprise__enterprise")
        serialized = EnterpriseMonthlyPaymentSerializer(payments, many=True, context={"request": request}).data

        summary = {
            "total": payments.count(),
            "paid": payments.filter(status=EnterpriseMonthlyPayment.STATUS_PAID).count(),
            "pending": payments.filter(status=EnterpriseMonthlyPayment.STATUS_PENDING).count(),
            "overdue": payments.filter(status=EnterpriseMonthlyPayment.STATUS_OVERDUE).count(),
        }

        return Response(
            {
                "summary": summary,
                "filters": {
                    "enterprise_id": enterprise_id,
                    "year": year,
                    "month": month,
                },
                "payments": serialized,
            },
            status=status.HTTP_200_OK,
        )


class EnterprisePaymentDelinquencyNotificationsView(APIView):
    """
    Endpoint para cron (n8n) que notifica mora por etapas.
    Authorization:
    - Admin autenticado por JWT, o
    - Header X-CRON-TOKEN con settings.BILLING_NOTIFICATIONS_CRON_TOKEN
    """

    permission_classes = [AllowAny]

    def _is_authorized(self, request):
        user = getattr(request, "user", None)
        if user and user.is_authenticated and getattr(user, "role", None) == "Admin":
            return True, "admin_jwt"

        configured_token = getattr(settings, "BILLING_NOTIFICATIONS_CRON_TOKEN", "")
        provided_token = (
            request.headers.get("X-CRON-TOKEN")
            or request.query_params.get("token")
            or request.data.get("token")
        )
        if configured_token and provided_token and provided_token == configured_token:
            return True, "cron_token"

        return False, None

    def _run(self, request):
        is_authorized, auth_source = self._is_authorized(request)
        if not is_authorized:
            return Response(
                {"detail": "No autorizado para ejecutar notificaciones de mora."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.localdate()
        dry_run = parse_bool_value(request.query_params.get("dry_run") or request.data.get("dry_run"))
        enterprise_id = (request.query_params.get("enterprise_id") or request.data.get("enterprise_id") or "").strip()
        stage_filter_raw = (request.query_params.get("stage") or request.data.get("stage") or "").strip()

        stage_filter = None
        if stage_filter_raw:
            try:
                stage_filter = int(stage_filter_raw)
            except ValueError:
                return Response(
                    {"detail": "Parametro stage invalido. Usa un numero del 1 al 5."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if stage_filter not in {1, 2, 3, 4, 5}:
                return Response(
                    {"detail": "Parametro stage fuera de rango. Usa un numero del 1 al 5."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        payments = (
            EnterpriseMonthlyPayment.objects.select_related("enterprise", "enterprise__userprofile")
            .exclude(status=EnterpriseMonthlyPayment.STATUS_PAID)
        )
        if enterprise_id:
            payments = payments.filter(enterprise_id=enterprise_id)

        # Mantener estados al dia antes de evaluar stages.
        overdue_updated = payments.filter(
            status=EnterpriseMonthlyPayment.STATUS_PENDING,
            grace_date__lt=today,
        ).update(status=EnterpriseMonthlyPayment.STATUS_OVERDUE)

        results = []
        sent_count = 0
        skipped_count = 0

        for payment in payments.order_by("due_date", "enterprise__enterprise", "enterprise__email"):
            stage = payment_notification_stage(payment, today)
            if not stage:
                continue
            if stage_filter and stage != stage_filter:
                continue

            template = payment_stage_messages(payment, stage, today)
            if not template:
                continue

            existing_log = EnterprisePaymentNotificationLog.objects.filter(
                payment=payment,
                stage=stage,
            ).first()
            if existing_log and not dry_run:
                skipped_count += 1
                results.append(
                    {
                        "payment_id": payment.id,
                        "enterprise_id": str(payment.enterprise_id),
                        "enterprise_name": payment.enterprise.enterprise or payment.enterprise.username or "",
                        "enterprise_email": payment.enterprise.email,
                        "enterprise_phone": existing_log.sent_to_phone,
                        "stage": stage,
                        "stage_label": template["label"],
                        "status": "skipped_already_notified",
                    }
                )
                continue

            enterprise = payment.enterprise
            enterprise_name = enterprise.enterprise or enterprise.username or enterprise.email
            phone_raw = enterprise.phone
            phone = normalize_sms_phone(phone_raw) if phone_raw else None
            email = (enterprise.email or "").strip().lower() or None
            affected_users = count_enterprise_employees(enterprise)

            email_sent = False
            sms_sent = False
            errors = []

            if not dry_run:
                if email:
                    try:
                        send_mail(
                            subject=template["subject"],
                            message=template["email"],
                            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
                            recipient_list=[email],
                            fail_silently=False,
                        )
                        email_sent = True
                    except Exception as exc:
                        errors.append(f"email_error: {exc}")
                else:
                    errors.append("email_missing")

                if phone:
                    try:
                        send_sms_in_background(phone, template["sms"])
                        sms_sent = True
                    except Exception as exc:
                        errors.append(f"sms_error: {exc}")
                else:
                    errors.append("phone_missing_or_invalid")

                EnterprisePaymentNotificationLog.objects.update_or_create(
                    payment=payment,
                    stage=stage,
                    defaults={
                        "enterprise": enterprise,
                        "stage_label": template["label"],
                        "email_sent": email_sent,
                        "sms_sent": sms_sent,
                        "sent_to_email": email,
                        "sent_to_phone": phone,
                        "metadata": {
                            "auth_source": auth_source,
                            "today": str(today),
                            "errors": errors,
                            "affected_users": affected_users,
                        },
                    },
                )
                sent_count += 1

            results.append(
                {
                    "payment_id": payment.id,
                    "enterprise_id": str(payment.enterprise_id),
                    "enterprise_name": enterprise_name,
                    "enterprise_email": email,
                    "enterprise_phone": phone,
                    "affected_users": affected_users,
                    "stage": stage,
                    "stage_label": template["label"],
                    "dry_run": dry_run,
                    "email_sent": email_sent if not dry_run else None,
                    "sms_sent": sms_sent if not dry_run else None,
                    "status": "dry_run" if dry_run else ("sent" if (email_sent or sms_sent) else "no_channel_sent"),
                    "errors": errors,
                }
            )

        return Response(
            {
                "detail": "Notificaciones de mora procesadas.",
                "meta": {
                    "today": str(today),
                    "dry_run": dry_run,
                    "auth_source": auth_source,
                    "overdue_updated": overdue_updated,
                    "sent_count": sent_count,
                    "skipped_count": skipped_count,
                    "total_results": len(results),
                },
                "results": results,
            },
            status=status.HTTP_200_OK,
        )

    def get(self, request, *args, **kwargs):
        return self._run(request)

    def post(self, request, *args, **kwargs):
        return self._run(request)


class EnterpriseOwnPaymentsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role == "Admin":
            return Response(
                {"detail": "Admin debe consultar el panel de empresas."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        enterprise = resolve_enterprise_for_user(request.user)
        if not enterprise:
            return Response(
                {"detail": "No se encontró empresa asociada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        today = timezone.localdate()
        cycle = months_for_payment_cycle(today)  # [(year, month), (year, month), ...]

        # asegura registros
        for year, month in cycle:
            ensure_payment_for_month(enterprise, year, month)

        # filtro correcto por tuplas (year, month)
        cycle_filter = Q()
        for year, month in cycle:
            cycle_filter |= Q(year=year, month=month)

        status_order = Case(
            When(status=EnterpriseMonthlyPayment.STATUS_PAID, then=Value(0)),
            When(status=EnterpriseMonthlyPayment.STATUS_PENDING, then=Value(1)),
            When(status=EnterpriseMonthlyPayment.STATUS_OVERDUE, then=Value(2)),
            default=Value(3),
            output_field=IntegerField(),
        )

        payments_qs = (
            EnterpriseMonthlyPayment.objects
            .filter(enterprise=enterprise)
            .filter(cycle_filter)
            .annotate(status_order=status_order)
            # primero pagados, luego pendientes, luego vencidos
            # y dentro de cada grupo: enero -> diciembre (y año ascendente)
            .order_by("status_order", "year", "month")
        )
        payments = []
        for payment in payments_qs:
            data = EnterpriseMonthlyPaymentSerializer(payment, context={"request": request}).data
            data["can_register"] = can_register_payment_today(payment, today)
            payments.append(data)

        summary = {
            "total": payments_qs.count(),
            "paid": payments_qs.filter(status=EnterpriseMonthlyPayment.STATUS_PAID).count(),
            "pending": payments_qs.filter(status=EnterpriseMonthlyPayment.STATUS_PENDING).count(),
            "overdue": payments_qs.filter(status=EnterpriseMonthlyPayment.STATUS_OVERDUE).count(),
        }

        return Response(
            {
                "summary": summary,
                "payments": payments,
            },
            status=status.HTTP_200_OK,
        )


class OTPLoginRequestWebView(APIView):
    """
    POST /auth/login/otp/request/web/
    { "email": "usuario@dominio.com" }
    Envia OTP solo si el usuario existe, esta activo y autorizado para web.
    """

    permission_classes = [AllowAny]
    serializer_class = OTPWebRequestSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        email_norm = normalize_email(serializer.validated_data["email"])


        user = User.objects.filter(email__iexact=email_norm, is_active=True).first()
        if not user:
            return Response(
                {"detail": "Correo no autorizado."},
                status=status.HTTP_403_FORBIDDEN,
            )

        valid_employee_context, employee_context_error = employee_login_context_valid(user)
        if not valid_employee_context:
            return Response(
                {"detail": employee_context_error},
                status=status.HTTP_403_FORBIDDEN,
            )

        if user_access_blocked(user):
            return Response(
                {
                    "detail": (
                        "Tu empresa tiene pagos pendientes. Acceso bloqueado temporalmente. "
                        "Contacta al administrador."
                    )
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        otp = OneTimePassword.create_for_user(user=user, minutes=10)
        try:
            send_mail(
                subject="Código de acceso",
                message=f"Tu código es: {otp.code}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email_norm],
                fail_silently=False,
            )
            return Response({"detail": "OTP enviado."}, status=status.HTTP_200_OK)
        except Exception:
            if settings.DEBUG:
                return Response(
                    {
                        "detail": "No se pudo enviar email en entorno local.",
                        "otp_debug_code": otp.code,
                    },
                    status=status.HTTP_200_OK,
                )
            return Response(
                {"detail": "No fue posible enviar el código OTP."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class OTPLoginVerifyWebView(APIView):
    """
    POST /auth/login/otp/verify/
    { "identifier": "correo@dominio.com", "otp": "123456", "source": "web" }
    """

    permission_classes = [AllowAny]
    serializer_class = OTPWebVerifySerializer

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)

        identifier = serializer.validated_data["identifier"]
        otp_code = serializer.validated_data["otp"]

        user = User.objects.filter(email__iexact=normalize_email(identifier)).first()
        if not user:
            return Response(
                {"detail": "Usuario no encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        valid_employee_context, employee_context_error = employee_login_context_valid(user)
        if not valid_employee_context:
            return Response(
                {"detail": employee_context_error},
                status=status.HTTP_403_FORBIDDEN,
            )

        if user_access_blocked(user):
            return Response(
                {
                    "detail": (
                        "Tu empresa tiene pagos pendientes. Acceso bloqueado temporalmente. "
                        "Contacta al administrador."
                    )
                },
                status=status.HTTP_402_PAYMENT_REQUIRED,
            )

        otp = (
            OneTimePassword.objects.filter(
                user=user,
                code=otp_code,
                is_used=False,
                expires_at__gt=timezone.now(),
            )
            .order_by("-created_at")
            .first()
        )
        if not otp:
            return Response(
                {"detail": "OTP inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp.is_used = True
        otp.save(update_fields=["is_used"])

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )
