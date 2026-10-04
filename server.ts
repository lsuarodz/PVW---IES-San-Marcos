import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Aumentar límite del body para permitir PDFs en base64 de hasta 50MB
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API de reporte de errores
  app.post('/api/report-error', async (req, res) => {
    try {
      const { name, email, role, description } = req.body;
      if (!description || typeof description !== 'string') {
        return res.status(400).json({ error: 'La descripción del error es obligatoria.' });
      }

      // Intentar notificación por FormSubmit en segundo plano con timeout estricto para no bloquear
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        await fetch("https://formsubmit.co/ajax/lsuarodzmail.com@gmail.com", {
          method: "POST",
          signal: controller.signal,
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            _subject: `[Incidencia App] Error reportado por ${name || 'Usuario'}`,
            name: "Reporte de Error de Aplicación",
            email: email || "usuario@desconocido.com",
            message: `Usuario: ${name || 'Desconocido'} (${role || 'Sin rol'})\nEmail: ${email || 'Desconocido'}\nFecha: ${new Date().toLocaleString('es-ES')}\n\nDescripción del error:\n${description}`
          })
        }).catch(err => {
          console.warn('Aviso FormSubmit (no bloqueante):', err?.message || err);
        });

        clearTimeout(timeout);
      } catch (externalErr: any) {
        console.warn('Aviso al notificar vía FormSubmit:', externalErr?.message || externalErr);
      }

      return res.json({ success: true, message: 'Reporte procesado correctamente.' });
    } catch (err: any) {
      console.error('Error procesando reporte:', err);
      return res.status(500).json({ error: err?.message || 'Error en el servidor' });
    }
  });

  // API para importar y analizar recetas desde PDF con IA (Gemini)
  app.post('/api/parse-recipe-pdf', async (req, res) => {
    try {
      const { pdfBase64, filename } = req.body;
      if (!pdfBase64 || typeof pdfBase64 !== 'string') {
        return res.status(400).json({ error: 'No se ha proporcionado el archivo PDF en base64.' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'La clave de Gemini API no está configurada en las variables de entorno.' });
      }

      // Limpiar prefijo data URI si viene incluido
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').trim();

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Analiza este documento PDF que contiene una receta o escandallo de hostelería, cocina, pastelería o panadería.
Tu objetivo es extraer con máxima precisión todos los datos de la receta y estructurarlos en el formato JSON requerido.
Normas de extracción profesional:
1. 'nameES': Nombre oficial del plato o elaboración en español (ej. "Tarta Sacher de Chocolate", "Masa Madre de Centeno", "Fondo Oscuro de Ternera", "Merluza en Salsa Verde").
2. 'type': 
   - 'elaborado': Si se trata de una masa, crema, salsa base, relleno, fondo, fermento, almíbar o preparación intermedia para componer platos.
   - 'plato': Si es un plato terminado listo para servir al comensal (tapa, entrante, principal, postre emplatado).
   - 'bebida': Si es un cóctel, batido, infusión o bebida.
3. 'descriptionES': Resumen, descripción sensorial o notas de emplatado y presentación.
4. 'portions': Raciones base calculadas en el escandallo (por defecto para platos/bebidas, ej. 4, 10). Si no se indica, estima según los ingredientes o pon 1.
5. 'yieldQuantity' y 'yieldUnit': Para elaborados, cantidad total resultante (ej. 1.5) y unidad ('kg', 'L' o 'ud').
6. 'unitWeight' y 'unitWeightUnit': Si el rendimiento es en piezas ('ud'), peso por pieza (ej. 45 g).
7. 'ingredients': Array completo de todos los ingredientes necesarios. Para cada uno:
   - 'name': Nombre limpio del ingrediente en español (ej. "Harina de trigo floja", "Azúcar glas", "Mantequilla 82% MG", "Huevo pasteurizado", "Sal fina").
   - 'quantity': Cantidad numérica requerida (decimal positivo).
   - 'unit': Unidad de medida estándar ('kg', 'g', 'L', 'ml', 'ud', 'c/s', 'c/c', 'pizca', 'manojo').
   - 'grossQuantity': Peso bruto con merma si se especifica.
   - 'wastePercentage': Porcentaje de merma estimado o indicado (0-100).
   - 'notes': Aclaración técnica (ej. "a 18ºC", "tamizada", "picada muy fina", "clarificada").
8. 'steps': Pasos secuenciales y técnicos del proceso de elaboración en obrador o partida.
9. 'equipment': Maquinaria, moldes y utensilios necesarios (ej. "Horno de pisos", "Termomix", "Batidora con pala", "Aro de pastelería 20cm", "Termómetro sonda").
10. 'miseEnPlace': Tareas de preparación previa, pesado y acondicionamiento.
11. 'sustainabilityTips': Pautas de reducción de desperdicio alimentario, aprovechamiento de mermas o eficiencia energética.
12. 'allergens': Lista de alérgenos identificados según los 14 oficiales (gluten, crustáceos, huevos, pescado, cacahuetes, soja, lácteos, frutos de cáscara, apio, mostaza, sésamo, sulfitos, altramuces, moluscos).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: cleanBase64,
            }
          },
          {
            text: prompt
          }
        ],
        config: {
          systemInstruction: 'Eres un maestro pastelero y chef docente de Formación Profesional de Hostelería y Turismo en España. Tu labor es interpretar fichas técnicas y recetas en PDF con rigurosidad culinaria y devolver un objeto JSON estructurado.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nameES: { type: Type.STRING, description: 'Nombre de la receta en español' },
              nameEN: { type: Type.STRING, description: 'Nombre en inglés si aplica' },
              type: { type: Type.STRING, enum: ['plato', 'elaborado', 'bebida'] },
              descriptionES: { type: Type.STRING, description: 'Descripción culinaria' },
              portions: { type: Type.NUMBER, description: 'Número de raciones base' },
              yieldQuantity: { type: Type.NUMBER, description: 'Cantidad resultante para elaborados' },
              yieldUnit: { type: Type.STRING, enum: ['kg', 'L', 'ud'] },
              unitWeight: { type: Type.NUMBER, description: 'Peso por unidad si yieldUnit es ud' },
              unitWeightUnit: { type: Type.STRING, enum: ['g', 'kg'] },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    unit: { type: Type.STRING },
                    grossQuantity: { type: Type.NUMBER },
                    wastePercentage: { type: Type.NUMBER },
                    notes: { type: Type.STRING },
                  },
                  required: ['name', 'quantity', 'unit']
                }
              },
              steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              equipment: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              miseEnPlace: { type: Type.STRING },
              sustainabilityTips: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              allergens: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['nameES', 'type', 'ingredients', 'steps']
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error('No se recibió contenido estructurado del analizador.');
      }

      const recipeData = JSON.parse(responseText.trim());
      return res.json({ success: true, recipe: recipeData, filename });
    } catch (err: any) {
      console.error('Error parseando receta PDF con Gemini:', err);
      return res.status(500).json({
        error: err?.message || 'Error al procesar el archivo PDF de la receta con IA.'
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}

startServer();
