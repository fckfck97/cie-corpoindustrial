from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Count, Q, Sum
from django.utils import timezone
from .models import Project, ProjectApplication
from .serializers import ProjectSerializer, ProjectDashboardSerializer, ProjectApplicationSerializer
from .utils.pagination import SmallSetPagination, ProjectSetPagination

class ProjectView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ProjectSerializer

    def get_object(self, pk):
        try:
            return Project.objects.annotate(
                applications_count=Count('applications', distinct=True),
                invested_amount=Sum('applications__capital_investment')
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
                    invested_amount=Sum('applications__capital_investment')
                ).order_by('-created')
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
            if data.get('amount') and data['amount'] not in ['undefined', '']:
                project.amount = data['amount']
            if data.get('department') and data['department'] not in ['undefined', '']:
                project.department = data['department']
            if data.get('municipality') and data['municipality'] not in ['undefined', '']:
                project.municipality = data['municipality']
            if data.get('priority') and data['priority'] not in ['undefined', '']:
                project.priority = data['priority']
            if data.get('status') and data['status'] in ['draft', 'published']:
                project.status = data['status']
            if data.get('image') and data['image'] not in ['undefined', '']:
                project.image = data['image']
            if data.get('start_date') and data['start_date'] not in ['undefined', '']:
                project.start_date = data['start_date']
            if data.get('end_date') and data['end_date'] not in ['undefined', '']:
                project.end_date = data['end_date']
                
            project.save()
            return Response({'success': 'Proyecto Editado Correctamente.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class ProjectMainView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        projects = Project.objects.filter(status="published").annotate(
            applications_count=Count('applications', distinct=True),
            invested_amount=Sum('applications__capital_investment')
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

        capital = data.get('capital_investment', 0)
        try:
            capital = float(capital)
        except (ValueError, TypeError):
             return Response({'error': 'Monto de inversión inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        if capital <= 0:
            return Response({'error': 'El monto a invertir debe ser mayor a 0.'}, status=status.HTTP_400_BAD_REQUEST)

        invested = ProjectApplication.objects.filter(project=project).aggregate(total=Sum('capital_investment'))['total'] or 0
        remaining = max(0, float(project.amount) - float(invested))

        if capital > remaining:
            return Response({'error': f'El monto supera el capital restante disponible (${remaining:,.2f}).'}, status=status.HTTP_400_BAD_REQUEST)

        data['applicant'] = request.user.id
        data['capital_investment'] = capital
        
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
        applications = ProjectApplication.objects.all().select_related("project", "applicant")
        if project_id:
            applications = applications.filter(project_id=project_id)

        applications = applications.order_by('-created_at')
        serializer = ProjectApplicationSerializer(applications, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

class EnterpriseApplicationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != 'enterprise':
             return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        applications = ProjectApplication.objects.filter(applicant=request.user).select_related("project")
        applications = applications.order_by('-created_at')
        serializer = ProjectApplicationSerializer(applications, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)
