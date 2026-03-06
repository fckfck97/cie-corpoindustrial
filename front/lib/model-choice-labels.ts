export type JobStatus = 'draft' | 'published';
export type JobPriority = 'Baja' | 'Media' | 'Alta';
export type UserRoleBackend = 'employees' | 'enterprise' | 'Admin';
export type UserRoleFrontend = 'employee' | 'manager' | 'admin';
export type PaymentStatus = 'pending' | 'paid' | 'overdue';
export type PaymentMethod = 'transfer' | 'cash' | 'card' | 'pse';
export type DocumentType = '' | 'CC' | 'CE' | 'PA' | 'TI' | 'RC' | 'PE' | 'PT';
export type EnterpriseDocumentType = '' | 'NIT' | 'CC';
export type GenderType = '' | 'Masculino' | 'Femenino' | 'Otro';
export type ChoiceOption<T extends string> = { value: T; label: string };

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
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  PA: 'PASAPORTE',
  TI: 'Tarjeta de identidad',
  RC: 'Registro civil',
  PE: 'Permiso especial de permanencia',
  PT: 'Permiso de protección temporal',
};

export const ENTERPRISE_DOCUMENT_TYPE_LABELS: Record<EnterpriseDocumentType, string> = {
  '': 'Seleccione un tipo de documento',
  NIT: 'NIT',
  CC: 'Cédula de ciudadanía',
};

export const DOCUMENT_TYPE_OPTIONS: ChoiceOption<Exclude<DocumentType, ''>>[] = [
  { value: 'CC', label: DOCUMENT_TYPE_LABELS.CC },
  { value: 'CE', label: DOCUMENT_TYPE_LABELS.CE },
  { value: 'PA', label: DOCUMENT_TYPE_LABELS.PA },
  { value: 'TI', label: DOCUMENT_TYPE_LABELS.TI },
  { value: 'RC', label: DOCUMENT_TYPE_LABELS.RC },
  { value: 'PE', label: DOCUMENT_TYPE_LABELS.PE },
  { value: 'PT', label: DOCUMENT_TYPE_LABELS.PT },
];

export const ENTERPRISE_DOCUMENT_TYPE_OPTIONS: ChoiceOption<Exclude<EnterpriseDocumentType, ''>>[] = [
  { value: 'NIT', label: ENTERPRISE_DOCUMENT_TYPE_LABELS.NIT },
  { value: 'CC', label: ENTERPRISE_DOCUMENT_TYPE_LABELS.CC },
];

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

export function getPaymentStatusLabel(value?: string | null) {
  return getChoiceLabel(PAYMENT_STATUS_LABELS, value, 'Pendiente');
}

export function getDocumentTypeLabel(value?: string | null) {
  return getChoiceLabel(DOCUMENT_TYPE_LABELS, value, '-');
}

export function getEnterpriseDocumentTypeLabel(value?: string | null) {
  return getChoiceLabel(ENTERPRISE_DOCUMENT_TYPE_LABELS, value, '-');
}
