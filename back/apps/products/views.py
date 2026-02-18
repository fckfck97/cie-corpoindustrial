from rest_framework.views import APIView
from .serializers import (
    ProductSerializer,
    ProductDashboardSerializer,
    ProductEmployeesSerializer,
    EmployeeBenefitListSerializer,
    ProductRedemptionSerializer,
)
from .models import Product, ProductRedemption, ProductViewLog
from rest_framework.response import Response
from rest_framework import status
from .utils.pagination import SmallSetPagination, ProductSetPagination
import datetime
from rest_framework.exceptions import NotFound
from django.db.models import Q, Count, Exists, OuterRef
from rest_framework.permissions import IsAuthenticated
from django.db.models import F
from urllib.parse import quote
from django.utils import timezone

class ProductView(APIView):
    serializer_class = ProductSerializer

    def get_object(self, pk):
        try:
            return Product.objects.get(pk=pk)
        except Product.DoesNotExist:
            raise NotFound('Product not found')

    def get(self, request, *args, **kwargs):
        user = request.user
        user_role = getattr(user, "role", None)
        enterprise_id = request.query_params.get('enterprise_id', None)
        today = timezone.localdate()
        if 'pk' in kwargs:
            base_qs = Product.objects.filter(pk=kwargs['pk']).annotate(
                redemptions_count=Count("redemptions", distinct=True),
            )
            if user_role == "employees":
                already_redeemed_subquery = ProductRedemption.objects.filter(
                    product_id=OuterRef("pk"),
                    employee=user,
                    redeemed_date=today,
                )
                base_qs = base_qs.annotate(already_redeemed=Exists(already_redeemed_subquery))
            product = base_qs.first()
            if not product:
                raise NotFound('Product not found')
            if user_role == 'Admin':
                serializer = ProductEmployeesSerializer(product)
            elif user_role == 'enterprise':
                # if product.user != user:
                #     return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
                serializer = ProductEmployeesSerializer(product)
            elif user_role == "employees":
                _, created = ProductViewLog.objects.get_or_create(
                    product=product,
                    viewer=user,
                )
                if created:
                    Product.objects.filter(pk=product.pk).update(views=F('views') + 1)
                serializer = ProductEmployeesSerializer(product)
            else:
                return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
            return Response({'product': serializer.data})
        else:
            if user_role == 'Admin':
                products = Product.objects.all()
            elif user_role == 'enterprise':
                products = Product.objects.filter(user=user).annotate(
                    redemptions_count=Count("redemptions", distinct=True),
                )
                if enterprise_id and enterprise_id != str(user.id):
                    return Response({'error': 'Not authorized to view other enterprise job boards'}, status=status.HTTP_403_FORBIDDEN)
            elif user_role == "employees":
                already_redeemed_subquery = ProductRedemption.objects.filter(
                    product_id=OuterRef("pk"),
                    employee=user,
                    redeemed_date=today,
                )
                products = Product.objects.filter(user=enterprise_id).annotate(
                    redemptions_count=Count("redemptions", distinct=True),
                    already_redeemed=Exists(already_redeemed_subquery),
                )
            else:
                return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)

            products = products.filter(Q(finished=False) | Q(finished__isnull=True)).order_by('-created')
            serializer = self.serializer_class(products, many=True, context={'request': request})
            serialized_data = serializer.data

            paginator = SmallSetPagination()
            result_page = paginator.paginate_queryset(serialized_data, request)
            return paginator.get_paginated_response({'products': result_page})
        
    def post(self, request):
        data = request.data.copy()  # Create a mutable copy of the QueryDict
        data['user'] = request.user.id
        serializer = ProductSerializer(data=data)
        if serializer.is_valid():
            product = serializer.save()
            output = ProductSerializer(product, context={'request': request})
            return Response(output.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def put(self, request, *args, **kwargs):
        try:
            data = request.data
            pk = data["id"]
            product = Product.objects.get(pk=pk)

            # actualizar categoria por partes
            if data.get('name') and data['name'] not in ['undefined', '']:
                product.name = data['name']

            if data.get('description') and data['description'] not in ['undefined', '']:
                product.description = data['description']

            if data.get('price') and data['price'] not in ['undefined', '']:
                product.price = data['price']

            if data.get('image') and data['image'] not in ['undefined', '']:
                product.image = data['image']

            if data.get('category') and data['category'] not in ['undefined', '']:
                product.category = data['category']

            if data.get('subcategory') and data['subcategory'] not in ['undefined', '']:
                product.subcategory = data['subcategory']

            if data.get('extracategory') and data['extracategory'] not in ['undefined', '']:
                product.extracategory = data['extracategory']

            product.updated_at = datetime.datetime.now()

            product.save()
            return Response({'success': 'Producto Editado Correctamente.'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': 'Error al Editar el Producto: {}'.format(e)}, status=status.HTTP_400_BAD_REQUEST)

class ProductDashboard(APIView):
    
    serializer_class = ProductDashboardSerializer
    
    def get(self, request, *args, **kwargs):
        if Product.objects.all().exists():
            products = Product.objects.filter(Q(finished=False) | Q(finished__isnull=True)).order_by('-created')
            paginator = ProductSetPagination()
            results = paginator.paginate_queryset(products, request)
            serializer = self.serializer_class(results, many=True)
            return paginator.get_paginated_response({'products': serializer.data})
        else:
            return Response({'error': 'No products found'}, status=status.HTTP_404_NOT_FOUND)

class EmployeeBenefitsListView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EmployeeBenefitListSerializer

    def get(self, request, *args, **kwargs):
        if request.user.role != "employees":
            return Response(
                {"detail": "Solo empleados."},
                status=status.HTTP_403_FORBIDDEN,
            )

        today = timezone.localdate()
        search = (request.query_params.get("search") or "").strip()
        enterprise_id = (request.query_params.get("enterprise_id") or "").strip()
        already_redeemed_subquery = ProductRedemption.objects.filter(
            product_id=OuterRef("pk"),
            employee=request.user,
            redeemed_date=today,
        )
        benefits = (
            Product.objects.filter(
                user__role="enterprise",
                user__is_active=True,
            )
            .filter(Q(finished=False) | Q(finished__isnull=True))
            .annotate(
                redemptions_count=Count("redemptions", distinct=True),
                already_redeemed=Exists(already_redeemed_subquery),
            )
            .select_related("user")
            .order_by("-created")
        )
        if enterprise_id:
            benefits = benefits.filter(user_id=enterprise_id)
        if search:
            benefits = benefits.filter(
                Q(name__icontains=search)
                | Q(description__icontains=search)
                | Q(category__icontains=search)
                | Q(subcategory__icontains=search)
                | Q(extracategory__icontains=search)
                | Q(user__enterprise__icontains=search)
                | Q(user__username__icontains=search)
            )
        paginator = SmallSetPagination()
        paginated = paginator.paginate_queryset(benefits, request)
        serializer = self.serializer_class(paginated, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)

class ProductRedeemView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, *args, **kwargs):
        if request.user.role != "employees":
            return Response({"error": "Solo empleados pueden canjear beneficios."}, status=status.HTTP_403_FORBIDDEN)

        product = Product.objects.filter(
            pk=pk,
            user__role="enterprise",
            user__is_active=True,
        ).first()
        if not product:
            return Response({"error": "Beneficio no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        today = timezone.localdate()
        enterprise_name = product.user.enterprise or product.user.username if product.user else ""
        redemption, created = ProductRedemption.objects.get_or_create(
            product=product,
            employee=request.user,
            redeemed_date=today,
            defaults={
                "enterprise": product.user,
                "product_id_snapshot": product.id,
                "product_name_snapshot": product.name,
                "enterprise_name_snapshot": enterprise_name,
            },
        )

        if not created:
            return Response({"detail": "Ya canjeaste este beneficio."}, status=status.HTTP_200_OK)

        return Response({"detail": "Beneficio canjeado correctamente."}, status=status.HTTP_201_CREATED)

class EnterpriseBenefitsQrView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != "enterprise":
            return Response({"error": "Solo empresas."}, status=status.HTTP_403_FORBIDDEN)

        benefits_path = f"/employees/benefits?enterprise_id={request.user.id}&benefit=1&source=qr"
        login_path = f"/login?next={quote(benefits_path, safe='')}"
        frontend_origin = request.META.get("HTTP_ORIGIN")
        benefits_url = f"{frontend_origin}{benefits_path}" if frontend_origin else request.build_absolute_uri(benefits_path)
        login_url = f"{frontend_origin}{login_path}" if frontend_origin else request.build_absolute_uri(login_path)

        return Response(
            {
                "enterprise_id": str(request.user.id),
                "benefits_path": benefits_path,
                "benefits_url": benefits_url,
                "login_path": login_path,
                "login_url": login_url,
                "qr_payload": login_url,
            },
            status=status.HTTP_200_OK,
        )

class EnterpriseBenefitRedemptionsReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != "enterprise":
            return Response({"error": "Solo empresas."}, status=status.HTTP_403_FORBIDDEN)

        products = Product.objects.filter(user=request.user).annotate(
            redemptions_count=Count("redemptions", distinct=True),
        ).order_by("-created")
        product_serializer = ProductSerializer(products, many=True, context={"request": request})

        redemptions = ProductRedemption.objects.filter(
            enterprise=request.user,
        ).select_related("product", "employee", "enterprise")
        redemptions_serializer = ProductRedemptionSerializer(redemptions, many=True, context={"request": request})

        return Response(
            {
                "products": product_serializer.data,
                "redemptions": redemptions_serializer.data,
                "meta": {
                    "total_redemptions": redemptions.count(),
                },
            },
            status=status.HTTP_200_OK,
        )

class EmployeeBenefitRedemptionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != "employees":
            return Response({"error": "Solo empleados."}, status=status.HTTP_403_FORBIDDEN)

        redemptions = ProductRedemption.objects.filter(employee=request.user).select_related(
            "product",
            "enterprise",
            "employee",
        )
        serializer = ProductRedemptionSerializer(redemptions, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

class AdminBenefitRedemptionsReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        if request.user.role != "Admin":
            return Response({"error": "Solo admin."}, status=status.HTTP_403_FORBIDDEN)

        # Filtros
        enterprise_id = request.query_params.get("enterprise_id", "").strip()
        month = request.query_params.get("month", "").strip()  # formato: YYYY-MM
        search = request.query_params.get("search", "").strip()

        redemptions = ProductRedemption.objects.select_related(
            "product",
            "enterprise",
            "employee",
        )

        # Aplicar filtros
        if enterprise_id:
            redemptions = redemptions.filter(enterprise_id=enterprise_id)
        
        if month:
            try:
                year, month_num = month.split("-")
                redemptions = redemptions.filter(
                    redeemed_date__year=int(year),
                    redeemed_date__month=int(month_num),
                )
            except (ValueError, AttributeError):
                pass

        if search:
            redemptions = redemptions.filter(
                Q(product_name_snapshot__icontains=search)
                | Q(product__name__icontains=search)
                | Q(employee__first_name__icontains=search)
                | Q(employee__last_name__icontains=search)
                | Q(employee__email__icontains=search)
                | Q(enterprise__enterprise__icontains=search)
                | Q(enterprise__username__icontains=search)
                | Q(enterprise_name_snapshot__icontains=search)
            )

        redemptions = redemptions.order_by("-redeemed_at")
        serializer = ProductRedemptionSerializer(redemptions, many=True, context={"request": request})

        # Resumen por empresa con los mismos filtros
        by_enterprise_qs = ProductRedemption.objects.all()
        if enterprise_id:
            by_enterprise_qs = by_enterprise_qs.filter(enterprise_id=enterprise_id)
        if month:
            try:
                year, month_num = month.split("-")
                by_enterprise_qs = by_enterprise_qs.filter(
                    redeemed_date__year=int(year),
                    redeemed_date__month=int(month_num),
                )
            except (ValueError, AttributeError):
                pass
        if search:
            by_enterprise_qs = by_enterprise_qs.filter(
                Q(product_name_snapshot__icontains=search)
                | Q(product__name__icontains=search)
                | Q(employee__first_name__icontains=search)
                | Q(employee__last_name__icontains=search)
                | Q(employee__email__icontains=search)
                | Q(enterprise__enterprise__icontains=search)
                | Q(enterprise__username__icontains=search)
                | Q(enterprise_name_snapshot__icontains=search)
            )

        by_enterprise = (
            by_enterprise_qs.values(
                "enterprise",
                "enterprise__enterprise",
                "enterprise__username",
            )
            .annotate(total=Count("id"))
            .order_by("-total")
        )

        # Obtener lista de empresas únicas para el filtro
        all_enterprises = (
            ProductRedemption.objects.values(
                "enterprise",
                "enterprise__enterprise",
                "enterprise__username",
            )
            .distinct()
            .order_by("enterprise__enterprise")
        )

        return Response(
            {
                "redemptions": serializer.data,
                "by_enterprise": list(by_enterprise),
                "enterprises": list(all_enterprises),
                "meta": {
                    "total_redemptions": redemptions.count(),
                    "filtered": bool(enterprise_id or month or search),
                },
            },
            status=status.HTTP_200_OK,
        )
