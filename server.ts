import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
