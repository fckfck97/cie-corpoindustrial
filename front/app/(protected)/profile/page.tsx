'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { config } from '@/lib/config';
import { getImageUrl } from '@/lib/utils';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit, X, Save, User, Building, Phone, Mail, MapPin, Globe, Instagram, Facebook } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { getFrontendRoleLabel } from '@/lib/model-choice-labels';

type EnterpriseProfileApi = {
  enterprise?: {
    user?: {
      id?: string;
      email?: string;
      username?: string;
      first_name?: string;
      last_name?: string;
      enterprise?: string;
      role?: string;
      picture?: string;
      date_joined?: string;
    };
    document_type_enterprise?: string | null;
    nuip_enterprise?: string | null;
    description?: string | null;
    niche?: string | null;
    phone?: string | null;
    address?: string | null;
    facebook?: string | null;
    instagram?: string | null;
    X?: string | null;
  };
};

type EnterpriseForm = {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  enterprise: string;
  document_type_enterprise: string;
  nuip_enterprise: string;
  description: string;
  niche: string;
  phone: string;
  address: string;
  facebook: string;
  instagram: string;
  X: string;
};

const emptyEnterpriseForm: EnterpriseForm = {
  email: '',
  username: '',
  first_name: '',
  last_name: '',
  enterprise: '',
  document_type_enterprise: 'NIT',
  nuip_enterprise: '',
  description: '',
  niche: '',
  phone: '',
  address: '',
  facebook: '',
  instagram: '',
  X: '',
};

export default function ProfilePage() {
  const { user, restoreSession } = useAuth();
  const isEnterprise = user?.backendRole === 'enterprise' || user?.role === 'manager';

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canEditByTime, setCanEditByTime] = useState(true);
  const [editableUntil, setEditableUntil] = useState<Date | null>(null);
  const [enterpriseAvatar, setEnterpriseAvatar] = useState<string | undefined>(undefined);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [rutFile, setRutFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [enterpriseForm, setEnterpriseForm] = useState<EnterpriseForm>(emptyEnterpriseForm);

  const loadEnterpriseProfile = useCallback(async () => {
    if (!user?.id || !isEnterprise) return;

    setLoading(true);
    try {
      const response = await apiClient.get<EnterpriseProfileApi>(`/enterprise/profile/${user.id}/`);
      const enterprise = response?.enterprise;
      const enterpriseUser = enterprise?.user;

      setEnterpriseAvatar(enterpriseUser?.picture);
      setEnterpriseForm({
        email: enterpriseUser?.email || '',
        username: enterpriseUser?.username || '',
        first_name: enterpriseUser?.first_name || '',
        last_name: enterpriseUser?.last_name || '',
        enterprise: enterpriseUser?.enterprise || '',
        document_type_enterprise: enterprise?.document_type_enterprise || 'NIT',
        nuip_enterprise: enterprise?.nuip_enterprise || '',
        description: enterprise?.description || '',
        niche: enterprise?.niche || '',
        phone: enterprise?.phone || '',
        address: enterprise?.address || '',
        facebook: enterprise?.facebook || '',
        instagram: enterprise?.instagram || '',
        X: enterprise?.X || '',
      });

      const dateJoinedRaw = enterpriseUser?.date_joined;
      if (dateJoinedRaw) {
        const start = new Date(dateJoinedRaw);
        if (!Number.isNaN(start.getTime())) {
          const limit = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
          setEditableUntil(limit);
          setCanEditByTime(Date.now() <= limit.getTime());
        }
      }
      setPictureFile(null);
      setBannerFile(null);
      setRutFile(null);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo cargar el perfil empresarial.');
    } finally {
      setLoading(false);
    }
  }, [isEnterprise, user?.id]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (isEnterprise && user?.id) {
      loadEnterpriseProfile();
    }
  }, [isEnterprise, loadEnterpriseProfile, user?.id]);

  const canEditEnterprise = isEnterprise ? canEditByTime : true;

  const editableUntilText = useMemo(() => {
    if (!editableUntil) return '';
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(editableUntil);
  }, [editableUntil]);

  const handleEdit = () => {
    if (isEnterprise && !canEditEnterprise) {
      toast.error('Tu ventana de edición de 7 días ya expiró.');
      return;
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (isEnterprise) {
      loadEnterpriseProfile();
      return;
    }
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  };

  const handleSave = async () => {
    if (isEnterprise) {
      if (!user?.id) return;

      setSaving(true);
      try {
        const body = new FormData();
        body.append('id', user.id);
        body.append('email', enterpriseForm.email.trim());
        body.append('username', enterpriseForm.username.trim());
        body.append('first_name', enterpriseForm.first_name.trim());
        body.append('last_name', enterpriseForm.last_name.trim());
        body.append('enterprise', enterpriseForm.enterprise.trim());
        body.append('document_type_enterprise', enterpriseForm.document_type_enterprise);
        body.append('nuip_enterprise', enterpriseForm.nuip_enterprise.trim());
        body.append('description', enterpriseForm.description.trim());
        body.append('niche', enterpriseForm.niche.trim());
        body.append('phone', enterpriseForm.phone.trim());
        body.append('address', enterpriseForm.address.trim());
        body.append('facebook', enterpriseForm.facebook.trim());
        body.append('instagram', enterpriseForm.instagram.trim());
        body.append('X', enterpriseForm.X.trim());
        if (pictureFile) body.append('picture', pictureFile);
        if (bannerFile) body.append('banner', bannerFile);
        if (rutFile) body.append('rut', rutFile);

        await apiClient.put(`/enterprise/profile/edit/${user.id}/`, body);
        toast.success('Perfil empresarial actualizado.');
        setIsEditing(false);
        // Force refresh session
        localStorage.removeItem(config.auth.sessionKey);
        await restoreSession();
        await loadEnterpriseProfile();
      } catch (error: any) {
        toast.error(error?.message || 'No se pudo actualizar el perfil empresarial.');
      } finally {
        setSaving(false);
      }
      return;
    }

    toast.success('Perfil actualizado correctamente');
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-10 pb-10">
        {/* Encabezado */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-primary">Mi Perfil</h1>
            <p className="text-muted-foreground text-lg">
              {isEnterprise ? 'Gestiona la información de tu empresa.' : 'Visualiza y actualiza tu información personal.'}
            </p>
            {isEnterprise && editableUntilText && (
              <div className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${
                canEditEnterprise 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {canEditEnterprise
                  ? `Edición disponible hasta: ${editableUntilText}`
                  : `Periodo de edición finalizado: ${editableUntilText}`}
              </div>
            )}
          </div>
          
          {!isEditing ? (
            <Button 
              onClick={handleEdit} 
              disabled={isEnterprise && !canEditEnterprise}
              className="gap-2 shadow-sm"
              size="lg"
            >
              <Edit className="h-4 w-4" />
              Editar Perfil
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={saving} size="lg">
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving || (isEnterprise && !canEditEnterprise)} size="lg">
                {saving ? (
                   <>
                     <span className="animate-spin mr-2">⏳</span> Guardando...
                   </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Guardar Cambios
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {!isEnterprise ? (
          /* Perfil de Usuario Normal */
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-4 lg:col-span-3 space-y-6">
              <div className="flex flex-col items-center p-6 bg-card rounded-xl border shadow-sm text-center">
                 <Avatar className="h-32 w-32 border-4 border-background shadow-md mb-4">
                  <AvatarImage src={getImageUrl(user?.avatar)} alt={user?.name} className="object-cover" />
                  <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-bold">{form.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{getFrontendRoleLabel(user?.role)}</p>
                <div className="w-full border-t pt-4 mt-2 grid grid-cols-1 gap-2 text-sm text-left">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" /> {user?.username || 'Sin usuario'}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-8 lg:col-span-9">
              <div className="bg-card rounded-xl border shadow-sm p-6 sm:p-8">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> Información Personal
                </h3>
                
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full-name" className="text-foreground/80">Nombre Completo</Label>
                    <Input
                      id="full-name"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      disabled={!isEditing}
                      className="bg-background/50"
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="role" className="text-foreground/80">Rol Asignado</Label>
                    <Input id="role" value={getFrontendRoleLabel(user?.role)} disabled className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground/80">Correo Electrónico</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        disabled={!isEditing}
                        className="pl-9 bg-background/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-foreground/80">Teléfono</Label>
                    <div className="relative">
                       <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                        disabled={!isEditing}
                        className="pl-9 bg-background/50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Perfil de Empresa */
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Columna Izquierda: Logo y Resumen */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-card rounded-xl border shadow-sm p-6 flex flex-col items-center text-center">
                 <div className="relative mb-6 group">
                    <Avatar className="h-40 w-40 border-4 border-background shadow-lg">
                      <AvatarImage src={getImageUrl(enterpriseAvatar)} alt={enterpriseForm.enterprise} className="object-cover" />
                      <AvatarFallback className="text-5xl bg-primary/10 text-primary">
                        {enterpriseForm.enterprise ? getInitials(enterpriseForm.enterprise) : 'E'}
                      </AvatarFallback>
                    </Avatar>
                    {isEditing && canEditEnterprise && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Label htmlFor="avatar-upload" className="cursor-pointer text-white flex flex-col items-center">
                          <Edit className="h-6 w-6 mb-1" />
                          <span className="text-xs">Cambiar Logo</span>
                        </Label>
                        <Input
                          id="avatar-upload"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setPictureFile(e.target.files?.[0] || null)}
                          className="hidden"
                        />
                      </div>
                    )}
                 </div>
                 
                 <h2 className="text-xl font-bold">{enterpriseForm.enterprise || 'Nombre Empresa'}</h2>
                 <p className="text-sm text-muted-foreground mt-1 mb-4">{enterpriseForm.niche || 'Sector no definido'}</p>
                 
                 <div className="w-full space-y-3 pt-4 border-t text-sm">
                    {enterpriseForm.email && (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate">{enterpriseForm.email}</span>
                      </div>
                    )}
                    {enterpriseForm.phone && (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{enterpriseForm.phone}</span>
                      </div>
                    )}
                    {enterpriseForm.address && (
                      <div className="flex items-center gap-3 text-muted-foreground text-left">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="line-clamp-2">{enterpriseForm.address}</span>
                      </div>
                    )}
                 </div>
              </div>
              
              {/* Card de Banner */}
              <div className="bg-card rounded-xl border shadow-sm p-6">
                 <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Banner de Perfil</h3>
                 <div className="aspect-[3/1] bg-muted rounded-lg overflow-hidden border relative flex items-center justify-center">
                    {/* Preview logic would go here if we had the current banner URL separately or reused a state */}
                    <p className="text-xs text-muted-foreground">Banner visualización</p>
                 </div>
                 {isEditing && canEditEnterprise && (
                    <div className="mt-4">
                       <Label className="text-xs mb-1.5 block">Subir nuevo banner</Label>
                       <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                        disabled={!isEditing || !canEditEnterprise}
                        className="text-xs"
                      />
                    </div>
                 )}
              </div>
            </div>

             {/* Columna Derecha: Formulario detallado */}
            <div className="lg:col-span-8 space-y-6">
              {loading ? (
                <div className="py-20 text-center text-muted-foreground animate-pulse">Cargando información...</div>
              ) : (
                <div className="bg-card rounded-xl border shadow-sm p-6 sm:p-8 space-y-8">
                  
                  {/* Sección Datos Básicos */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
                       <Building className="h-5 w-5" /> Datos de la Empresa
                    </h3>
                    <div className="grid gap-5 md:grid-cols-2">
                       <div className="space-y-2 md:col-span-2">
                        <Label>Nombre Comercial / Razón Social</Label>
                        <Input
                          value={enterpriseForm.enterprise}
                          onChange={(e) => setEnterpriseForm((p) => ({ ...p, enterprise: e.target.value }))}
                          disabled={!isEditing || !canEditEnterprise}
                          className="font-medium"
                        />
                      </div>
                      
                      <div className="space-y-2">
                         <Label>Tipo Documento</Label>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={enterpriseForm.document_type_enterprise}
                            onChange={(e) => setEnterpriseForm((p) => ({ ...p, document_type_enterprise: e.target.value }))}
                            disabled={!isEditing || !canEditEnterprise}
                          >
                            <option value="NIT">NIT</option>
                            <option value="CC">CC</option>
                            <option value="CE">CE</option>
                            <option value="PAS">Pasaporte</option>
                          </select>
                      </div>
                       <div className="space-y-2">
                        <Label>Número Documento / NUIP</Label>
                        <Input
                          value={enterpriseForm.nuip_enterprise}
                          onChange={(e) => setEnterpriseForm((p) => ({ ...p, nuip_enterprise: e.target.value }))}
                          disabled={!isEditing || !canEditEnterprise}
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label>Descripción de la Empresa</Label>
                        <Textarea
                          value={enterpriseForm.description}
                          onChange={(e) => setEnterpriseForm((p) => ({ ...p, description: e.target.value }))}
                          disabled={!isEditing || !canEditEnterprise}
                          rows={4}
                          className="resize-none"
                          placeholder="Describe brevemente a qué se dedica tu empresa..."
                        />
                      </div>
                       <div className="space-y-2">
                        <Label>Sector / Nicho de Mercado</Label>
                        <Input
                          value={enterpriseForm.niche}
                          onChange={(e) => setEnterpriseForm((p) => ({ ...p, niche: e.target.value }))}
                          disabled={!isEditing || !canEditEnterprise}
                         placeholder="Ej: Tecnología, Salud, Alimentos..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6"></div>

                   {/* Sección Contacto y Redes */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
                       <Globe className="h-5 w-5" /> Presencia Digital y Contacto
                    </h3>
                    <div className="grid gap-5 md:grid-cols-2">
                       <div className="space-y-2">
                        <Label>Correo Electrónico</Label>
                        <div className="relative">
                           <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                           <Input
                              value={enterpriseForm.email}
                              onChange={(e) => setEnterpriseForm((p) => ({ ...p, email: e.target.value }))}
                              disabled={!isEditing || !canEditEnterprise}
                              className="pl-9"
                           />
                        </div>
                      </div>
                       <div className="space-y-2">
                        <Label>Teléfono de Contacto</Label>
                         <div className="relative">
                           <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={enterpriseForm.phone}
                              onChange={(e) => setEnterpriseForm((p) => ({ ...p, phone: e.target.value }))}
                              disabled={!isEditing || !canEditEnterprise}
                               className="pl-9"
                            />
                         </div>
                      </div>
                       <div className="space-y-2 md:col-span-2">
                        <Label>Dirección Física</Label>
                        <div className="relative">
                           <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                           <Input
                              value={enterpriseForm.address}
                              onChange={(e) => setEnterpriseForm((p) => ({ ...p, address: e.target.value }))}
                              disabled={!isEditing || !canEditEnterprise}
                              className="pl-9"
                            />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Facebook</Label>
                        <div className="relative">
                           <Facebook className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={enterpriseForm.facebook}
                              onChange={(e) => setEnterpriseForm((p) => ({ ...p, facebook: e.target.value }))}
                              disabled={!isEditing || !canEditEnterprise}
                              className="pl-9"
                              placeholder="URL o Usuario"
                            />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Instagram</Label>
                         <div className="relative">
                           <Instagram className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={enterpriseForm.instagram}
                              onChange={(e) => setEnterpriseForm((p) => ({ ...p, instagram: e.target.value }))}
                              disabled={!isEditing || !canEditEnterprise}
                              className="pl-9"
                              placeholder="@usuario"
                            />
                         </div>
                      </div>
                       <div className="space-y-2 md:col-span-2">
                        <Label>X (Twitter)</Label>
                        <Input
                          value={enterpriseForm.X}
                          onChange={(e) => setEnterpriseForm((p) => ({ ...p, X: e.target.value }))}
                          disabled={!isEditing || !canEditEnterprise}
                          placeholder="@usuario"
                        />
                      </div>
                    </div>
                  </div>

                   <div className="border-t pt-6"></div>

                   {/* Sección Representante Legal (Usuario) */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
                       <User className="h-5 w-5" /> Representante Cuenta
                    </h3>
                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Nombres</Label>
                          <Input
                            value={enterpriseForm.first_name}
                            onChange={(e) => setEnterpriseForm((p) => ({ ...p, first_name: e.target.value }))}
                            disabled={!isEditing || !canEditEnterprise}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Apellidos</Label>
                          <Input
                            value={enterpriseForm.last_name}
                            onChange={(e) => setEnterpriseForm((p) => ({ ...p, last_name: e.target.value }))}
                            disabled={!isEditing || !canEditEnterprise}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nombre de Usuario</Label>
                          <Input
                            value={enterpriseForm.username}
                            onChange={(e) => setEnterpriseForm((p) => ({ ...p, username: e.target.value }))}
                            disabled={!isEditing || !canEditEnterprise}
                          />
                        </div>
                    </div>
                  </div>

                   {/* Documentos */}
                   <div>
                      <h3 className="font-semibold mb-3 pt-2">Documentación Legal</h3>
                      <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
                         <div className="flex-1">
                            <Label className="text-base font-medium">RUT Actualizado</Label>
                            <p className="text-xs text-muted-foreground mt-1">Sube el documento RUT en formato PDF o Imagen.</p>
                         </div>
                         <div className="flex-shrink-0">
                           <Input
                              type="file"
                              onChange={(e) => setRutFile(e.target.files?.[0] || null)}
                              disabled={!isEditing || !canEditEnterprise}
                              className="w-[200px]"
                            />
                         </div>
                      </div>
                   </div>

                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
