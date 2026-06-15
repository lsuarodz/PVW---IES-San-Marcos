import React, { useRef } from 'react';
import { generatePDF } from '../utils/pdf';
import { Download, BookOpen } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function Manual() {
  // Referencia al contenedor que queremos imprimir en PDF
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = useData();

  // Función para exportar el contenido a PDF usando html2pdf.js
  const exportPDF = () => {
    if (printRef.current) {
        const opt = {
          margin: 0.5,
          filename: 'Manual_Instrucciones_Proyecto_Intermodular.pdf',
          image: { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { 
            scale: 2,
            scrollY: 0,
            y: 0
          }, // Mayor escala para mejor calidad de texto
          jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'portrait' as const },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
      // Ejecutamos la conversión
      generatePDF(printRef.current, opt);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Manual de Instrucciones</h1>
          <p className="text-stone-500 mt-2">Guía de uso de la plataforma Proyecto Intermodular.</p>
        </div>
        <button
          onClick={exportPDF}
          className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <Download size={20} />
          Descargar PDF
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8" ref={printRef}>
        <div className="max-w-none text-stone-700">
          <div className="flex items-center gap-3 mb-6 border-b border-stone-200 pb-4">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-12 object-contain" crossOrigin="anonymous" />
            ) : (
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <BookOpen size={24} />
              </div>
            )}
            <h2 className="text-2xl font-bold text-stone-900">Manual de Usuario: Proyecto Intermodular</h2>
          </div>
          
          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-900">1. Introducción</h3>
          <p className="mb-4 leading-relaxed">
            Esta plataforma está diseñada para la gestión integral de ingredientes, escandallos (recetas), menús, minutas y pedidos en el entorno educativo. Permite estandarizar las recetas, calcular costes reales teniendo en cuenta las mermas, y generar listas de la compra precisas.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-900">2. Roles y Permisos</h3>
          <ul className="list-disc pl-6 mb-4 space-y-2 leading-relaxed">
            <li><strong>Tutor / Docente:</strong> Tiene acceso total a la plataforma. Puede gestionar usuarios (añadir alumnos y otros docentes), crear, editar y eliminar cualquier registro de la base de datos.</li>
            <li><strong>Alumno:</strong> Puede crear y editar ingredientes, recetas y menús. Su nombre y el de su grupo (si lo tiene asignado) quedará registrado en sus creaciones. No puede eliminar registros ni acceder a la gestión de usuarios.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-900">3. Gestión de Producción</h3>
          <p className="mb-4 leading-relaxed">
            Este bloque central de herramientas permite administrar todo el proceso de aprovisionamiento, estandarización técnica de recetas y planificación en la cocina.
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-4 leading-relaxed">
            <li>
              <strong>Proveedores:</strong> Registro de las empresas o entidades distribuidoras que suministran las materias primas, facilitando el control de contactos y asociación de ingredientes.
            </li>
            <li>
              <strong>Ingredientes:</strong> La base del sistema. Permite registrar cada producto indicando su proveedor, precio de compra y formato. El sistema calcula automáticamente el <strong>coste real de la materia prima aplicando el porcentaje de merma</strong>. También se configuran aquí los alérgenos para que se hereden en las recetas de forma automática.
            </li>
            <li>
              <strong>Elaborados y Platos:</strong> Permite realizar el escandallo de subrecetas ("Elaborados", como fondos, masas, etc.) y platos finales. Al añadir ingredientes e indicar la cantidad neta, se obtiene el precio de coste exacto por ración y los alérgenos unificados.
            </li>
            <li>
              <strong>Menús:</strong> Agrupación de platos para ofertas completas (Brunch, Menú Solidario, Cocktail). Suma automáticamente los costes de las recetas añadidas, consolida los alérgenos presentes y permite su exportación directa a PDF.
            </li>
            <li>
              <strong>Pedidos (Lista de la Compra):</strong> Calculadora para organizar eventos. Añade platos y menús indicando los comensales, y el sistema agrupará y sumará automáticamente todas las materias primas idénticas para generar una lista de compra unificada de proveedores.
            </li>
            <li>
              <strong>Listas de Trabajo:</strong> Herramienta esencial para la coordinación en cocina. Permite crear listas de las elaboraciones del día, organizar subtaras detalladas asignándoles prioridad, profesor, alumno responsable, elemento y plato correspondiente. Además, cuenta con un <strong>diseño de impresión optimizado</strong> que abrevia nombres de platos a la primera palabra y muestra una leyenda aclaratoria, adaptando el tamaño de letra para aprovechar al máximo el espacio de la mesa de cocina.
            </li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-900">4. Gestión Comercial</h3>
          <p className="mb-4 leading-relaxed">
            Habilitado especialmente para roles de gestión y docentes, este módulo ayuda a preparar ofertas externas y calcular márgenes.
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 leading-relaxed">
            <li><strong>Clientes:</strong> Base de datos de contactos corporativos, particulares o entidades asociadas a los servicios del centro educativo.</li>
            <li><strong>Presupuestos:</strong> Herramienta para la confección y valoración de los servicios de restauración para clientes externos, calculando costes comerciales con agilidad.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-900">5. Gestión de Usuarios (Solo Docentes/Tutores)</h3>
          <p className="mb-4 leading-relaxed">
            Control disciplinado de acceso y organización del centro.
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 leading-relaxed">
            <li><strong>Añadir Usuarios:</strong> Registro de nombres, correo de Google, rol (Alumno o Docente) y curso/grupo (ej. "1ºCOCINA").</li>
            <li><strong>Acceso:</strong> Únicamente los usuarios en esta lista podrán iniciar sesión de forma segura a través del proveedor de autenticación de Google.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
