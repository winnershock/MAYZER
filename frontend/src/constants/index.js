/**
 * constants/index.js
 * Responsabilidad : Constantes globales del frontend — listas de opciones y configuración.
 * Exporta         : TIPOS_DOC, NIVELES_ACADEMICOS, SECTORES, TIPOS_SANGRE,
 *                   TIPO_ENTIDAD_INFO, ROLES, ANIOS_FILTRO, API_BASE
 * Usado en        : pages/public/FormPublico.jsx, pages/admin/Aspirantes.jsx,
 *                   components/public/AspCard.jsx, components/public/SeccionTipo.jsx,
 *                   App.jsx y otros.
 * Depende de      : utils/fecha.js (generarRangoAnios)
 */
import { generarRangoAnios } from '../utils/fecha.js';

export const TIPOS_DOC = ['CC', 'CE', 'PA', 'TI', 'NIT', 'OTRO'];

export const NIVELES_ACADEMICOS = [
  'Primaria', 'Bachillerato', 'Técnico', 'Tecnólogo',
  'Profesional', 'Especialización', 'Maestría', 'Doctorado',
];

export const SECTORES = [
  'Agroindustrial', 'Comercio', 'Construcción', 'Educación', 'Energía',
  'Manufactura', 'Minería', 'Salud', 'Servicios', 'Tecnología', 'Transporte', 'Otro',
];

export const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// Genera dinámicamente: año actual + 2 años anteriores + 1 año siguiente.
// Se actualiza solo sin necesidad de modificar este archivo manualmente.
export const ANIOS_FILTRO = generarRangoAnios(2, 1);

// Opciones de estado para <select> — sin emojis para coherencia visual
export const ASP_ESTADOS_SELECT = [
  { val: 'PENDIENTE',    label: 'Pendiente'    },
  { val: 'PRE_APROBADO', label: 'Pre-aprobado' },
  { val: 'ASIGNADO',     label: 'Asignado'     },
  { val: 'RECHAZADO',    label: 'Rechazado'    },
];

export const SOL_ESTADOS_SELECT = [
  { val: 'PENDIENTE',   label: 'Pendiente'   },
  { val: 'EN_REVISION', label: 'En revisión' },
  { val: 'APROBADA',    label: 'Aprobada'    },
  { val: 'RECHAZADA',   label: 'Rechazada'   },
];

export const GRP_ESTADOS_SELECT = [
  { val: 'PROGRAMADO', label: 'Programado' },
  { val: 'EN_CURSO',   label: 'En curso'   },
  { val: 'FINALIZADO', label: 'Finalizado' },
];

export const ASP_VACIO = {
  nombre1: '', nombre2: '', apellido1: '', apellido2: '',
  tipo_documento: 'CC', numero_documento: '', email: '', telefono: '', fecha_nacimiento: '',
  medico:   { tipo_sangre: '', eps: '', arl: '', antecedentes: '', medicamentos: '' },
  contacto: { nombre: '', telefono: '', telefono_emergencia2: '', telefono_emergencia3: '' },
  laboral:  { nivel_academico: '', cargo: '', area_trabajo: '', sector: '', vinculacion: '' },
};

export const TIPO_ENTIDAD_INFO = {
  empresa:     { label: 'Empresa',               desc: 'Registro para empresas del sector industrial.' },
  'grupo SENA':{ label: 'Grupo SENA',            desc: 'Aprendices o grupos vinculados a SENA.' },
  persona:     { label: 'Persona independiente', desc: 'Individuo sin vínculo empresarial. Se registrará simultáneamente como empresa y aspirante.' },
};

// IDs de roles — deben coincidir con CAT.rol del backend (config/db.js)
export const ROL = {
  ADMIN:        1,
  INSTRUCTOR:   2,
  SUPERUSUARIO: 3,
};

// URL base de la API — usada para enlaces a archivos estáticos (documentos, etc.)
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Paletas de color para el calendario — compartidas por Calendario.jsx
// y cualquier otro módulo que necesite colorear eventos por grupo/instructor
export const CALENDAR_PALETTE_DARK = [
  '#FF6719', '#e05500', '#2563eb', '#9333ea',
  '#059669', '#dc2626', '#d97706', '#0891b2',
];

export const CALENDAR_PALETTE_LIGHT = [
  { bg: '#fff3ed', border: '#ff6719', text: '#b34400' },
  { bg: '#fde8d8', border: '#e05500', text: '#9a3b00' },
  { bg: '#eff6ff', border: '#2563eb', text: '#1e40af' },
  { bg: '#faf5ff', border: '#9333ea', text: '#6b21a8' },
  { bg: '#f0fdf4', border: '#059669', text: '#065f46' },
  { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
  { bg: '#fffbeb', border: '#d97706', text: '#92400e' },
  { bg: '#ecfeff', border: '#0891b2', text: '#164e63' },
];
