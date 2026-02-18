from rest_framework import serializers
from .models import Complaints

class ComplaintsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaints
        fields = ('id', 'type_complaint', 'description', 'picture', 'user', 'created', 'updated')
  