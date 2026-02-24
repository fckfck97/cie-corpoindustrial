"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ArrowLeft, Save, UploadCloud, MapPin, Briefcase } from "lucide-react";
import { toast } from "sonner";

import colombiaDataRaw from "@/utils/colombia.min.json";

interface City {
  id: number;
  departamento: string;
  ciudades: string[];
}
const colombiaData = colombiaDataRaw as City[];

export default function AdminCreateProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    department: "",
    municipality: "",
    priority: "Media",
    status: "published",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [availableCities, setAvailableCities] = useState<string[]>([]);

  useEffect(() => {
    if (formData.department) {
      const dept = colombiaData.find(
        (d) => d.departamento === formData.department,
      );
      setAvailableCities(dept ? dept.ciudades : []);
      // reset municipality if department changes
      setFormData((prev) => ({ ...prev, municipality: "" }));
    } else {
      setAvailableCities([]);
    }
  }, [formData.department]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) return "El título es obligatorio";
    if (!formData.department) return "El departamento es obligatorio";
    if (!formData.municipality) return "El municipio es obligatorio";
    if (!formData.amount || isNaN(Number(formData.amount)))
      return "Monto inválido";
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
        body.append(key, value);
      });
      if (imageFile) {
        body.append("image", imageFile);
      }

      await apiClient.post("/api/projects/", body);
      toast.success("Proyecto creado con éxito");
      router.push("/administrador/projects");
    } catch (err: any) {
      toast.error(err?.message || "Error al crear proyecto");
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
          <h1 className="text-2xl font-bold tracking-tight">
            Crear Nuevo Proyecto
          </h1>
          <p className="text-sm text-muted-foreground">
            Registra un proyecto para que los empresarios inviertan
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" /> Detalles del
              Proyecto
            </CardTitle>
            <CardDescription>
              Completa la información básica y de inversión
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="title">Título del Proyecto *</Label>
              <Input
                id="title"
                placeholder="Ej: Construcción de Planta Solar"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Describe los detalles, objetivos y alcance del proyecto"
                value={formData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                rows={5}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="amount">Capital / Monto a Invertir ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  max="999999999999999999"
                  placeholder="Ej: 500000000"
                  value={formData.amount}
                  onChange={(e) => handleInputChange("amount", e.target.value)}
                  required
                />
                {formData.amount && !isNaN(Number(formData.amount)) ? (
                  <p className="text-sm font-semibold text-primary">
                    {new Intl.NumberFormat("es-CO", {
                      style: "currency",
                      currency: "COP",
                      maximumFractionDigits: 0,
                    }).format(Number(formData.amount))}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Ingresa solo números sin puntos ni comas
                  </p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 p-4 bg-muted/30 rounded-lg border">
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Departamento *
                </Label>
                <Select
                  value={formData.department}
                  onValueChange={(val) => handleInputChange("department", val)}
                >
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
                  onValueChange={(val) =>
                    handleInputChange("municipality", val)
                  }
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
                <Label>Estado de Publicación</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => handleInputChange("status", val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="draft">Borrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Prioridad</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) => handleInputChange("priority", val)}
                >
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

            <div className="grid gap-2 pt-4 border-t">
              <Label>Imagen Principal</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="flex-1"
                />
                {imageFile && (
                  <div className="text-sm text-green-600 font-medium">
                    Archivo seleccionado
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">
                Formatos: JPG, PNG, WEBP
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="gap-2">
            <Save className="h-4 w-4" />
            {loading ? "Guardando..." : "Crear Proyecto"}
          </Button>
        </div>
      </form>
    </div>
  );
}
