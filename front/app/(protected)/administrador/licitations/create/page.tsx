"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Save, MapPin, Briefcase } from "lucide-react";
import { toast } from "sonner";

import colombiaDataRaw from "@/utils/colombia.min.json";

interface City {
  id: number;
  departamento: string;
  ciudades: string[];
}
const colombiaData = colombiaDataRaw as City[];
const dateToUtcIso = (dateStr: string) => `${dateStr}T00:00:00Z`;
const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const todayStr = () => {
  return formatLocalDate(new Date());
};
const nextDayStr = (dateStr: string) => {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return formatLocalDate(date);
};

export default function AdminCreateLicitationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    economic_sector: "",
    opportunity_type: "licitacion_publica",
    contracting_entity: "",
    general_scope: "",
    estimated_value: "",
    required_company_type: "",
    description: "",
    department: "",
    municipality: "",
    priority: "Media",
    status: "published",
    start_date: "",
    end_date: "",
  });
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  useEffect(() => {
    if (formData.department) {
      const dept = colombiaData.find((d) => d.departamento === formData.department);
      setAvailableCities(dept ? dept.ciudades : []);
      setFormData((prev) => ({ ...prev, municipality: "" }));
    } else {
      setAvailableCities([]);
    }
  }, [formData.department]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) return "El título es obligatorio";
    if (!formData.economic_sector.trim()) return "El sector económico es obligatorio";
    if (!formData.contracting_entity.trim()) return "La entidad contratante es obligatoria";
    if (!formData.general_scope.trim()) return "El alcance general es obligatorio";
    if (!formData.required_company_type.trim()) return "El tipo de empresa requerida es obligatorio";
    if (!formData.department) return "El departamento es obligatorio";
    if (!formData.municipality) return "El municipio es obligatorio";
    if (!formData.estimated_value || Number(formData.estimated_value) < 0) return "El valor estimado debe ser válido";
    if (!formData.start_date || !formData.end_date) return "Debes seleccionar fecha de inicio y fecha de cierre";
    if (formData.start_date < todayStr()) return "La fecha de inicio no puede ser anterior a hoy";
    if (formData.end_date <= formData.start_date) return "La fecha de cierre debe ser posterior a la fecha de inicio";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    setLoading(true);
    try {
      const body = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === "start_date" || key === "end_date") {
          if (value) body.append(key, dateToUtcIso(value));
          return;
        }
        body.append(key, value);
      });
      await apiClient.post("/api/licitations/", body);
      toast.success("Licitación creada con éxito");
      router.push("/administrador/licitations");
    } catch (err: any) {
      toast.error(err?.message || "Error al crear licitación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crear Nueva Licitación</h1>
          <p className="text-sm text-muted-foreground">Registra una oportunidad de licitación para empresas.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" /> Detalles de la Licitación
            </CardTitle>
            <CardDescription>Completa la información básica de la oportunidad</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Nombre del proyecto *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="economic_sector">Sector económico *</Label>
                <Input
                  id="economic_sector"
                  value={formData.economic_sector}
                  onChange={(e) => handleInputChange("economic_sector", e.target.value)}
                  placeholder="Ej. Construcción, Tecnología, Salud..."
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Tipo de oportunidad *</Label>
                <Select value={formData.opportunity_type} onValueChange={(val) => handleInputChange("opportunity_type", val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="licitacion_publica">Licitación pública</SelectItem>
                    <SelectItem value="contratacion_privada">Contratación privada</SelectItem>
                    <SelectItem value="alianza_empresarial">Alianza empresarial</SelectItem>
                    <SelectItem value="proyecto_inversion">Proyecto de inversión</SelectItem>
                    <SelectItem value="proveedor_estrategico">Proveedor estratégico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="contracting_entity">Entidad o empresa contratante *</Label>
                <Input
                  id="contracting_entity"
                  value={formData.contracting_entity}
                  onChange={(e) => handleInputChange("contracting_entity", e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="required_company_type">Tipo de empresa requerida *</Label>
                <Input
                  id="required_company_type"
                  value={formData.required_company_type}
                  onChange={(e) => handleInputChange("required_company_type", e.target.value)}
                  placeholder="Ej. Pyme industrial, integrador TIC..."
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="general_scope">Alcance general del proyecto *</Label>
              <Textarea
                id="general_scope"
                value={formData.general_scope}
                onChange={(e) => handleInputChange("general_scope", e.target.value)}
                rows={4}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="estimated_value">Valor estimado del proyecto (COP) *</Label>
              <Input
                id="estimated_value"
                type="number"
                min="0"
                step="0.01"
                value={formData.estimated_value}
                onChange={(e) => handleInputChange("estimated_value", e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción adicional</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={5}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg border">
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Departamento *
                </Label>
                <Select value={formData.department} onValueChange={(val) => handleInputChange("department", val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {colombiaData.map((dept) => (
                      <SelectItem key={dept.id} value={dept.departamento}>
                        {dept.departamento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Municipio / Ciudad *
                </Label>
                <Select
                  value={formData.municipality}
                  onValueChange={(val) => handleInputChange("municipality", val)}
                  disabled={!formData.department}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCities.map((city) => (
                      <SelectItem key={city} value={city}>
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label>Estado</Label>
                <Select value={formData.status} onValueChange={(val) => handleInputChange("status", val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Activo</SelectItem>
                    <SelectItem value="draft">Desactivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Prioridad</Label>
                <Select value={formData.priority} onValueChange={(val) => handleInputChange("priority", val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="start_date">Fecha de inicio</Label>
                <Input
                  id="start_date"
                  type="date"
                  min={todayStr()}
                  value={formData.start_date}
                  onChange={(e) => handleInputChange("start_date", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_date">Fecha de cierre</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  min={formData.start_date ? nextDayStr(formData.start_date) : undefined}
                  onChange={(e) => handleInputChange("end_date", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="gap-2">
            <Save className="h-4 w-4" />
            {loading ? "Guardando..." : "Crear Licitación"}
          </Button>
        </div>
      </form>
    </div>
  );
}
