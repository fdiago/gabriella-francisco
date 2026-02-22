#!/usr/bin/env node
/**
 * Generador de invitaciones en PDF a partir de invitados.csv
 * Usa Puppeteer para renderizar la sección #home del index.html con el nombre inyectado.
 * Requiere: npm install puppeteer csv-parse
 * Uso: node scripts/generar-pdfs.js
 */

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { parse } = require('csv-parse/sync');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const CSV_PATH = path.join(PROJECT_ROOT, 'invitados.csv');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'pdfs_invitaciones');
const INDEX_HTML_PATH = path.join(PROJECT_ROOT, 'index.html');

/** URL base de la invitación web (para el botón "Confirmar mi asistencia" en el PDF) */
const BASE_URL = process.env.BASE_URL || 'https://tu-sitio.com';

function normalizarNombreArchivo(nombre) {
  return nombre
    .normalize('NFD')
    .replace(/\u0300/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/gi, '')
    .toLowerCase() || 'invitado';
}

function esPareja(nombre, tipoFromCsv) {
  if (tipoFromCsv) {
    const t = String(tipoFromCsv).toLowerCase();
    return t === 'pareja' || t === '2' || t === 'couple';
  }
  return /\s+y\s+/.test(nombre);
}

function leerInvitados() {
  const contenido = fs.readFileSync(CSV_PATH, 'utf-8');
  const registros = parse(contenido, { columns: true, skip_empty_lines: true, trim: true });
  const keys = registros[0] ? Object.keys(registros[0]) : [];
  const colNombre = keys[0];
  const colTipo = keys.find((k) => /tipo|type/i.test(k)) || keys[1];
  return registros
    .map((r) => {
      const nombre = (colNombre ? (r[colNombre] || '').trim() : Object.values(r)[0]) || '';
      if (!nombre) return null;
      const tipo = colTipo ? (r[colTipo] || '').trim() : '';
      return {
        nombre,
        esPareja: esPareja(nombre, tipo),
      };
    })
    .filter(Boolean);
}

async function generarPdfs() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error('No se encontró invitados.csv en la raíz del proyecto.');
    process.exit(1);
  }

  const invitados = leerInvitados();
  if (invitados.length === 0) {
    console.log('No hay invitados en invitados.csv.');
    return;
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const puppeteer = require('puppeteer');
  const pageUrl = pathToFileURL(INDEX_HTML_PATH).href;

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  } catch (err) {
    if (process.platform === 'darwin') {
      const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      if (fs.existsSync(chromePath)) {
        browser = await puppeteer.launch({
          headless: 'new',
          executablePath: chromePath,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }

  const page = await browser.newPage();

  /* Tamaño estándar móvil (ej. iPhone 14 Pro) para la ventana completa de la invitación */
  const viewportWidth = 390;
  const viewportHeight = 844;
  await page.setViewport({
    width: viewportWidth,
    height: viewportHeight,
    deviceScaleFactor: 2,
    isMobile: true,
  });

  const baseUrlNorm = BASE_URL.replace(/\/$/, '');
  const confirmarUrl = `${baseUrlNorm}#confirmar-asistencia`;
  const inicioUrl = `${baseUrlNorm}#home`;

  for (let i = 0; i < invitados.length; i++) {
    const { nombre, esPareja } = invitados[i];
    const nombreArchivo = normalizarNombreArchivo(nombre);
    const pdfPath = path.join(OUTPUT_DIR, `${nombreArchivo}.pdf`);

    /* Si el nombre incluye " y " → pareja ("Los invitamos..."); si no → persona ("Te invitamos...") */
    const frase = esPareja
      ? 'Los invitamos a celebrar nuestro matrimonio'
      : 'Te invitamos a celebrar nuestro matrimonio';

    await page.goto(pageUrl, {
      waitUntil: 'networkidle0',
      timeout: 20000,
    });

    await page.evaluate(
      (data) => {
        document.body.classList.add('pdf-invitacion');
        const { nombre: n, frase: f, titulo, confirmarHref, masInfoHref, esPareja } = data;
        const elNombre = document.getElementById('invitado-nombre');
        const elFrase = document.getElementById('invitacion-frase');
        const elTitle = document.querySelector('#home .title');
        const elConfirmar = document.getElementById('pdf-confirmar-link');
        const elMasInfo = document.getElementById('pdf-mas-info-link');
        const elCupos = document.getElementById('pdf-cupos-texto');
        if (elNombre) elNombre.textContent = n;
        if (elFrase) elFrase.textContent = f;
        if (elTitle) elTitle.textContent = titulo;
        if (elConfirmar) elConfirmar.href = confirmarHref;
        if (elMasInfo) elMasInfo.href = masInfoHref;
        if (elCupos) {
          elCupos.textContent = esPareja
            ? "Esta invitación es para 2 personas"
            : "Esta invitación es para 1 persona";
        }
        // FORZAR RECALCULO DE LAYOUT
        window.scrollTo(0, 0);
        document.documentElement.style.height = '100%';
        document.body.style.height = '100%';
      },
      {
        nombre,
        frase,
        titulo: 'Gabriella & Francisco',
        confirmarHref: confirmarUrl,
        masInfoHref: inicioUrl,
        esPareja: esPareja
      }
    );

    await new Promise((r) => setTimeout(r, 2000));

    /* PDF de una sola página (solo portada), tamaño móvil */
    await page.pdf({
      path: pdfPath,
      printBackground: true,
      width: '4.0625in',
      height: '8.79in',
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: false,
    });

    console.log(`[${i + 1}/${invitados.length}] ${pdfPath}`);
  }

  await browser.close();
  console.log(`\nListo. ${invitados.length} PDF(s) en ${OUTPUT_DIR}`);
}

generarPdfs().catch((err) => {
  console.error(err.message || err);
  if (
    /Could not find Chrome|Failed to launch|executablePath/.test(String(err))
  ) {
    console.error(
      '\nSolución: instala el navegador para Puppeteer con:\n  npx puppeteer browsers install chrome'
    );
    console.error(
      'O en macOS, si tienes Google Chrome instalado, el script lo usará automáticamente.'
    );
  }
  process.exit(1);
});
