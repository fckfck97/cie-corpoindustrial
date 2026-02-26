from rest_framework.views import APIView
from .serializers import (
    JobBoardSerializer,
    JobDashboardSerializer,
    JobBoardEmployeesSerializer,
    EmployeeJobListSerializer,
    JobApplicationSerializer,
)
from .models import JobBoard, JobApplication
from rest_framework.response import Response
from rest_framework import status
from .utils.pagination import SmallSetPagination, JobSetPagination
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from django.core.files import File
from concurrent.futures import ThreadPoolExecutor
import threading
import tempfile
import os
import logging

logger = logging.getLogger(__name__)

# Bounded in-process queue to avoid unbounded thread/task growth under load.
PUBLIC_APPLY_MAX_WORKERS = 2
PUBLIC_APPLY_MAX_QUEUE = 8
_public_apply_executor = ThreadPoolExecutor(
    max_workers=PUBLIC_APPLY_MAX_WORKERS,
    thread_name_prefix="public-apply",
)
_public_apply_slots = threading.BoundedSemaphore(
    value=PUBLIC_APPLY_MAX_WORKERS + PUBLIC_APPLY_MAX_QUEUE
)

def active_jobs_queryset(queryset):
    now = timezone.now()
    return queryset.filter(
        Q(start_date__isnull=True) | Q(start_date__lte=now),
        Q(end_date__isnull=True) | Q(end_date__gte=now),
        status="published",
    )


def _send_job_application_notification(job, application):
    try:
        subject = f'Nueva postulación: {job.title}'
        message = (
            f'Hola,\n\nHas recibido una nueva postulación para la oferta "{job.title}".\n\n'
            f'Candidato: {application.full_name}\nEmail: {application.email}\n\n'
            'Revisa tu panel para ver el CV adjunto.'
        )
        recipient = job.user.email
        if recipient:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [recipient],
                fail_silently=True,
            )
    except Exception:
        logger.exception("Error sending job application notification")


def _enqueue_public_application(*, payload, temp_cv_path, original_cv_name):
    if not _public_apply_slots.acquire(blocking=False):
        return False

    def _task():
        try:
            job = JobBoard.objects.get(id=payload["job"])

            # Re-check duplicates in background to reduce race conditions.
            email = payload.get("email")
            if email and JobApplication.objects.filter(job=job, email=email).exists():
                return

            phone = payload.get("phone")
            if phone and JobApplication.objects.filter(job=job, phone=phone).exists():
                return

            with open(temp_cv_path, "rb") as cv_fp:
                serializer_data = {
                    "job": payload["job"],
                    "full_name": payload["full_name"],
                    "email": payload["email"],
                    "phone": payload.get("phone"),
                    "cover_letter": payload.get("cover_letter"),
                    "origin": "externo",
                    "cv": File(cv_fp, name=original_cv_name or os.path.basename(temp_cv_path)),
                }
                serializer = JobApplicationSerializer(data=serializer_data)
                if not serializer.is_valid():
                    logger.warning(
                        "Public apply async validation failed: %s",
                        serializer.errors,
                    )
                    return
                application = serializer.save(origin="externo")
                _send_job_application_notification(job, application)
        except Exception:
            logger.exception("Public apply async processing failed")
        finally:
            try:
                if os.path.exists(temp_cv_path):
                    os.remove(temp_cv_path)
            except Exception:
                logger.exception("Failed to delete temp CV file: %s", temp_cv_path)
            _public_apply_slots.release()

    try:
        _public_apply_executor.submit(_task)
        return True
    except Exception:
        _public_apply_slots.release()
        logger.exception("Failed to enqueue public apply task")
        return False

class JobBoardView(APIView):
    serializer_class = JobBoardSerializer

    def get_object(self, pk):
        try:
            return JobBoard.objects.annotate(
                applications_count=Count('applications')
            ).get(pk=pk)
        except JobBoard.DoesNotExist:
            raise NotFound('JobBoard not found')

    def get(self, request, *args, **kwargs):
        user = request.user
        enterprise_id = request.query_params.get('enterprise_id', None)
        if 'pk' in kwargs:
            jobboard = self.get_object(kwargs['pk'])
            if user.role == 'Admin':
                serializer = JobBoardEmployeesSerializer(jobboard)
            elif user.role == 'enterprise':
                # if jobboard.user != user:
                #     return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
                serializer = JobBoardEmployeesSerializer(jobboard)
            elif user.role == "employees":

                serializer = JobBoardEmployeesSerializer(jobboard)
            else:
                return Response({'error': 'Not authorized to view this job'}, status=status.HTTP_403_FORBIDDEN)
            payload = serializer.data
            if user.role == "employees":
                payload["already_applied"] = JobApplication.objects.filter(
                    job=jobboard,
                    applicant=user,
                ).exists()
            return Response({'job': payload})
        else:
            if user.role == 'Admin':
                jobboards = JobBoard.objects.all()
            elif user.role == 'enterprise':
                jobboards = JobBoard.objects.filter(user=user).annotate(
                    applications_count=Count("applications")
                )
                if enterprise_id and enterprise_id != str(user.id):
                    return Response({'error': 'Not authorized to view other enterprise job boards'}, status=status.HTTP_403_FORBIDDEN)
            elif user.role == "employees":
                jobboards = JobBoard.objects.filter(user_id=enterprise_id) if enterprise_id else JobBoard.objects.none()
            else:
                return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

            jobboards = jobboards.order_by('-created')
            serializer = self.serializer_class(
                jobboards, many=True, context={'request': request})
            serialized_data = serializer.data

            paginator = SmallSetPagination()
            result_page = paginator.paginate_queryset(serialized_data, request)
            return paginator.get_paginated_response({'jobs': result_page})

    def post(self, request):
        data = request.data.copy()  # Create a mutable copy of the QueryDict
        data['user'] = request.user.id
        serializer = JobBoardSerializer(data=data)
        if serializer.is_valid():
            job = serializer.save()
            output = JobBoardSerializer(job, context={'request': request})
            return Response(output.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, *args, **kwargs):
        try:
            data = request.data.copy()
            pk = data["id"]
            job = JobBoard.objects.get(pk=pk)

            # actualizar categoria por partes
            if data.get('title') and data['title'] not in ['undefined', '']:
                job.title = data['title']
            if data.get('description') and data['description'] not in ['undefined', '']:
                job.description = data['description']
            if data.get('priority') and data['priority'] not in ['undefined', '']:
                job.priority = data['priority']
            if data.get('status') and data['status'] in ['draft', 'published']:
                job.status = data['status']
            if data.get('image') and data['image'] not in ['undefined', '']:
                job.image = data['image']
            if data.get('start_date') and data['start_date'] not in ['undefined', '']:
                job.start_date = data['start_date']
            if data.get('end_date') and data['end_date'] not in ['undefined', '']:
                job.end_date = data['end_date']
                
            job.save()
            return Response({'success': 'Trabajo Editado Correctamente.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class JobDashboardView(APIView):
    serializer_class = JobDashboardSerializer

    def get(self, request, *args, **kwargs):
        if JobBoard.objects.all().exists():
            jobboard = active_jobs_queryset(JobBoard.objects.all()).order_by('-created')
            paginator = JobSetPagination()
            results = paginator.paginate_queryset(jobboard, request)
            serializer = self.serializer_class(results, many=True)
            return paginator.get_paginated_response({'jobs': serializer.data})
        else:
            return Response({'error': 'No JobBoards found'}, status=status.HTTP_404_NOT_FOUND)

@permission_classes([AllowAny])
class JobMainView(APIView):
    serializer_class = JobDashboardSerializer
    def get_object(self, pk):
        try:
            return active_jobs_queryset(JobBoard.objects.all()).get(pk=pk)
        except JobBoard.DoesNotExist:
            raise NotFound('JobBoard not found')

    def get(self, request, *args, **kwargs):
        if 'pk' in kwargs:
            jobboard = self.get_object(kwargs['pk'])
            serializer = JobBoardEmployeesSerializer(jobboard)
            return Response({'job': serializer.data})
        else:
            jobboard = active_jobs_queryset(JobBoard.objects.all()).order_by('-created')
            paginator = JobSetPagination()
            results = paginator.paginate_queryset(jobboard, request)
            serializer = self.serializer_class(results, many=True)
            return paginator.get_paginated_response({'jobs': serializer.data})


class EmployeeJobsListView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmployeeJobListSerializer

    def get(self, request, *args, **kwargs):
        if request.user.role != "employees":
            return Response(
                {"detail": "Solo empleados."},
                status=status.HTTP_403_FORBIDDEN,
            )

        search = (request.query_params.get("search") or "").strip()
        jobs = (
            active_jobs_queryset(JobBoard.objects.filter(
                user__role="enterprise",
                user__is_active=True,
            ))
            .select_related("user")
            .annotate(applications_count=Count('applications'))
            .order_by("-created")
        )
        if search:
            jobs = jobs.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(user__enterprise__icontains=search)
                | Q(user__username__icontains=search)
            )
        paginator = SmallSetPagination()
        paginated = paginator.paginate_queryset(jobs, request)
        serializer = self.serializer_class(paginated, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class ApplyJobView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        if request.user.role != "employees":
            return Response(
                {"error": "Solo empleados pueden postularse."},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data
        job_id = data.get('job')
        
        if not job_id:
             return Response({'error': 'Job ID required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            job = JobBoard.objects.get(id=job_id)
        except JobBoard.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

        # Validate dates
        now = timezone.now()
        if job.start_date and job.start_date > now:
             return Response({'error': 'La convocatoria aún no ha iniciado'}, status=status.HTTP_400_BAD_REQUEST)
        
        if job.end_date and job.end_date < now:
             return Response({'error': 'La convocatoria ha finalizado'}, status=status.HTTP_400_BAD_REQUEST)

        # prevent duplicate applications by the same user
        if JobApplication.objects.filter(job=job, applicant=request.user).exists():
            return Response(
                {'error': 'Ya te postulaste a esta vacante.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # also prevent duplicate phone number submissions for the same job
        phone = data.get('phone')
        if phone and JobApplication.objects.filter(job=job, phone=phone).exists():
            return Response(
                {'error': 'Ya existe una postulación para este empleo con el mismo número de teléfono.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = JobApplicationSerializer(data=data)
        if serializer.is_valid():
            application = serializer.save(applicant=request.user, origin='interno')
            
            # Send Email Notification to Enterprise
            try:
                subject = f'Nueva postulación: {job.title}'
                message = f'Hola,\n\nHas recibido una nueva postulación para la oferta "{job.title}".\n\nCandidato: {application.full_name}\nEmail: {application.email}\n\nRevisa tu panel para ver el CV adjunto.'
                recipient = job.user.email
                if recipient:
                    send_mail(
                        subject,
                        message,
                        settings.DEFAULT_FROM_EMAIL,
                        [recipient],
                        fail_silently=True,
                    )
            except Exception as e:
                print(f"Error sending email: {e}")

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EnterpriseApplicationsView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        # List applications for jobs posted by this user
        if request.user.role != 'enterprise':
             return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        job_id = request.query_params.get("job")
        origin = (request.query_params.get("origin") or "").strip().lower()
        applications = JobApplication.objects.filter(job__user=request.user).select_related("job")
        if job_id:
            applications = applications.filter(job_id=job_id)
        if origin in {"interno", "externo"}:
            applications = applications.filter(origin=origin)

        applications = applications.order_by('-created_at')
        paginator = SmallSetPagination()
        paginated = paginator.paginate_queryset(applications, request)
        serializer = JobApplicationSerializer(paginated, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class EmployeeApplicationsView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, *args, **kwargs):
        if request.user.role != 'employees':
             return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        job_id = request.query_params.get("job")
        origin = (request.query_params.get("origin") or "").strip().lower()
        applications = JobApplication.objects.filter(applicant=request.user).select_related("job", "job__user")
        if job_id:
            applications = applications.filter(job_id=job_id)
        if origin in {"interno", "externo"}:
            applications = applications.filter(origin=origin)

        applications = applications.order_by('-created_at')
        serializer = JobApplicationSerializer(applications, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


@permission_classes([AllowAny])
class PublicApplyJobView(APIView):
    def post(self, request, *args, **kwargs):
        data = request.data
        job_id = data.get('job')

        if not job_id:
             return Response({'error': 'Job ID required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            job = JobBoard.objects.get(id=job_id)
        except JobBoard.DoesNotExist:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)

        # Validate dates
        now = timezone.now()
        if job.start_date and job.start_date > now:
             return Response({'error': 'La convocatoria aún no ha iniciado'}, status=status.HTTP_400_BAD_REQUEST)
        
        if job.end_date and job.end_date < now:
             return Response({'error': 'La convocatoria ha finalizado'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if email has already applied to this job (optional, but good practice to avoid spam)
        email = data.get('email')
        if email and JobApplication.objects.filter(job=job, email=email).exists():
            return Response(
                {'error': 'Ya existe una postulación con este correo para esta vacante.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # prevent duplicate phone number submissions for the same job
        phone = data.get('phone')
        if phone and JobApplication.objects.filter(job=job, phone=phone).exists():
            return Response(
                {'error': 'Ya existe una postulación para este empleo con el mismo número de teléfono.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        full_name = (data.get("full_name") or "").strip()
        email = (data.get("email") or "").strip()
        cv = request.FILES.get("cv")

        if not full_name:
            return Response({"full_name": ["Este campo es obligatorio."]}, status=status.HTTP_400_BAD_REQUEST)
        if not email:
            return Response({"email": ["Este campo es obligatorio."]}, status=status.HTTP_400_BAD_REQUEST)
        if not cv:
            return Response({"cv": ["Este campo es obligatorio."]}, status=status.HTTP_400_BAD_REQUEST)

        suffix = os.path.splitext(getattr(cv, "name", "") or "")[1] or ".bin"
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix, prefix="public-apply-", dir=tempfile.gettempdir())
        temp_cv_path = temp_file.name
        try:
            for chunk in cv.chunks():
                temp_file.write(chunk)
        finally:
            temp_file.close()

        payload = {
            "job": str(job.id),
            "full_name": full_name,
            "email": email,
            "phone": (data.get("phone") or "").strip() or None,
            "cover_letter": (data.get("cover_letter") or "").strip() or None,
        }

        queued = _enqueue_public_application(
            payload=payload,
            temp_cv_path=temp_cv_path,
            original_cv_name=getattr(cv, "name", None),
        )
        if not queued:
            try:
                os.remove(temp_cv_path)
            except OSError:
                pass
            return Response(
                {"error": "El sistema está procesando muchas postulaciones. Intenta nuevamente en unos minutos."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "message": "Postulación recibida y en procesamiento.",
                "status": "processing",
                "origin": "externo",
                "job": str(job.id),
                "full_name": full_name,
                "email": email,
                "phone": payload["phone"],
            },
            status=status.HTTP_202_ACCEPTED,
        )
