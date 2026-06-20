/**
 * pages/public/FormPublico.jsx
 * Responsabilidad : Formulario público para envío de solicitudes de formación TSA.
 * Exporta         : FormPublico (default)
 * Depende de      : services/publico.service.js, components/public/*
 */
import './FormPublico.css';
import { useState, useEffect } from 'react';
import { PublicoService } from '../../services';
import Icon         from '../../components/common/Icon.jsx';
import AspCard        from '../../components/public/AspCard.jsx';
import PantallaExito  from '../../components/public/PantallaExito.jsx';
import SeccionTipo    from '../../components/public/SeccionTipo.jsx';
import SeccionEmpresa from '../../components/public/SeccionEmpresa.jsx';
import SeccionCurso   from '../../components/public/SeccionCurso.jsx';
import { ASP_VACIO }  from '../../constants/index.js';

const EMP_VACIO = {
  nombre: '', nit: '', email: '', telefono: '',
  direccion: '', nombre_contacto: '', cargo_contacto: '', ciudad_id: '', cupos: '',
};

const TIPO_LABELS = {
  empresa:      'Empresa',
  'grupo SENA': 'Aprendiz SENA',
  persona:      'Independiente',
};

export default function FormPublico() {
  const [step,        setStep]       = useState(1);
  const [cursos,      setCursos]     = useState([]);
  const [ciudades,    setCiudades]   = useState([]);
  const [tipoEntidad, setTipoEntidad] = useState('empresa');
  const [empresa,     setEmpresa]    = useState(EMP_VACIO);
  const [cursoId,     setCursoId]    = useState('');
  const [aspirantes,  setAspirantes] = useState([{ ...ASP_VACIO }]);
  const [pdfs,        setPdfs]       = useState([null]);
  const [enviando,    setEnviando]   = useState(false);
  const [enviado,     setEnviado]    = useState(false);
  const [error,       setError]      = useState('');

  useEffect(() => {
    PublicoService.listarCursos().then(r => setCursos(r.data)).catch(() => {});
    PublicoService.listarCiudades().then(r => setCiudades(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tipoEntidad === 'persona') {
      setAspirantes([{ ...ASP_VACIO }]);
      setPdfs([null]);
    }
  }, [tipoEntidad]);

  useEffect(() => {
    if (tipoEntidad !== 'persona') return;
    const a = aspirantes[0];
    const nombre = [a.nombre1, a.nombre2, a.apellido1, a.apellido2].filter(Boolean).join(' ');
    // Solo auto-rellena si el campo está vacío; respeta ediciones manuales del usuario
    setEmpresa(prev => ({
      ...prev,
      nombre:   prev.nombre   || nombre              || '',
      nit:      prev.nit      || a.numero_documento  || '',
      email:    prev.email    || a.email             || '',
      telefono: prev.telefono || a.telefono          || '',
    }));
  }, [
    aspirantes[0]?.nombre1, aspirantes[0]?.nombre2,
    aspirantes[0]?.apellido1, aspirantes[0]?.apellido2,
    aspirantes[0]?.numero_documento, aspirantes[0]?.email,
    aspirantes[0]?.telefono, tipoEntidad,
  ]);

  function changeAsp(idx, field, val) {
    setAspirantes(prev => {
      const copia = prev.map((a, i) => i === idx ? { ...a } : a);
      if (field.includes('.')) {
        const [sec, f] = field.split('.');
        copia[idx] = { ...copia[idx], [sec]: { ...copia[idx][sec], [f]: val } };
      } else {
        copia[idx] = { ...copia[idx], [field]: val };
      }
      return copia;
    });
  }

  const addAsp    = () => { setAspirantes(p => [...p, { ...ASP_VACIO }]); setPdfs(p => [...p, null]); };
  const removeAsp = idx => { setAspirantes(p => p.filter((_, i) => i !== idx)); setPdfs(p => p.filter((_, i) => i !== idx)); };
  const setPdf    = (idx, file) => setPdfs(p => p.map((v, i) => i === idx ? file : v));
  const empCh     = (field, val) => {
    setEmpresa(prev => ({ ...prev, [field]: val }));
    // Sincronizar cantidad de formularios cuando cambia "cupos"
    if (field === 'cupos' && tipoEntidad !== 'persona') {
      const n = Math.min(Math.max(parseInt(val, 10) || 1, 1), 50);
      setAspirantes(prev => {
        if (prev.length === n) return prev;
        if (n > prev.length) {
          return [...prev, ...Array(n - prev.length).fill(null).map(() => ({ ...ASP_VACIO }))];
        }
        return prev.slice(0, n);
      });
      setPdfs(prev => {
        if (prev.length === n) return prev;
        if (n > prev.length) return [...prev, ...Array(n - prev.length).fill(null)];
        return prev.slice(0, n);
      });
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    for (let i = 0; i < aspirantes.length; i++) {
      const a = aspirantes[i];
      const n = i + 1;
      if (!a.nombre1?.trim())            { setError(`Aspirante ${n}: el primer nombre es obligatorio`); return; }
      if (!a.apellido1?.trim())          { setError(`Aspirante ${n}: el primer apellido es obligatorio`); return; }
      if (!a.numero_documento?.trim())   { setError(`Aspirante ${n}: el número de documento es obligatorio`); return; }
      if (!a.email?.includes('@'))       { setError(`Aspirante ${n}: el correo electrónico es inválido`); return; }
      if (!a.telefono?.trim())           { setError(`Aspirante ${n}: el teléfono es obligatorio`); return; }
      if (!a.fecha_nacimiento)           { setError(`Aspirante ${n}: la fecha de nacimiento es obligatoria`); return; }
      if (!a.laboral?.nivel_academico)   { setError(`Aspirante ${n}: el nivel educativo es obligatorio`); return; }
      if (!a.contacto?.nombre?.trim())   { setError(`Aspirante ${n}: el nombre del contacto de emergencia es obligatorio`); return; }
      if (!a.contacto?.telefono?.trim()) { setError(`Aspirante ${n}: el teléfono del contacto de emergencia es obligatorio`); return; }
      if (!pdfs[i]) { setError(`Aspirante ${n}: el documento PDF es obligatorio`); return; }
    }
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify({ tipo_entidad: tipoEntidad, empresa, curso_id: cursoId, aspirantes }));
      pdfs.forEach((pdf, i) => { if (pdf) formData.append(`pdf_${i}`, pdf); });
      await PublicoService.enviarSolicitud(formData);
      setEnviado(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar la solicitud. Intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  }

  function resetFormulario() {
    setEnviado(false); setStep(1);
    setAspirantes([{ ...ASP_VACIO }]); setPdfs([null]);
    setCursoId(''); setEmpresa(EMP_VACIO); setError('');
  }

  const headingStep1 = { title: 'Registro de Solicitudes TSA', sub: 'Seleccione su tipo de perfil para comenzar' };

  if (enviado) {
    return (
      <div className="fp-shell">
        <FpTopbar />
        <PantallaExito onReset={resetFormulario} />
      </div>
    );
  }

  return (
    <div className="fp-shell">
      <FpTopbar />

      <div className="fp-body">
        <div className="fp-steps">
          <div className={"fp-step-dot" + (step === 1 ? " active" : " done")} />
          <div className={"fp-step-dot" + (step === 2 ? " active" : step > 2 ? " done" : "")} />
          <div className={"fp-step-dot" + (step === 3 ? " active" : "")} />
        </div>

        <div className="fp-heading">
          <h1>{step === 1 ? headingStep1.title : step === 2 ? 'Registro de Solicitudes TSA' : 'Datos aspirante'}</h1>
          <p>{step === 1 ? headingStep1.sub : step === 2 ? 'Complete la información del perfil seleccionado.' : 'Complete la información del aspirante asociada al perfil seleccionado.'}</p>
          {step > 1 && (
            <div className="fp-perfil-pill">
              Perfil: <strong className="fp-label-tipo">{TIPO_LABELS[tipoEntidad]}</strong>
            </div>
          )}
        </div>

        {step === 1 && (
          <>
            <SeccionTipo tipoEntidad={tipoEntidad} onChange={setTipoEntidad} />
            <div className="fp-actions">
              <button type="button" className="fp-btn-primary" onClick={() => setStep(2)}>
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <SeccionEmpresa tipoEntidad={tipoEntidad} empresa={empresa} ciudades={ciudades} onChange={empCh} />
            <SeccionCurso cursoId={cursoId} cursos={cursos} onChange={setCursoId} />
            {error && (
              <div className="fp-error">
                <Icon name="alert-triangle" size={14} /> {error}
              </div>
            )}
            <div className="fp-actions">
              <button type="button" className="fp-btn-primary" onClick={() => {
                setError('');
                if (!empresa.nombre?.trim())          { setError('El nombre de la empresa/entidad es obligatorio'); return; }
                if (!empresa.nombre_contacto?.trim()) { setError('El nombre del solicitante es obligatorio'); return; }
                if (!empresa.nit?.trim())             { setError('El NIT / número de documento es obligatorio'); return; }
                if (!empresa.email?.includes('@'))    { setError('El correo electrónico del solicitante es inválido'); return; }
                if (!empresa.telefono?.trim())        { setError('El número de teléfono es obligatorio'); return; }
                if (!empresa.ciudad_id)               { setError('La ciudad es obligatoria'); return; }
                if (!cursoId)                         { setError('Debe seleccionar un curso'); return; }
                setStep(3);
              }}>
                Siguiente
              </button>
              <button type="button" className="fp-btn-ghost" onClick={() => setStep(1)}>
                Volver
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmit} className="fp-form">
            <div className="fp-card">
              <div className="fp-card-header-row">
                <div className="fp-card-title fp-card-title--inline">
                  Aspirante{tipoEntidad !== 'persona' ? 's' : ''} ({aspirantes.length})
                </div>
                {tipoEntidad !== 'persona' && aspirantes.length < 50 && (
                  <button type="button"
                    className="fp-btn-submit"
                    onClick={addAsp}>
                    + Añadir aspirante
                  </button>
                )}
              </div>
              <div className="fp-asp-wrap">
                {aspirantes.map((asp, idx) => (
                  <AspCard
                    key={idx} asp={asp} idx={idx}
                    onChange={changeAsp} onRemove={removeAsp}
                    canRemove={tipoEntidad !== 'persona' && aspirantes.length > 1}
                    pdfFile={pdfs[idx]} onPdf={setPdf}
                  />
                ))}
              </div>
            </div>

            <div className="fp-consent">
              <strong>Ley 1581/2012 – Habeas Data:</strong> Los datos personales recopilados serán tratados
              exclusivamente por el SENA Sede Industrial Palmira con fines de gestión formativa. Al enviar
              este formulario autoriza el tratamiento de sus datos conforme a la política de privacidad del SENA.
            </div>

            {error && (
              <div className="fp-error">
                <Icon name="alert-triangle" size={14} /> {error}
              </div>
            )}

            <div className="fp-actions">
              <button type="submit" className="fp-btn-primary" disabled={enviando}>
                {enviando ? 'Enviando solicitud...' : 'Enviar solicitud'}
              </button>
              <button type="button" className="fp-btn-ghost" onClick={() => { setError(''); setStep(2); }}>
                Volver
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function FpTopbar() {
  return (
    <header className="fp-topbar">
      <div className="fp-topbar-brand">
        <div className="fp-topbar-logo">
          <img src="/logo-sena.svg" alt="SENA" />
        </div>
        <div>
          <div className="fp-topbar-name">Mayzer</div>
          <div className="fp-topbar-sub">Trabajo en alturas</div>
        </div>
      </div>

      {/* Botón Certificado SENA con tooltip informativo */}
      <div className="fp-cert-wrap">
        <a
          href="https://certificados.sena.edu.co/default.asp#result"
          target="_blank"
          rel="noopener noreferrer"
          className="fp-cert-btn"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="fp-icon-btn">
            <circle cx="12" cy="8" r="6"/><path d="M9 12l2 2 4-4"/>
            <path d="M8 21v-2a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v2"/>
          </svg>
          Certificado SENA
        </a>
        <div className="fp-cert-tooltip" role="tooltip">
          <strong>Valide su certificado en el portal oficial del SENA.</strong>
          <br /><br />
          Recuerde que debe validar en la página{' '}
          <strong>Certificado SENA Digital</strong> los cursos realizados con el
          SENA y confirmar que no se encuentra certificado en el nivel que desea
          solicitar.
        </div>
      </div>
    </header>
  );
}
