/**
 * components/layout/navConfig.js
 * Responsabilidad : Configuración estática de navegación y títulos de página.
 * Exporta         : NAV_ADMIN, NAV_INSTRUCTOR, PAGE_TITLES
 * Usado en        : components/layout/Sidebar.jsx, components/layout/Topbar.jsx
 */

export const NAV_ADMIN = [
  { group: 'PRINCIPAL', items: [
    { to: '/inicio',       icon: 'home',      label: 'Inicio' },
  ]},
  { group: 'GESTIÓN', items: [
    { to: '/solicitudes',  icon: 'clipboard', label: 'Solicitudes' },
    { to: '/empresas',     icon: 'building',  label: 'Empresas' },
    { to: '/aspirantes',   icon: 'user',      label: 'Aspirantes' },
    { to: '/grupos',       icon: 'users',     label: 'Grupos' },
  ]},
  { group: 'ACADÉMICO', items: [
    { to: '/cursos',       icon: 'book',      label: 'Cursos' },
    { to: '/instructores', icon: 'teacher',   label: 'Instructores' },
    { to: '/calendario',   icon: 'calendar',  label: 'Calendario' },
  ]},
  { group: 'HERRAMIENTAS', items: [
    { to: '/reportes',     icon: 'chart',     label: 'Reportes' },
  ]},
];

export const NAV_INSTRUCTOR = [
  { group: 'MI PANEL', items: [
    { to: '/inicio',     icon: 'home',     label: 'Inicio' },
    { to: '/calendario', icon: 'calendar', label: 'Calendario' },
    { to: '/grupos',     icon: 'users',    label: 'Mis grupos' },
  ]},
];

export const NAV_SUPER = [
  { group: 'PANEL', items: [
    { to: '/inicio',          icon: 'home',   label: 'Inicio' },
    { to: '/administradores', icon: 'shield', label: 'Administradores' },
  ]},
];

export const PAGE_TITLES = {
  '/inicio':          { title: 'Inicio',          sub: 'Panel principal' },
  '/solicitudes':     { title: 'Solicitudes',      sub: 'Gestión de solicitudes de formación' },
  '/aspirantes':      { title: 'Aspirantes',       sub: 'Revisión y asignación de aspirantes' },
  '/grupos':          { title: 'Grupos',           sub: 'Grupos de formación activos' },
  '/cursos':          { title: 'Cursos',           sub: 'Catálogo de cursos SENA' },
  '/instructores':    { title: 'Instructores',     sub: 'Equipo de instructores' },
  '/calendario':      { title: 'Calendario',       sub: 'Programación de clases' },
  '/reportes':        { title: 'Reportes',         sub: 'Estadísticas y exportaciones' },
  '/empresas':        { title: 'Empresas',         sub: 'Directorio de entidades registradas' },
  '/administradores': { title: 'Administradores',  sub: 'Gestión de cuentas de administrador' },
};

export const ROL_LABEL = { 1: 'Administrador', 2: 'Instructor', 3: 'Super Usuario' };
