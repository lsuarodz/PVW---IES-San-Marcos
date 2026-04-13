import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';
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
          html2canvas: { scale: 2 }, // Mayor escala para mejor calidad de texto
          jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };
      // Ejecutamos la conversión
      html2pdf().set(opt).from(printRef.current).save();
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

          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-900">3. Ingredientes</h3>
          <p className="mb-4 leading-relaxed">
            El módulo de ingredientes es la base del sistema. Aquí se registran todos los productos que se utilizarán posteriormente en las recetas.
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 leading-relaxed">
            <li><strong>Crear Ingrediente:</strong> Haz clic en "Nuevo Ingrediente". Debes indicar el nombre, proveedor, precio de compra, unidad de medida (kg, L, ud) y el porcentaje de merma.</li>
            <li><strong>Merma y Coste Real:</strong> El sistema calcula automáticamente el coste real por unidad aplicando el porcentaje de merma al precio de compra.</li>
            <li><strong>Alérgenos:</strong> Puedes marcar los alérgenos que contiene el ingrediente. Estos se heredarán automáticamente en las recetas y menús que lo utilicen.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-900">4. Escandallos (Recetas)</h3>
          <p className="mb-4 leading-relaxed">
            Permite crear fichas técnicas de recetas calculando su coste total de forma automática.
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 leading-relaxed">
            <li><strong>Añadir Receta:</strong> Define el nombre, número de raciones y añade los ingredientes necesarios seleccionándolos de la base de datos.</li>
            <li><strong>Cálculo de Costes:</strong> Al añadir ingredientes y especificar la cantidad necesaria, el sistema calcula el coste parcial de ese ingrediente y el coste total de la receta.</li>
            <li><strong>Elaboración:</strong> Puedes detallar los pasos de elaboración tanto en español como en inglés, así como añadir descripciones.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-900">5. Menús</h3>
          <p className="mb-4 leading-relaxed">
            Agrupa varias recetas para crear una oferta gastronómica completa.
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 leading-relaxed">
            <li><strong>Creación:</strong> Selecciona el tipo de menú (Brunch, Cocktail, Navidad, etc.) y añade las recetas que lo componen.</li>
            <li><strong>Resumen:</strong> El sistema suma el coste de todas las recetas incluidas y consolida los alérgenos presentes en el menú.</li>
            <li><strong>Exportar:</strong> Puedes descargar el menú en formato PDF para compartirlo o imprimirlo.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-900">6. Pedidos (Lista de la compra)</h3>
          <p className="mb-4 leading-relaxed">
            Calculadora de necesidades para eventos o servicios.
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 leading-relaxed">
            <li><strong>Añadir al carrito:</strong> Selecciona las recetas que vas a preparar y la cantidad (multiplicador de raciones).</li>
            <li><strong>Lista agregada:</strong> El sistema desglosa todas las recetas, suma las cantidades de ingredientes idénticos y genera una lista de la compra unificada con el coste total estimado.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-900">7. Traducciones</h3>
          <p className="mb-4 leading-relaxed">
            Herramienta integrada para traducir automáticamente los nombres de los ingredientes, recetas y pasos de elaboración al inglés, facilitando la creación de menús bilingües.
          </p>

          <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-900">8. Gestión de Usuarios (Solo Docentes/Tutores)</h3>
          <p className="mb-4 leading-relaxed">
            Control de acceso a la plataforma.
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-2 leading-relaxed">
            <li><strong>Añadir Usuarios:</strong> Introduce el nombre, correo de Google, rol (Alumno o Docente) y el grupo (ej. 1A).</li>
            <li><strong>Acceso:</strong> Solo los usuarios registrados en esta lista podrán iniciar sesión con su cuenta de Google. Si un alumno no está en la lista, el sistema le denegará el acceso.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
