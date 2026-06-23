import React, { useState, useRef } from 'react';
import { generatePDF } from '../utils/pdf';
import { Download, BookOpen, Code, Terminal, Server, Shield, FileText } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function Manual() {
  const [activeTab, setActiveTab] = useState<'usuario' | 'tecnico'>('usuario');
  // Referencia al contenedor que queremos imprimir en PDF
  const printRef = useRef<HTMLDivElement>(null);
  const { settings } = useData();

  // Función para exportar el contenido a PDF usando html2pdf.js
  const exportPDF = () => {
    if (printRef.current) {
      const opt = {
        margin: [0.3, 0.3, 0.3, 0.3], // Pequeños márgenes para maximizar contenido por página
        filename: activeTab === 'usuario' 
          ? 'Manual_Usuario_Proyecto_Intermodular.pdf'
          : 'Manual_Tecnico_Codigo_Proyecto_Intermodular.pdf',
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 1.5, // Balance de calidad/tamaño para documentos extensos
          scrollY: 0,
          y: 0,
          useCORS: true
        },
        jsPDF: { unit: 'in' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: 'css', avoid: ['.print-avoid-break', 'h1', 'h2', 'h3'] }
      };
      // Ejecutamos la conversión
      generatePDF(printRef.current, opt);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Manual de la Plataforma</h1>
          <p className="text-stone-500 mt-2">Guía operativa y técnica del Proyecto Intermodular.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Pestaña */}
          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-sm">
            <button
              onClick={() => setActiveTab('usuario')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'usuario'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen size={16} />
              Manual de Usuario
            </button>
            <button
              onClick={() => setActiveTab('tecnico')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'tecnico'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Code size={16} />
              Manual Técnico (Código)
            </button>
          </div>

          <button
            onClick={exportPDF}
            className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm hover:shadow flex items-center gap-2"
          >
            <Download size={20} />
            Descargar PDF
          </button>
        </div>
      </div>

      {/* Contenido Imprimible */}
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 md:p-12 print-container" ref={printRef}>
        <style>{`
          .print-container { background-color: #ffffff !important; color: #1c1917 !important; }
          .markdown-body h1, .markdown-body h2, .markdown-body h3 { page-break-after: avoid; }
          .print-avoid-break { page-break-inside: avoid; }
          pre { background-color: #f5f5f4 !important; color: #1c1917 !important; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 11px; white-space: pre-wrap; word-break: break-all; }
          code { font-family: monospace; font-size: 12px; font-weight: bold; }
        `}</style>

        {activeTab === 'usuario' ? (
          /* ========================================================================= */
          /* PESTAÑA: MANUAL DE USUARIO                                                */
          /* ========================================================================= */
          <div className="max-w-none text-stone-700">
            <div className="flex items-center gap-3 mb-6 border-b border-stone-200 pb-4">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="h-12 object-contain" crossOrigin="anonymous" />
              ) : (
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <BookOpen size={24} />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-stone-900">Manual de Usuario: Proyecto Intermodular</h2>
                <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Entorno de Producción Gastronómica</p>
              </div>
            </div>
            
            <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-900">1. Introducción y Propósito</h3>
            <p className="mb-4 leading-relaxed">
              Esta plataforma web constituye una solución integral intermodular creada para coordinar y optimizar todos los procesos del departamento de Hostelería y Turismo. Facilita la comunicación directa entre docentes y discentes, la formulación automatizada de escandallos con imputación de mermas técnicas, y el diseño interactivo de conceptos gastronómicos de última generación.
            </p>

            <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-900">2. Estructura de Roles y Niveles de Permisos</h3>
            <ul className="list-disc pl-6 mb-4 space-y-2 leading-relaxed">
              <li><strong>Rol Tutor / Docente (Administrador):</strong> Permisos globales del sistema. Administra el listado federado de usuarios, permite la importación en lote de alumnos y profesores vinculados a cuentas de Google Workspace del centro. Supervisa todas las recetas salvaguardando coeficientes de merma globales.</li>
              <li><strong>Rol Alumno (Estudiante):</strong> Permisos de creación de ingredientes en el catálogo de materias primas, cálculo descentralizado de escandallos y diseño estacional de menús familiares. No posee derechos de supresión de elementos ajenos ni acceso a la pestaña administrativa de centro.</li>
            </ul>

            <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-900">3. Área de Gestión y Cadena de Suministro</h3>
            <p className="mb-4 leading-relaxed">
              Planificación estructural para controlar costes de materias primas y coordinar insumos.
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-4 leading-relaxed">
              <li>
                <strong>Catálogo de Proveedores:</strong> Centraliza la información corporativa, plazos de entrega promedio y datos de contacto de las empresas de alimentación comercial que abastecen a la escuela u hotel.
              </li>
              <li>
                <strong>Ingredientes y Materias Primas:</strong> Registro elemental donde se fija el precio brutos, mermas técnicas en porcentaje y alérgenos de seguridad obligatorios por la Ley de Información Alimentaria (Reglamento UE 1169/2011). 
                <div className="bg-stone-50 p-3 rounded-lg border border-stone-200 mt-2 text-xs text-stone-600">
                  <strong>Ecuación de coste neto del ingrediente:</strong> Coste Real por Unidad = [Precio de Compra / Peso Bruto] × [1 + (% de Merma / 100)]
                </div>
              </li>
              <li>
                <strong>Escandallos Técnicos (Recetas):</strong> Permite anidar recetas básicas (Elaborados, p. ej., almíbares, caldos de pescado, bases de tartas) dentro de recetas de platos principales ("Platos"). El precio final por ración se recalcula en tiempo real cuando cambia el precio de cualquier ingrediente en el catálogo base.
              </li>
              <li>
                <strong>Catering y Menús Planificados:</strong> Unión interactiva de platos seleccionados para ofertas de eventos. Realiza la suma de costes culinarios fijos y variables, centraliza alérgenos solapados e imprime minutas perfectas en PDF para mesa.
              </li>
              <li>
                <strong>Lista Estándar de la Compra (Pedidos):</strong> Multiplica de forma analítica los componentes de las recetas integrando los coeficientes de merma acumulados de acuerdo al número de comensales indicados para el evento gastronómico.
              </li>
              <li>
                <strong>Listas de Trabajo de Cocina:</strong> Tablero KANBAN/Producción optimizado para organizar tareas diarias de emplatado, regeneración sous-vide o mise-en-place de forma ágil y coordinada.
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-8 mb-3 text-stone-900">4. Módulo de Laboratorio Creativo</h3>
            <p className="mb-4 leading-relaxed">
              Fomenta el desarrollo ágil de proyectos interdisciplinares e ideas innovadoras:
            </p>
            <ul className="list-disc pl-6 mb-4 space-y-2 leading-relaxed">
              <li><strong>Dossiers Digitales:</strong> Catálogos interactivos para enviar propuestas digitales a clientes. Soporta plantillas visuales que se adaptan automáticamente a diferentes entornos de presentación en tiempo real.</li>
              <li><strong>Ideas de Platos y Tablones:</strong> Áreas dinámicas para la lluvia de ideas previas, votaciones tecnológicas de idoneidad y retroalimentación técnica del equipo docente sobre la viabilidad de recetas candidatas.</li>
            </ul>
          </div>
        ) : (
          /* ========================================================================= */
          /* PESTAÑA: MANUAL TÉCNICO Y DE CÓDIGO (LINEA POR LINEA)                     */
          /* ========================================================================= */
          <div className="max-w-none text-stone-700">
            <div className="flex items-center gap-3 mb-6 border-b border-stone-200 pb-4">
              <div className="w-12 h-12 bg-stone-950 text-stone-100 rounded-xl flex items-center justify-center">
                <Terminal size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-stone-900">Manual de Ingeniería & Registro de Código</h2>
                <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Documentación Técnica Detallada Línea a Línea</p>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-l-4 border-stone-900 rounded-lg mb-6">
              <p className="text-sm text-stone-800 leading-relaxed font-mono">
                <strong>[ESTRUCTURA PREMIUM DEL SISTEMA]</strong> Este documento analiza minuciosamente la arquitectura de la aplicación, su modelo relacional denormalizado basado en colecciones de Cloud Firestore y el flujo de renderizado SPA integrado en React 18 con Vite, TypeScript y Tailwind CSS.
              </p>
            </div>

            {/* SECCIÓN 1: INIT */}
            <h3 className="text-xl font-bold mt-8 mb-3 text-stone-950 flex items-center gap-2">
              <Server size={20} />
              1. Flujo de Inicialización y Configuración de Entrada
            </h3>
            <p className="mb-4 leading-relaxed">
              La aplicación arranca desde el punto de entrada principal definido en <code>/index.html</code>, el cual invoca a <code>/src/main.tsx</code>. Este archivo inicializa el DOM virtual de React 18 utilizando la API moderna <code>createRoot</code> y monta la infraestructura global de contextos y enrutamiento seguro.
            </p>
            <pre>{`// src/main.tsx - Inicialización de React y Estilos Globales
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Importa Tailwind CSS y configuración de fuentes

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`}</pre>

            <h4 className="text-lg font-semibold mt-6 mb-2 text-stone-900">Enrutamiento seguro y Layout Central: <code>src/App.tsx</code></h4>
            <p className="mb-4 leading-relaxed">
              El componente raíz <code>App.tsx</code> establece las capas protectoras de los contextos para Autenticación (<code>AuthContext</code>), Mensajería y Alertas (<code>ToastContext</code>) y Sincronización de Datos (<code>DataContext</code>). Utiliza <code>react-router-dom</code> con enrutadores declarativos protegidos por guardias de seguridad para reconducir a alumnos o docentes sin autenticar hacia la pasarela de login corporativo.
            </p>
            <pre>{`// src/App.tsx - Enrutamiento y Árbol de Proveedores (Context)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Login from './pages/Login';

// Componente Guardia de Seguridad para verificar sesión activa
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}`}</pre>

            {/* SECCIÓN 2: BASE DE DATOS */}
            <h3 className="text-xl font-bold mt-8 mb-3 text-stone-950 flex items-center gap-2">
              <Shield size={20} />
              2. Modelo de Persistencia Remota y Sincronización en Tiempo Real
            </h3>
            <p className="mb-4 leading-relaxed">
              La sincronización de datos se implementa en tiempo real empleando la tecnología Cloud Firestore (SDK modular de Firebase v9). Esto permite que cuando un alumno crea o cambia una materia prima en su portátil de cocina, el profesor tutor visualice instantáneamente los cambios en el monitor principal del aula sin refrescar la pantalla.
            </p>
            <h4 className="text-base font-semibold mt-4 mb-2 text-stone-800">Uso de <code>onSnapshot</code> para suscripciones asíncronas:</h4>
            <p className="mb-4 text-sm leading-relaxed">
              El archivo <code>src/context/DataContext.tsxMap</code> establece escuchas persistentes (listeners) mediante <code>onSnapshot</code>. Al cargar el componente, la API se conecta por WebSockets a Firestore. Cada vez que cambian datos en una colección, se llama de vuelta al estado de React proporcionando una caché local ordenada alfabéticamente evitando costosas llamadas API iterativas.
            </p>
            <pre>{`// Sincronización en DataContext.tsx de colecciones nucleares
useEffect(() => {
  setIsLoading(true);
  const unsubIngredients = onSnapshot(collection(db, 'ingredients'), (snapshot) => {
    const data: Ingredient[] = [];
    snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Ingredient));
    // Ordenación alfabética inmune a nulos (null-safe) para evitar bloqueos
    setIngredients(data.sort((a, b) => (a.nameES || '').localeCompare(b.nameES || '')));
    checkLoading();
  });
  
  const unsubRecipes = onSnapshot(collection(db, 'recipes'), (snapshot) => {
    const data: Recipe[] = [];
    snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Recipe));
    setRecipes(data.sort((a, b) => (a.nameES || '').localeCompare(b.nameES || '')));
    checkLoading();
  });

  return () => {
    unsubIngredients();
    unsubRecipes();
  };
}, []);`}</pre>

            {/* SECCIÓN 3: MATEMÁTICAS */}
            <h3 className="text-xl font-bold mt-8 mb-3 text-stone-950 flex items-center gap-2">
              <Terminal size={20} />
              3. Arquitectura Algorítmica y Fórmulas del Escandallo Culinario
            </h3>
            <p className="mb-4 leading-relaxed">
              El motor de costes (<code>/src/utils/calculations.ts</code>) realiza un cálculo recursivo permitiendo anidación ilimitada de recetas (Elaborados dentro de Platos).
            </p>
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 mt-2 mb-4">
              <h4 className="text-sm font-bold text-stone-900 mb-2">Fórmulas Matemáticas Integradas:</h4>
              <ul className="list-decimal pl-5 space-y-2 text-xs leading-relaxed text-stone-700">
                <li>
                  <strong>Coste de Ingrediente por Unidad de Medida (1Kg / 1L / 1Ud):</strong>
                  <br />
                  <code>costPerUnit = (coste_bruto / cantidad_materal_bruto) * (1 + (porcentaje_merma / 100))</code>
                  <br />
                  Esta fórmula imputa la merma técnica (desperdicios de limpieza, pelado, descongelado) directamente en el precio del ingrediente para imputarlo proporcionalmente de forma justa.
                </li>
                <li>
                  <strong>Suma de Costes del Escandallo:</strong>
                  <br />
                  La receta final itera sobre cada fila de su escandallo. Si la fila corresponde a un elemento base, introduce <code>costPerUnit * cantidad_neta_en_receta</code>. Si es un <b>Elaborado técnico</b> (subreceta), divide el coste real de la subreceta entre sus raciones, e imputa el coste por porción resultante en la receta superior de forma dinámica.
                </li>
              </ul>
            </div>
            <pre>{`// Algoritmo recursivo en calculations.ts para cascada de costes
export const calculateRecipeTotalCost = (
  recipeIngredients: RecipeIngredient[],
  allIngredients: Ingredient[],
  allRecipes: Recipe[]
): number => {
  return recipeIngredients.reduce((total, ri) => {
    // 1. Caso Ingrediente Directo
    const ing = allIngredients.find(i => i.id === ri.ingredientId);
    if (ing) {
      return total + (ing.costPerUnit * (Number(ri.quantity) || 0));
    }
    // 2. Caso Elaborado Anidado (Subreceta)
    const subRecipe = allRecipes.find(r => r.id === ri.ingredientId);
    if (subRecipe) {
      if (ri.usePortions && subRecipe.portions) {
        const costPerServing = subRecipe.totalCost / subRecipe.portions;
        return total + (costPerServing * (Number(ri.quantity) || 0));
      }
      const unitCost = subRecipe.totalCost / (subRecipe.yieldQuantity || 1);
      return total + (unitCost * (Number(ri.quantity) || 0));
    }
    return total;
  }, 0);
};`}</pre>

            {/* SECCIÓN 4: GENERACIÓN PDF */}
            <h3 className="text-xl font-bold mt-8 mb-3 text-stone-950 flex items-center gap-2">
              <FileText size={20} />
              4. Motor de Generación de Archivos Portables (PDFs) en Cliente
            </h3>
            <p className="mb-4 leading-relaxed">
              El sistema de exportación utiliza un enfoque híbrido en el lado cliente con la librería <code>html2pdf.js</code> (vínculo de <code>html2canvas</code> y <code>jsPDF</code>). Esto renderiza componentes HTML ocultos posicionados de forma absoluta fuera de la pantalla (en coordenadas <code>top: -9999px</code>, <code>left: -9999px</code>) utilizando tipografías clásicas y márgenes ajustados a un marco de página A4 con precisión milimétrica.
            </p>
            <pre>{`// Fragmento de invocación en src/pages/Menus.tsx
const exportMenuPDF = async (menu: Menu) => {
  setPrintingMenu(menu);
  setIsPrinting(true);

  setTimeout(async () => {
    if (printRef.current) {
      try {
        const opt = {
          margin: 20,
          filename: \`Menu_\${menu.nameES.replace(/\\s+/g, '_')}.pdf\`,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'px', format: [794, 1122], orientation: 'portrait' },
          pagebreak: { mode: 'css', avoid: ['tr', '.print-avoid-break'] }
        };
        await generatePDF(printRef.current, opt);
      } catch (err) {
        console.error(err);
      } finally {
        setPrintingMenu(null);
        setIsPrinting(false);
      }
    }
  }, 500); // 500ms de retardo asíncrono para garantizar que el DOM renderice los alérgenos
};`}</pre>

            {/* SECCIÓN 5: CONTROL DE ROLES */}
            <h3 className="text-xl font-bold mt-8 mb-3 text-stone-950 flex items-center gap-2">
              <Shield size={20} />
              5. Mecanismo de Control Transversal y Gobernabilidad de Datos
            </h3>
            <p className="mb-4 leading-relaxed">
              La gobernabilidad del software asume un control estricto de visibilidad basado en el grupo o curso al que pertenece el estudiante (por ejemplo, "1º de Cocina"). El sistema aplica controles imperativos para impedir la alteración indebida de datos.
            </p>
            <pre>{`//src/pages/Recipes.tsx - Gestión granular de permisos
const isOwner = (recipe?: Recipe | null) => {
  if (!appUser || !recipe) return false;
  if (isAdmin && !viewAsStudent) return true; // El docente ve y edita todo
  return recipe.group === appUser.group;      // El alumno solo edita lo de su grupo
};

const canEditField = (recipe: Recipe | null, fieldType: 'escandallo' | 'logistica' | 'sostenibilidad' | 'general' | 'tareas') => {
  if (!recipe) return true;
  if (!appUser) return false;
  if (isAdmin && !viewAsStudent) return true;

  const userGroup = appUser.group || '';
  const isFromGroup = recipe.group === userGroup;

  if (!isFromGroup) return false; // Solo se editan recetas creadas por el propio grupo

  const settingsState = settings?.permissions || {
    studentCanEditEscandallo: true,
    studentCanEditLogistics: true,
    studentCanEditSustainability: true,
    studentCanEditGeneral: true,
    studentCanEditTasks: true
  };

  switch (fieldType) {
    case 'escandallo': return settingsState.studentCanEditEscandallo;
    case 'logistica': return settingsState.studentCanEditLogistics;
    case 'sostenibilidad': return settingsState.studentCanEditSustainability;
    case 'general': return settingsState.studentCanEditGeneral;
    case 'tareas': return settingsState.studentCanEditTasks;
    default: return false;
  }
};`}</pre>

            {/* SECCIÓN 6: RESUMEN DE COMPONENTES */}
            <h3 className="text-xl font-bold mt-8 mb-3 text-stone-950">6. Catálogo de Componentes y Páginas</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-100 font-bold border-b border-stone-200">
                    <th className="p-2 border-r border-stone-200">Archivo / Ruta</th>
                    <th className="p-2 border-r border-stone-200">Función Principal</th>
                    <th className="p-2">Técnica Relevante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  <tr>
                    <td className="p-2 border-r border-stone-200 font-mono font-bold">src/pages/Recipes.tsx</td>
                    <td className="p-2 border-r border-stone-200">Gestión de Escandallos (Platos / Elaborados)</td>
                    <td className="p-2">Cómputo en tiempo real, anidamiento de subrecetas por id, control por permisos.</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-stone-200 font-mono font-bold">src/pages/Ingredients.tsx</td>
                    <td className="p-2 border-r border-stone-200">Catálogo de materias primas</td>
                    <td className="p-2">Aplicación de coeficientes de merma acumulativos e IVA. Marcaje de alérgenos.</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-stone-200 font-mono font-bold">src/pages/Menus.tsx</td>
                    <td className="p-2 border-r border-stone-200">Diseño estacional de propuestas de menús</td>
                    <td className="p-2">Suma automatizada de costes fijos, consolidación de la simbología internacional de alérgenos.</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-stone-200 font-mono font-bold">src/pages/Orders.tsx</td>
                    <td className="p-2 border-r border-stone-200">Generación automatizada de listas de la compra</td>
                    <td className="p-2">Multiplicación de recetas por número de comensales agregando materias primas por proveedor.</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-stone-200 font-mono font-bold">src/pages/WorkLists.tsx</td>
                    <td className="p-2 border-r border-stone-200">Lista de Trabajo y Producción para cocina</td>
                    <td className="p-2">Modelado táctil, prioridades, asignación de tareas a alumnos y agrupamiento inteligente.</td>
                  </tr>
                  <tr>
                    <td className="p-2 border-r border-stone-200 font-mono font-bold">src/pages/Dossiers.tsx</td>
                    <td className="p-2 border-r border-stone-200">Presentaciones de catálogos interactivos para clientes</td>
                    <td className="p-2">Uso dinámico de esquemas CSS (Oro, Verde, Editorial) para simular diferentes estéticas.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <p className="mt-8 text-xs text-stone-400 text-center font-mono">
              Fin de la documentación de ingeniería de la plataforma — Código fuente bajo licencia académica del centro.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

