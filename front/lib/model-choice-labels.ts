export type JobStatus = 'draft' | 'published';
export type JobPriority = 'Baja' | 'Media' | 'Alta';
export type UserRoleBackend = 'employees' | 'enterprise' | 'Admin';
export type UserRoleFrontend = 'employee' | 'manager' | 'admin';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';
export type PaymentMethod = 'transfer' | 'cash' | 'card' | 'pse';
export type DocumentType = '' | 'CC' | 'CE' | 'PA' | 'TI' | 'RC' | 'PE' | 'PT';
export type EnterpriseDocumentType = '' | 'NIT' | 'CC';
export type GenderType = '' | 'Masculino' | 'Femenino' | 'Otro';

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
};

export const JOB_PRIORITY_LABELS: Record<JobPriority, string> = {
  Baja: 'Baja',
  Media: 'Media',
  Alta: 'Alta',
};

export const USER_ROLE_BACKEND_LABELS: Record<UserRoleBackend, string> = {
  employees: 'Empleado',
  enterprise: 'Empresa',
  Admin: 'Administrador',
};

export const USER_ROLE_FRONTEND_LABELS: Record<UserRoleFrontend, string> = {
  employee: 'Empleado',
  manager: 'Empresa',
  admin: 'Administrador',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  overdue: 'Vencido',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transfer: 'Transferencia',
  cash: 'Efectivo',
  card: 'Tarjeta',
  pse: 'PSE',
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  '': 'Seleccione un tipo de documento',
  CC: 'CEDULA DE CIUDADANIA',
  CE: 'CEDULA DE EXTRANJERIA',
  PA: 'PASAPORTE',
  TI: 'TARJETA DE IDENTIDAD',
  RC: 'REGISTRO CIVIL',
  PE: 'PERMISO ESPECIAL DE PERMANENCIA',
  PT: 'PERMISO DE PROTECCION TEMPORAL',
};

export const ENTERPRISE_DOCUMENT_TYPE_LABELS: Record<EnterpriseDocumentType, string> = {
  '': 'Seleccione un tipo de documento',
  NIT: 'NIT',
  CC: 'CEDULA DE CIUDADANIA',
};

export const GENDER_TYPE_LABELS: Record<GenderType, string> = {
  '': 'Seleccione un genero',
  Masculino: 'Masculino',
  Femenino: 'Femenino',
  Otro: 'Otro',
};

function getChoiceLabel<T extends string>(
  map: Record<string, string>,
  value?: T | string | null,
  emptyFallback = '-'
) {
  if (value === undefined || value === null || value === '') return emptyFallback;
  return map[value] || value;
}

export function getJobStatusLabel(value?: string | null) {
  return getChoiceLabel(JOB_STATUS_LABELS, value, '-');
}

export function getJobPriorityLabel(value?: string | null) {
  return getChoiceLabel(JOB_PRIORITY_LABELS, value, '-');
}

export function getBackendRoleLabel(value?: string | null) {
  return getChoiceLabel(USER_ROLE_BACKEND_LABELS, value, '-');
}

export function getFrontendRoleLabel(value?: string | null) {
  return getChoiceLabel(USER_ROLE_FRONTEND_LABELS, value, '-');
}

export function getPaymentMethodLabel(value?: string | null) {
  return getChoiceLabel(PAYMENT_METHOD_LABELS, value, '-');
}
