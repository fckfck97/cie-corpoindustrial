'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/DashboardLayout';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, MoreVertical, Pencil, Trash, Eye, Briefcase, Power, PowerOff, Search, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '@/lib/utils';
import { getJobPriorityLabel, getJobStatusLabel } from '@/lib/model-choice-labels';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RichTextEditor } from '@/components/RichTextEditor';

type Job = {
  id: string;
  title: string;
  description?: string;
  image?: string;
  priority?: string;
  status?: string;
  created?: string;
  start_date?: string;
  end_date?: string;
  applications_count?: number;
};

type JobsResponse = {
  results?: {
    jobs?: Job[];
  };
};

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // Edit State
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: 'Media',
    status: 'published',
    image: null as File | null,
    start_date: '',
    end_date: '',
  });

  // Preview State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewJob, setPreviewJob] = useState<Job | null>(null);

  // Delete State
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<JobsResponse>('/job/list/');
      setJobs(data?.results?.jobs || []);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo cargar empleos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const openEdit = (job: Job) => {
    setEditingJob(job);
    setEditForm({
      title: job.title || '',
      description: job.description || '',
      priority: job.priority || 'Media',
      status: job.status || 'published',
      image: null,
      start_date: job.start_date ? new Date(job.start_date).toISOString().slice(0, 16) : '',
      end_date: job.end_date ? new Date(job.end_date).toISOString().slice(0, 16) : '',
    });
    setEditOpen(true);
  };

  const openPreview = (job: Job) => {
    setPreviewJob(job);
    setPreviewOpen(true);
  };

  const confirmDelete = (job: Job) => {
    setJobToDelete(job);
    setDeleteOpen(true);
  }

  const onDelete = async () => {
      if (!jobToDelete) return;
      try {
          // Implement delete endpoint if available, currently just UI mocking
          // await apiClient.delete(`/job/delete/${jobToDelete.id}/`); 
          toast.error("Funcionalidad de eliminar no implementada en backend aún."); 
          setDeleteOpen(false);
          setJobToDelete(null);
          // await loadJobs();
      } catch (error: any) {
          toast.error("Error al eliminar el empleo.");
      }
  }

  const onEdit = async () => {
    if (!editingJob) return;
    setEditSubmitting(true);
    try {
      const body = new FormData();
      body.append('id', editingJob.id);
      body.append('title', editForm.title.trim());
      body.append('description', editForm.description.trim());
      body.append('priority', editForm.priority);
      body.append('status', editForm.status);
      if (editForm.start_date) body.append('start_date', new Date(editForm.start_date).toISOString());
      if (editForm.end_date) body.append('end_date', new Date(editForm.end_date).toISOString());
      if (editForm.image) body.append('image', editForm.image);

      await apiClient.put(`/job/edit/${editingJob.id}/`, body);
      toast.success('Empleo actualizado.');
      setEditOpen(false);
      setEditingJob(null);
      await loadJobs();
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo actualizar el empleo.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const toggleJobStatus = async (job: Job) => {
    const nextStatus = job.status === 'published' ? 'draft' : 'published';
    try {
      const body = new FormData();
      body.append('id', job.id);
      body.append('status', nextStatus);
      await apiClient.put(`/job/edit/${job.id}/`, body);
      toast.success(nextStatus === 'published' ? 'Oferta activada.' : 'Oferta desactivada.');
      await loadJobs();
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo cambiar el estado de la oferta.');
    }
  };

  const filteredJobs = useMemo(() => {
    let filtered = [...jobs];

    // Aplicar búsqueda
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          (job.title || '').toLowerCase().includes(search) ||
          (job.description || '').toLowerCase().includes(search)
      );
    }

    // Aplicar filtro de estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter((job) => job.status === statusFilter);
    }

    // Aplicar filtro de prioridad
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((job) => job.priority === priorityFilter);
    }

    return filtered;
  }, [jobs, searchTerm, statusFilter, priorityFilter]);

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || priorityFilter !== 'all';

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
              <Briefcase className="h-8 w-8 text-primary" />
              Mis Empleos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Administra tus ofertas de trabajo publicadas</p>
          </div>
          <Button className="gap-2" onClick={() => router.push('/enterprise/jobs/create')}>
            <Plus className="h-4 w-4" />
            Crear Empleo
          </Button>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros y Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Búsqueda */}
              <div className="space-y-2 md:col-span-3">
                <Label className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Búsqueda
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por título, descripción..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {searchTerm && (
                    <Button variant="ghost" size="icon" onClick={() => setSearchTerm('')}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Filtro de Estado */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="draft">Borrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Prioridad */}
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las prioridades</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex items-center gap-2">
                <Badge variant="secondary">Filtros activos</Badge>
                <Button onClick={clearFilters} variant="ghost" size="sm" className="h-7 gap-1">
                  <X className="h-3 w-3" />
                  Limpiar filtros
                </Button>
              </div>
            )}

            {searchTerm && (
              <div className="mt-2 text-sm text-muted-foreground">
                Mostrando {filteredJobs.length} de {jobs.length} empleos
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Empleos */}
        <Card>
          <CardHeader>
            <CardTitle>Listado de Empleos</CardTitle>
            <CardDescription>
              {loading ? 'Cargando...' : `Total: ${filteredJobs.length} empleo${filteredJobs.length !== 1 ? 's' : ''}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">Cargando...</div>
            ) : filteredJobs.length === 0 ? (
              <div className="py-10 text-center">
                <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {hasActiveFilters ? 'No se encontraron empleos con esos criterios' : 'No hay empleos registrados'}
                </p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Limpiar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3 font-semibold">Título</th>
                      <th className="p-3 font-semibold">Prioridad</th>
                      <th className="p-3 font-semibold">Estado</th>
                      <th className="p-3 font-semibold">Postulaciones</th>
                      <th className="p-3 font-semibold">Fecha</th>
                      <th className="p-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job) => (
                      <tr key={job.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-2">
                            {getImageUrl(job.image) && (
                              <img
                                src={getImageUrl(job.image)}
                                alt={job.title}
                                className="h-10 w-10 rounded-md object-cover border"
                              />
                            )}
                            <span className="line-clamp-2">{job.title}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge
                            variant={
                              job.priority === 'Alta'
                                ? 'destructive'
                                : job.priority === 'Media'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {getJobPriorityLabel(job.priority || '')}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge variant={job.status === 'published' ? 'default' : 'outline'}>
                            {getJobStatusLabel(job.status || '')}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="secondary" className="font-mono">
                            {job.applications_count || 0}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">
                          {job.created ? new Date(job.created).toLocaleDateString('es-ES') : '-'}
                        </td>
                        <td className="p-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openPreview(job)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Vista previa
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(job)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleJobStatus(job)}>
                                {job.status === 'published' ? (
                                  <>
                                    <PowerOff className="mr-2 h-4 w-4" />
                                    Desactivar
                                  </>
                                ) : (
                                  <>
                                    <Power className="mr-2 h-4 w-4" />
                                    Activar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => confirmDelete(job)}
                                className="text-destructive"
                              >
                                <Trash className="mr-2 h-4 w-4" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Empleo</DialogTitle>
              <DialogDescription>Actualiza datos de la oferta publicada.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-job-title">Título</Label>
                <Input
                  id="edit-job-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-job-priority">Prioridad</Label>
                  <select
                      id="edit-job-priority"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={editForm.priority}
                      onChange={(e) => setEditForm((p) => ({ ...p, priority: e.target.value }))}
                    >
                      <option value="Baja">Baja</option>
                      <option value="Media">Media</option>
                      <option value="Alta">Alta</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-job-status">Estado</Label>
                  <select
                    id="edit-job-status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={editForm.status}
                    onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                  >
                    <option value="published">Activo</option>
                    <option value="draft">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-start-date">Fecha Inicio</Label>
                  <Input
                    id="edit-start-date"
                    type="datetime-local"
                    value={editForm.start_date}
                    onChange={(e) => setEditForm((p) => ({ ...p, start_date: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-end-date">Fecha Fin</Label>
                  <Input
                    id="edit-end-date"
                    type="datetime-local"
                    value={editForm.end_date}
                    onChange={(e) => setEditForm((p) => ({ ...p, end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-job-image">Imagen (Opcional)</Label>
                <Input
                  id="edit-job-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditForm((p) => ({ ...p, image: e.target.files?.[0] || null }))}
                />
                {editingJob?.image ? (
                  <div className="mt-2">
                    <p className="mb-2 text-xs text-muted-foreground">Miniatura actual</p>
                    <div className="h-28 w-full overflow-hidden rounded-md border bg-muted">
                      <img
                        src={getImageUrl(editingJob.image)}
                        alt={editingJob.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-job-description">Descripción (HTML)</Label>
                <Textarea
                  id="edit-job-description"
                  rows={8}
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Puedes usar HTML básico aquí..."
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Se renderizará como HTML en la vista pública.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editSubmitting}>
                Cancelar
              </Button>
              <Button onClick={onEdit} disabled={editSubmitting}>
                {editSubmitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Vista previa de empleo</DialogTitle>
              <DialogDescription>Así verán los candidatos tu oferta.</DialogDescription>
            </DialogHeader>
            {previewJob && (
              <div className="space-y-6">
                <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden">
                {getImageUrl(previewJob.image) ? (
                  <img
                    src={getImageUrl(previewJob.image)}
                    alt={previewJob.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">Sin imagen</div>
                )}
                </div>
                
                <div className="space-y-4">
                    <div>
                        <h2 className="text-2xl font-bold">{previewJob.title}</h2>
                        <div className="flex flex-col gap-2 mt-2">
                            <div className="flex gap-2">
                                <Badge variant="secondary">Prioridad {getJobPriorityLabel(previewJob.priority)}</Badge>
                                <Badge variant="outline">{getJobStatusLabel(previewJob.status || 'published')}</Badge>
                            </div>
                            {(previewJob.start_date || previewJob.end_date) && (
                                <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                                    {previewJob.start_date && (
                                        <span>
                                            <span className="font-semibold">Inicio:</span> {new Date(previewJob.start_date).toLocaleDateString()}
                                        </span>
                                    )}
                                    {previewJob.end_date && (
                                        <span>
                                            <span className="font-semibold">Cierre:</span> {new Date(previewJob.end_date).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="prose prose-sm max-w-none border-t pt-4">
                        <div dangerouslySetInnerHTML={{ __html: previewJob.description || '' }} />
                    </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar empleo?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta acción no se puede deshacer. Esto eliminará permanentemente la oferta de empleo 
                        <strong> {jobToDelete?.title}</strong> y todos sus datos asociados.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </div>
    </DashboardLayout>
  );
}
