from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from .models import (
    Project,
    ProjectApplication,
    LicitationOpportunity,
    LicitationApplication,
)
from .serializers import (
    ProjectSerializer,
    ProjectDashboardSerializer,
    ProjectApplicationSerializer,
    LicitationOpportunitySerializer,
    LicitationApplicationSerializer,
)
from .utils.pagination import SmallSetPagination, ProjectSetPagination


def _to_date(raw_value):
    if raw_value in [None, "", "undefined"]:
        return None
    if hasattr(raw_value, "date"):
        return raw_value.date()
    if hasattr(raw_value, "year") and hasattr(raw_value, "month") and hasattr(raw_value, "day"):
        return raw_value
    if isinstance(raw_value, str):
        dt_value = parse_datetime(raw_value)
        if dt_value:
            return dt_value.date()
        date_value = parse_date(raw_value)
        if date_value:
            return date_value
    return None


def _validate_dates_window(start_raw, end_raw):
    start_date = _to_date(start_raw)
    end_date = _to_date(end_raw)
    today = timezone.localdate()

    if not start_date or not end_date:
        return "Debes definir fecha de inicio y fecha de cierre."
    if start_date < today:
        return "La fecha de inicio no puede ser anterior al dia actual."
    if end_date <= start_date:
        return "La fecha de cierre debe ser posterior a la fecha de inicio."
    return None

class ProjectView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProjectSerializer

    def get_object(self, pk):
        try:
            return Project.objects.annotate(
                applications_count=Count('applications', distinct=True),
            ).get(pk=pk)
        except Project.DoesNotExist:
            raise NotFound('Project not found')

    def get(self, request, *args, **kwargs):
        user = request.user
        if 'pk' in kwargs:
            project = self.get_object(kwargs['pk'])
            payload = self.serializer_class(project, context={'request': request}).data
            if user.role == 'enterprise':
                payload["already_applied"] = ProjectApplication.objects.filter(
                    project=project,
                    applicant=user,
                ).exists()
            return Response({'project': payload})
        else:
            if user.role == 'Admin':
                projects = Project.objects.annotate(
                    applications_count=Count('applications', distinct=True),
                ).order_by('-created')
                search = (request.query_params.get("search") or "").strip()
                if search:
                    projects = projects.filter(
                        Q(title__icontains=search)
                        | Q(description__icontains=search)
                        | Q(department__icontains=search)
                        | Q(municipality__icontains=search)
                    )
                serializer = self.serializer_class(projects, many=True, context={'request': request})
                paginator = SmallSetPagination()
                page = paginator.paginate_queryset(projects, request)

                serializer = self.serializer_class(page, many=True, context={'request': request})
                return paginator.get_paginated_response({"projects": serializer.data})
            else:
                return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    def post(self, request):
        if request.user.role != 'Admin':
            return Response({'error': 'Only Admin can create projects'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data.copy()
        data.pop('amount', None)
        data['amount'] = 0
        if data.get('start_date') in ['undefined', '', None]:
            data.pop('start_date', None)
        if data.get('end_date') in ['undefined', '', None]:
            data.pop('end_date', None)
        date_error = _validate_dates_window(data.get('start_date'), data.get('end_date'))
        if date_error:
            return Response({'error': date_error}, status=status.HTTP_400_BAD_REQUEST)
        data['user'] = request.user.id
        serializer = ProjectSerializer(data=data)
        if serializer.is_valid():
            project = serializer.save()
            output = ProjectSerializer(project, context={'request': request})
            return Response(output.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, *args, **kwargs):
        if request.user.role != 'Admin':
            return Response({'error': 'Only Admin can edit projects'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
            data = request.data.copy()
            pk = data.get("id")
            if not pk and 'pk' in kwargs:
                pk = kwargs['pk']
            project = Project.objects.get(pk=pk)

            if data.get('title') and data['title'] not in ['undefined', '']:
                project.title = data['title']
            if data.get('description') and data['description'] not in ['undefined', '']:
                project.description = data['description']
            if data.get('department') and data['department'] not in ['undefined', '']:
                project.department = data['department']
            if data.get('municipality') and data['municipality'] not in ['undefined', '']:
                project.municipality = data['municipality']
            if data.get('priority') and data['priority'] not in ['undefined', '']:
                project.priority = data['priority']
            if data.get('status') and data['status'] in ['draft', 'published']:
                project.status = data['status']
            start_date_candidate = project.start_date
            end_date_candidate = project.end_date
            if 'start_date' in data:
                if data.get('start_date') in ['undefined', '', None]:
                    start_date_candidate = None
                else:
                    start_date_candidate = data['start_date']
            if 'end_date' in data:
                if data.get('end_date') in ['undefined', '', None]:
                    end_date_candidate = None
                else:
                    end_date_candidate = data['end_date']
            if 'start_date' in data or 'end_date' in data:
                date_error = _validate_dates_window(start_date_candidate, end_date_candidate)
                if date_error:
                    return Response({'error': date_error}, status=status.HTTP_400_BAD_REQUEST)
                project.start_date = start_date_candidate
                project.end_date = end_date_candidate
                
            project.save()
            return Response({'success': 'Proyecto Editado Correctamente.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ProjectMainView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        projects = Project.objects.filter(status="published").annotate(
            applications_count=Count('applications', distinct=True),
        ).order_by('-created')
        
        search = (request.query_params.get("search") or "").strip()
        if search:
            projects = projects.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        paginator = ProjectSetPagination()
        results = paginator.paginate_queryset(projects, request)
        serializer = ProjectSerializer(results, many=True, context={'request': request})
        return paginator.get_paginated_response({'projects': serializer.data})

class ApplyProjectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if request.user.role != "enterprise":
            return Response(
                {"error": "Solo empresarios pueden postularse."},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data.copy()
        project_id = data.get('project')
        
        if not project_id:
             return Response({'error': 'Project ID required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({'error': 'Project not found'}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        if project.start_date and project.start_date > now:
             return Response({'error': 'El proyecto aún no ha iniciado'}, status=status.HTTP_400_BAD_REQUEST)
        
        if project.end_date and project.end_date < now:
             return Response({'error': 'El proyecto ha finalizado'}, status=status.HTTP_400_BAD_REQUEST)

        if ProjectApplication.objects.filter(project=project, applicant=request.user).exists():
            return Response(
                {'error': 'Ya te postulaste a este proyecto.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data['applicant'] = request.user.id
        # El capital se asigna internamente; no se captura desde el formulario.
        data['capital_investment'] = 0
        
        serializer = ProjectApplicationSerializer(data=data)
        if serializer.is_valid():
            application = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AdminApplicationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != 'Admin':
             return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        project_id = request.query_params.get("project")
        search = (request.query_params.get("search") or "").strip()
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        applications = ProjectApplication.objects.all().select_related("project", "applicant")
        if project_id:
            applications = applications.filter(project_id=project_id)
        if search:
            applications = applications.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(project__title__icontains=search)
                | Q(applicant__enterprise__icontains=search)
                | Q(applicant__username__icontains=search)
            )
        if start_date:
            applications = applications.filter(created_at__date__gte=start_date)
        if end_date:
            applications = applications.filter(created_at__date__lte=end_date)

        applications = applications.order_by('-created_at')
        paginator = SmallSetPagination()
        page = paginator.paginate_queryset(applications, request)
        serializer = ProjectApplicationSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

class EnterpriseApplicationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != 'enterprise':
             return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        applications = ProjectApplication.objects.filter(applicant=request.user).select_related("project")
        applications = applications.order_by('-created_at')
        serializer = ProjectApplicationSerializer(applications, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class LicitationView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = LicitationOpportunitySerializer

    def get_object(self, pk):
        try:
            return LicitationOpportunity.objects.annotate(
                applications_count=Count('applications', distinct=True),
            ).get(pk=pk)
        except LicitationOpportunity.DoesNotExist:
            raise NotFound('Licitation not found')

    def get(self, request, *args, **kwargs):
        user = request.user
        if 'pk' in kwargs:
            licitation = self.get_object(kwargs['pk'])
            payload = self.serializer_class(licitation, context={'request': request}).data
            if user.role == 'enterprise':
                payload["already_applied"] = LicitationApplication.objects.filter(
                    licitation=licitation,
                    applicant=user,
                ).exists()
            return Response({'licitation': payload})
        else:
            if user.role == 'Admin':
                licitations = LicitationOpportunity.objects.annotate(
                    applications_count=Count('applications', distinct=True),
                ).order_by('-created')
                search = (request.query_params.get("search") or "").strip()
                if search:
                    licitations = licitations.filter(
                        Q(title__icontains=search)
                        | Q(description__icontains=search)
                        | Q(department__icontains=search)
                        | Q(municipality__icontains=search)
                    )
                paginator = SmallSetPagination()
                page = paginator.paginate_queryset(licitations, request)
                serializer = self.serializer_class(page, many=True, context={'request': request})
                return paginator.get_paginated_response({"licitations": serializer.data})
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

    def post(self, request):
        if request.user.role != 'Admin':
            return Response({'error': 'Only Admin can create licitations'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data.copy()
        if data.get('start_date') in ['undefined', '', None]:
            data.pop('start_date', None)
        if data.get('end_date') in ['undefined', '', None]:
            data.pop('end_date', None)
        date_error = _validate_dates_window(data.get('start_date'), data.get('end_date'))
        if date_error:
            return Response({'error': date_error}, status=status.HTTP_400_BAD_REQUEST)
        data['user'] = request.user.id
        serializer = LicitationOpportunitySerializer(data=data)
        if serializer.is_valid():
            licitation = serializer.save()
            output = LicitationOpportunitySerializer(licitation, context={'request': request})
            return Response(output.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, *args, **kwargs):
        if request.user.role != 'Admin':
            return Response({'error': 'Only Admin can edit licitations'}, status=status.HTTP_403_FORBIDDEN)

        try:
            data = request.data.copy()
            pk = data.get("id")
            if not pk and 'pk' in kwargs:
                pk = kwargs['pk']
            licitation = LicitationOpportunity.objects.get(pk=pk)

            if data.get('title') and data['title'] not in ['undefined', '']:
                licitation.title = data['title']
            if data.get('description') and data['description'] not in ['undefined', '']:
                licitation.description = data['description']
            if data.get('department') and data['department'] not in ['undefined', '']:
                licitation.department = data['department']
            if data.get('municipality') and data['municipality'] not in ['undefined', '']:
                licitation.municipality = data['municipality']
            if data.get('priority') and data['priority'] not in ['undefined', '']:
                licitation.priority = data['priority']
            if data.get('status') and data['status'] in ['draft', 'published']:
                licitation.status = data['status']
            start_date_candidate = licitation.start_date
            end_date_candidate = licitation.end_date
            if 'start_date' in data:
                if data.get('start_date') in ['undefined', '', None]:
                    start_date_candidate = None
                else:
                    start_date_candidate = data['start_date']
            if 'end_date' in data:
                if data.get('end_date') in ['undefined', '', None]:
                    end_date_candidate = None
                else:
                    end_date_candidate = data['end_date']
            if 'start_date' in data or 'end_date' in data:
                date_error = _validate_dates_window(start_date_candidate, end_date_candidate)
                if date_error:
                    return Response({'error': date_error}, status=status.HTTP_400_BAD_REQUEST)
                licitation.start_date = start_date_candidate
                licitation.end_date = end_date_candidate

            licitation.save()
            return Response({'success': 'Licitación editada correctamente.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class LicitationMainView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        licitations = LicitationOpportunity.objects.filter(status="published").annotate(
            applications_count=Count('applications', distinct=True),
        ).order_by('-created')

        search = (request.query_params.get("search") or "").strip()
        if search:
            licitations = licitations.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        paginator = ProjectSetPagination()
        results = paginator.paginate_queryset(licitations, request)
        serializer = LicitationOpportunitySerializer(results, many=True, context={'request': request})
        return paginator.get_paginated_response({'licitations': serializer.data})


class ApplyLicitationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if request.user.role != "enterprise":
            return Response(
                {"error": "Solo empresarios pueden postularse."},
                status=status.HTTP_403_FORBIDDEN,
            )

        data = request.data.copy()
        licitation_id = data.get('licitation')

        if not licitation_id:
            return Response({'error': 'Licitation ID required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            licitation = LicitationOpportunity.objects.get(id=licitation_id)
        except LicitationOpportunity.DoesNotExist:
            return Response({'error': 'Licitation not found'}, status=status.HTTP_404_NOT_FOUND)

        now = timezone.now()
        if licitation.start_date and licitation.start_date > now:
            return Response({'error': 'La licitación aún no ha iniciado'}, status=status.HTTP_400_BAD_REQUEST)

        if licitation.end_date and licitation.end_date < now:
            return Response({'error': 'La licitación ha finalizado'}, status=status.HTTP_400_BAD_REQUEST)

        if LicitationApplication.objects.filter(licitation=licitation, applicant=request.user).exists():
            return Response(
                {'error': 'Ya te postulaste a esta licitación.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        data['applicant'] = request.user.id
        serializer = LicitationApplicationSerializer(data=data)
        if serializer.is_valid():
            application = serializer.save()
            return Response(LicitationApplicationSerializer(application).data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AdminLicitationApplicationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != 'Admin':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        licitation_id = request.query_params.get("licitation")
        search = (request.query_params.get("search") or "").strip()
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        applications = LicitationApplication.objects.all().select_related("licitation", "applicant")
        if licitation_id:
            applications = applications.filter(licitation_id=licitation_id)
        if search:
            applications = applications.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(licitation__title__icontains=search)
                | Q(applicant__enterprise__icontains=search)
                | Q(applicant__username__icontains=search)
            )
        if start_date:
            applications = applications.filter(created_at__date__gte=start_date)
        if end_date:
            applications = applications.filter(created_at__date__lte=end_date)

        applications = applications.order_by('-created_at')
        paginator = SmallSetPagination()
        page = paginator.paginate_queryset(applications, request)
        serializer = LicitationApplicationSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class EnterpriseLicitationApplicationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != 'enterprise':
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        applications = LicitationApplication.objects.filter(applicant=request.user).select_related("licitation")
        applications = applications.order_by('-created_at')
        serializer = LicitationApplicationSerializer(applications, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
