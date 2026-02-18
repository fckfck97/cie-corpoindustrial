from .models import Complaints
from .serializers import ComplaintsSerializer
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from .utils.pagination import SmallSetPagination
from rest_framework.exceptions import NotFound
# Create your views here.

class ComplaintsView(APIView):
    serializer_class = ComplaintsSerializer

    def get_object(self, pk):
        try:
            return Complaints.objects.get(pk=pk)
        except Complaints.DoesNotExist:
            raise NotFound("Complaint not found")

    def retrieve(self, request, *args, **kwargs):
        complaint = self.get_object(kwargs['pk'])
        serializer = self.serializer_class(complaint)
        return Response(serializer.data)
      
    def get(self, request, *args, **kwargs):
        if "pk" in kwargs:
            complaint = self.get_object(kwargs["pk"])
            serializer = self.serializer_class(complaint)
            return Response({"complaint": serializer.data})

        complaints = Complaints.objects.all().order_by("-created")
        paginator = SmallSetPagination()
        results = paginator.paginate_queryset(complaints, request)
        serializer = self.serializer_class(results, many=True)
        return paginator.get_paginated_response({'complaints': serializer.data})

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, *args, **kwargs):
        if "pk" not in kwargs:
            return Response(
                {"error": "El id de la queja es requerido."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        complaint = self.get_object(kwargs["pk"])
        serializer = self.serializer_class(complaint, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
