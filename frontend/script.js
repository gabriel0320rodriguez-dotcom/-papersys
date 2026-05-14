// ============================================
// PaperSys - Frontend Script
// Conectado al backend Flask en localhost:5000
// ============================================

const API_URL = 'http://localhost:5000/api';

// ============ NAVIGATION ============
const titles = {
  dashboard: ['Módulo · 01', 'Panel <em>Principal</em>'],
  productos: ['Módulo · 02', 'Gestión de <em>Productos</em>'],
  inventario: ['Módulo · 03', 'Control de <em>Inventario</em>'],
  ventas: ['Módulo · 04', 'Registrar <em>Venta</em>'],
  historial: ['Módulo · 05', 'Historial de <em>Ventas</em>'],
  usuarios: ['Módulo · 06', 'Gestión de <em>Usuarios</em>'],
  config: ['Módulo · 07', 'Configuración <em>del Sistema</em>'],
};

function goTo(id){
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll(`.nav-item[data-target="${id}"]`).forEach(n => n.classList.add('active'));
  document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  const [pre, title] = titles[id];
  document.getElementById('crumbPre').textContent = pre;
  document.getElementById('crumbTitle').innerHTML = title;
  window.scrollTo({top:0, behavior:'smooth'});
}
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => goTo(item.dataset.target));
});

// ============================================
// VARIABLES GLOBALES DE PRODUCTOS
// ============================================
let products = []; // Todos los productos de la base de datos
let listaActual = []; // Los productos que se están viendo (filtrados)
let paginaActual = 1;
const productosPorPagina = 8; // Cuántos queremos ver por hoja

// ============================================
// CARGAR PRODUCTOS DESDE LA API
// ============================================
async function cargarProductos(){
  try {
    console.log('🪶 Solicitando productos al backend...');
    const response = await fetch(`${API_URL}/productos`);
    
    if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
    
    const data = await response.json();
    console.log('✅ Productos recibidos:', data);
    
    products = data.productos.map(p => ({
      id: String(p.id).padStart(3, '0'),
      sku: p.sku || 'N/A', // <-- AGREGAMOS ESTA LÍNEA
      emoji: obtenerEmoji(p.categoria),
      name: p.nombre,
      cat: p.categoria || 'Sin categoría',
      tag: obtenerTag(p.categoria),
      price: parseFloat(p.precio),
      stock: p.cantidad,
      status: calcularEstado(p.cantidad)
    }));
    
    // Inicializamos la paginación con los datos recién cargados
        listaActual = [...products]; 
        paginaActual = 1; 
        
        renderProducts();
        inicializarInventario();
        actualizarSuggestList();
  } catch (error) {
    console.error('❌ Error al cargar productos:', error);
    const body = document.getElementById('productsBody');
    if (body) body.innerHTML = `
      <tr><td colspan="7" style="text-align:center;padding:40px;color:var(--red)">
        ⚠️ No se pudo conectar al servidor. ¿Está corriendo Flask en localhost:5000?
      </td></tr>
    `;
  }
}

function obtenerEmoji(categoria){
  const map = {
    'Cuadernos': '📓',
    'Escritura': '✏️',
    'Pegamentos': '🔵',
    'Accesorios': '📏'
  };
  return map[categoria] || '📦';
}

function obtenerTag(categoria){
  const map = {
    'Cuadernos': 'cuad',
    'Escritura': 'escr',
    'Pegamentos': 'pega',
    'Accesorios': 'acce'
  };
  return map[categoria] || 'acce';
}

function calcularEstado(cantidad){
  if (cantidad === 0) return 'out';
  if (cantidad <= 10) return 'low';
  return 'ok';
}

// ============================================
// RENDER DE LA TABLA Y PAGINACIÓN
// ============================================
const statusMap = {ok:['Disponible','badge-ok'], low:['Stock bajo','badge-low'], out:['Agotado','badge-out']};
const stockMax = 120; // <--- ¡ESTA ES LA LÍNEA QUE NOS FALTABA!

function renderProducts() {
  const body = document.getElementById('productsBody');
  if (!body) return;

  // 1. Matemáticas de Paginación
  const totalProductos = listaActual.length;
  const totalPaginas = Math.ceil(totalProductos / productosPorPagina) || 1;
  
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;

  // 2. Cortar el arreglo (slice) para sacar solo los 8 de esta página
  const inicio = (paginaActual - 1) * productosPorPagina;
  const fin = inicio + productosPorPagina;
  const productosPagina = listaActual.slice(inicio, fin);

  // 3. Dibujar la tabla
  if (productosPagina.length === 0) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">No se encontraron productos.</td></tr>`;
    actualizarPaginacion(0, 0, 0, 1);
    return;
  }

  body.innerHTML = productosPagina.map(p => `
    <tr>
      <td><span class="prod-id" style="font-size:11px">#${p.id}</span></td>
      <td>
        <div class="prod-cell">
          <div class="prod-thumb">${p.emoji}</div>
          <div>
            <div class="prod-name">${p.name}</div>
            <div class="prod-sku" style="color:var(--gold-deep); font-weight:600; font-size:12px">${p.sku}</div>
          </div>
        </div>
      </td>
      <td><span class="tag tag-${p.tag}">${p.cat}</span></td>
      <td style="text-align:right"><span class="price"><span class="price-currency">$</span>${p.price.toFixed(2)}</span></td>
      <td style="text-align:center"><span class="price">${p.stock}</span></td>
      <td><span class="badge ${statusMap[p.status][1]}">${statusMap[p.status][0]}</span></td>
      <td>
        <div class="row-actions">
          <button class="act-btn" title="Editar" onclick="prepararEditarProducto(${parseInt(p.id)})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="act-btn danger" title="Eliminar" onclick="eliminarProducto(${parseInt(p.id)}, '${p.name.replace(/'/g, '&apos;')}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  // 4. Actualizar el texto y los botones de abajo
  actualizarPaginacion(totalProductos, inicio, fin, totalPaginas);
}

function actualizarPaginacion(total, inicio, fin, totalPaginas) {
  const textoInfo = document.getElementById('infoPaginacion');
  const contBotones = document.getElementById('botonesPaginacion');
  if(!textoInfo || !contBotones) return;

  if(total === 0){
      textoInfo.textContent = "Mostrando 0 productos";
      contBotones.innerHTML = '';
      return;
  }

  // Actualizar texto descriptivo
  const finReal = Math.min(fin, total);
  textoInfo.textContent = `Mostrando ${inicio + 1} a ${finReal} de ${total} productos`;

  // Crear botones dinámicos
  let htmlBotones = '';
  
  // Botón "Anterior"
  const deshabilitarPrev = paginaActual === 1 ? 'disabled style="opacity:0.4;cursor:not-allowed"' : '';
  htmlBotones += `<button class="pg" onclick="cambiarPagina(${paginaActual - 1})" ${deshabilitarPrev}>‹</button>`;

  // Botones de números
  for (let i = 1; i <= totalPaginas; i++) {
      if (i === paginaActual) {
          htmlBotones += `<button class="pg active">${i}</button>`;
      } else {
          htmlBotones += `<button class="pg" onclick="cambiarPagina(${i})">${i}</button>`;
      }
  }

  // Botón "Siguiente"
  const deshabilitarNext = paginaActual === totalPaginas ? 'disabled style="opacity:0.4;cursor:not-allowed"' : '';
  htmlBotones += `<button class="pg" onclick="cambiarPagina(${paginaActual + 1})" ${deshabilitarNext}>›</button>`;

  contBotones.innerHTML = htmlBotones;
}

function cambiarPagina(nuevaPagina) {
  paginaActual = nuevaPagina;
  renderProducts(); // Redibuja la tabla con la nueva página
}

// ============================================
// CONTROL DE INVENTARIO (STATS, FILTROS Y PAGINACIÓN)
// ============================================
let invListaActual = [];
let invPaginaActual = 1;
const invPorPagina = 10; // ← Aquí configuramos los 10 productos por hoja que pediste

function inicializarInventario() {
  invListaActual = [...products];
  invPaginaActual = 1;
  actualizarEstadisticasInventario();
  renderInventory();
}

function actualizarEstadisticasInventario() {
  const disponibles = products.filter(p => p.status === 'ok').length;
  const bajos = products.filter(p => p.status === 'low').length;
  const agotados = products.filter(p => p.status === 'out').length;

  const elDisp = document.getElementById('statInvDisponibles');
  const elBajo = document.getElementById('statInvBajos');
  const elAgotado = document.getElementById('statInvAgotados');

  if(elDisp) elDisp.textContent = disponibles;
  if(elBajo) elBajo.textContent = bajos;
  if(elAgotado) elAgotado.textContent = agotados;
}

function aplicarFiltrosInventario() {
  const texto = document.getElementById('invBusquedaFiltro').value.toLowerCase().trim();
  const categoria = document.getElementById('invCategoriaFiltro').value;

  invListaActual = products.filter(p => {
    const coincideTexto = p.name.toLowerCase().includes(texto) || p.id.includes(texto) || (p.sku && p.sku.toLowerCase().includes(texto));
    const coincideCategoria = categoria === "" || p.cat === categoria;
    return coincideTexto && coincideCategoria;
  });

  invPaginaActual = 1;
  renderInventory();
}

// Conectar los campos del HTML a la función de filtrar
if (document.getElementById('invBusquedaFiltro')) {
  document.getElementById('invBusquedaFiltro').addEventListener('input', aplicarFiltrosInventario);
  document.getElementById('invCategoriaFiltro').addEventListener('change', aplicarFiltrosInventario);
}

function renderInventory() {
  const body = document.getElementById('inventoryBody');
  if (!body) return;

  const totalItem = invListaActual.length;
  const totalPaginas = Math.ceil(totalItem / invPorPagina) || 1;
  if (invPaginaActual > totalPaginas) invPaginaActual = totalPaginas;

  const inicio = (invPaginaActual - 1) * invPorPagina;
  const fin = inicio + invPorPagina;
  const paginaProductos = invListaActual.slice(inicio, fin);

  if (paginaProductos.length === 0) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">No se encontraron productos en el inventario.</td></tr>`;
    actualizarPaginacionInventario(0, 0, 0, 1);
    return;
  }

  body.innerHTML = paginaProductos.map(p => {
    const pct = Math.min(100, (p.stock / stockMax) * 100);
    const lvl = p.status;
    return `
      <tr>
        <td><span class="prod-id" style="font-size:11px">#${p.id}</span></td>
        <td>
          <div class="prod-cell">
            <div class="prod-thumb">${p.emoji}</div>
            <div>
              <div class="prod-name">${p.name}</div>
              <div class="prod-sku" style="color:var(--gold-deep); font-weight:600; font-size:12px">${p.sku || 'N/A'}</div>
            </div>
          </div>
        </td>
        <td><span class="tag tag-${p.tag}">${p.cat}</span></td>
        <td style="text-align:center"><span class="price" style="font-size:15px">${p.stock}</span></td>
        <td><div class="stock-bar"><div class="stock-fill ${lvl}" style="width:${pct}%"></div></div></td>
        <td><span class="badge ${statusMap[p.status][1]}">${statusMap[p.status][0]}</span></td>
        <td style="text-align:right"><span class="prod-id">--</span></td>
      </tr>
    `;
  }).join('');

  actualizarPaginacionInventario(totalItem, inicio, Math.min(fin, totalItem), totalPaginas);
}

function actualizarPaginacionInventario(total, inicio, fin, totalPaginas) {
  const info = document.getElementById('infoPaginacionInventario');
  const btn = document.getElementById('botonesPaginacionInventario');
  if(!info || !btn) return;

  if(total === 0){
      info.textContent = "Mostrando 0 productos";
      btn.innerHTML = '';
      return;
  }
  info.textContent = `Mostrando ${inicio + 1} a ${fin} de ${total} productos`;

  let html = '';
  html += `<button class="pg" onclick="cambiarPaginaInv(${invPaginaActual - 1})" ${invPaginaActual === 1 ? 'disabled style="opacity:0.4"' : ''}>‹</button>`;
  for (let i = 1; i <= totalPaginas; i++) {
      html += `<button class="pg ${i === invPaginaActual ? 'active' : ''}" onclick="cambiarPaginaInv(${i})">${i}</button>`;
  }
  html += `<button class="pg" onclick="cambiarPaginaInv(${invPaginaActual + 1})" ${invPaginaActual === totalPaginas ? 'disabled style="opacity:0.4"' : ''}>›</button>`;
  btn.innerHTML = html;
}

function cambiarPaginaInv(nueva) {
  invPaginaActual = nueva;
  renderInventory();
}

function actualizarSuggestList(){
  const list = document.querySelector('.suggest-list');
  if (!list) return;
  list.innerHTML = products.slice(0, 4).map(p => `
    <div class="suggest" onclick="addToCart('${p.name.replace(/'/g, '&apos;')}', ${p.price})">
      <div class="prod-thumb">${p.emoji}</div>
      <div class="suggest-name">${p.name}</div>
      <div class="suggest-price">$${p.price.toFixed(2)}</div>
    </div>
  `).join('');
}

// ============================================
// HISTORIAL DE VENTAS (FILTROS, STATS, TICKET)
// ============================================
let historialVentas = [];
let historialActual = [];
let histPaginaActual = 1;
const ventasPorPagina = 8;

async function cargarHistorial() {
  try {
    const response = await fetch(`${API_URL}/ventas`);
    if (!response.ok) throw new Error('Error al cargar historial');
    
    const data = await response.json();
    historialVentas = data.ventas;
    historialActual = [...historialVentas]; // Copia de trabajo
    histPaginaActual = 1;
    
    calcularEstadisticasHistorial();
    renderHistory();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// === ESTADÍSTICAS ===
function calcularEstadisticasHistorial() {
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  
  const hace7Dias = new Date(hoy);
  hace7Dias.setDate(hace7Dias.getDate() - 7);

  let ventasHoy = 0, ingresoDia = 0, estaSemana = 0, ingresoTotal = 0;

  historialVentas.forEach(v => {
    const fechaVenta = new Date(v.fecha);
    ingresoTotal += v.total;

    if (fechaVenta >= hoy) {
      ventasHoy++;
      ingresoDia += v.total;
    }
    if (fechaVenta >= hace7Dias) {
      estaSemana += v.total;
    }
  });

  const ticketPromedio = historialVentas.length ? (ingresoTotal / historialVentas.length) : 0;

  // Actualizar DOM
  document.getElementById('statVentasHoy').textContent = ventasHoy;
  document.getElementById('statIngresoDia').textContent = ingresoDia.toFixed(2);
  document.getElementById('statEstaSemana').textContent = estaSemana.toFixed(2);
  document.getElementById('statTicketPromedio').textContent = ticketPromedio.toFixed(2);
  
  const opciones = { day: 'numeric', month: 'long', year: 'numeric' };
  document.getElementById('statFechaHoy').textContent = new Date().toLocaleDateString('es-ES', opciones);
}

// === FILTROS ===
function aplicarFiltrosHistorial() {
  const fecha = document.getElementById('histFechaFiltro').value;
  const metodo = document.getElementById('histMetodoFiltro').value;
  const busqueda = document.getElementById('histBusquedaFiltro').value.trim();

  historialActual = historialVentas.filter(v => {
    // 1. Filtro Búsqueda (ID)
    const strId = String(v.id).padStart(5, '0');
    const coincideNum = strId.includes(busqueda);
    
    // 2. Filtro Método
    const coincideMetodo = metodo === "" || v.metodo_pago === metodo;
    
    // 3. Filtro Fecha
    let coincideFecha = true;
    if (fecha) {
      const fechaVentaLocal = new Date(v.fecha).toLocaleDateString('en-CA'); // YYYY-MM-DD
      coincideFecha = fechaVentaLocal === fecha;
    }

    return coincideNum && coincideMetodo && coincideFecha;
  });

  histPaginaActual = 1;
  renderHistory();
}

// Ligar eventos
if(document.getElementById('histBusquedaFiltro')){
  document.getElementById('histBusquedaFiltro').addEventListener('input', aplicarFiltrosHistorial);
  document.getElementById('histMetodoFiltro').addEventListener('change', aplicarFiltrosHistorial);
  document.getElementById('histFechaFiltro').addEventListener('change', aplicarFiltrosHistorial);
}

function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  const opcionesFecha = { day: 'numeric', month: 'short', year: 'numeric' };
  const opcionesHora = { hour: '2-digit', minute: '2-digit' };
  const hoy = new Date();
  const esHoy = fecha.toDateString() === hoy.toDateString();
  return {
    principal: esHoy ? `Hoy, ${fecha.toLocaleTimeString('es-ES', opcionesHora)}` : fecha.toLocaleDateString('es-ES', opcionesFecha),
    secundario: fecha.toLocaleDateString('es-ES', opcionesFecha)
  };
}

// === RENDER Y PAGINACIÓN ===
function renderHistory() {
  const body = document.getElementById('historyBody');
  if (!body) return;

  const totalItem = historialActual.length;
  const totalPaginas = Math.ceil(totalItem / ventasPorPagina) || 1;
  if (histPaginaActual > totalPaginas) histPaginaActual = totalPaginas;

  const inicio = (histPaginaActual - 1) * ventasPorPagina;
  const fin = inicio + ventasPorPagina;
  const paginaVentas = historialActual.slice(inicio, fin);

  if (paginaVentas.length === 0) {
    body.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--muted)">No se encontraron ventas con estos filtros.</td></tr>`;
    actualizarPaginacionHistorial(0, 0, 0, 1);
    return;
  }

  body.innerHTML = paginaVentas.map(h => {
    const fechaFmt = formatearFecha(h.fecha);
    const nVenta = String(h.id).padStart(5, '0');
    const metodoTag = h.metodo_pago === 'efectivo' ? 'tag-cuad' : (h.metodo_pago === 'tarjeta' ? 'tag-escr' : 'tag-pega');
    const metodoStr = h.metodo_pago.charAt(0).toUpperCase() + h.metodo_pago.slice(1);

    return `
    <tr>
      <td><span style="font-family:var(--mono);font-weight:500">#${nVenta}</span></td>
      <td><span style="font-size:13px">${fechaFmt.principal}</span><div class="prod-id">${fechaFmt.secundario}</div></td>
      <td><span class="price">${h.articulos}</span> <span style="color:var(--muted);font-size:12px">artículos</span></td>
      <td><span class="tag ${metodoTag}">${metodoStr}</span></td>
      <td><span style="font-size:13px">${h.cajero}</span></td>
      <td style="text-align:right"><span class="price" style="font-size:14.5px;color:var(--gold-deep);font-weight:600"><span class="price-currency">$</span>${h.total.toFixed(2)}</span></td>
      <td>
        <div class="row-actions">
          <button class="act-btn" title="Descargar Ticket" onclick="imprimirTicket(${h.id})">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  actualizarPaginacionHistorial(totalItem, inicio, Math.min(fin, totalItem), totalPaginas);
}

function actualizarPaginacionHistorial(total, inicio, fin, totalPaginas) {
  const info = document.getElementById('infoPaginacionHistorial');
  const btn = document.getElementById('botonesPaginacionHistorial');
  if(!info || !btn) return;

  if(total === 0){
      info.textContent = "Mostrando 0 ventas";
      btn.innerHTML = '';
      return;
  }
  info.textContent = `Mostrando ${inicio + 1} a ${fin} de ${total} ventas registradas`;

  let html = '';
  html += `<button class="pg" onclick="cambiarPaginaHist(${histPaginaActual - 1})" ${histPaginaActual === 1 ? 'disabled style="opacity:0.4"' : ''}>‹</button>`;
  for (let i = 1; i <= totalPaginas; i++) {
      html += `<button class="pg ${i === histPaginaActual ? 'active' : ''}" onclick="cambiarPaginaHist(${i})">${i}</button>`;
  }
  html += `<button class="pg" onclick="cambiarPaginaHist(${histPaginaActual + 1})" ${histPaginaActual === totalPaginas ? 'disabled style="opacity:0.4"' : ''}>›</button>`;
  btn.innerHTML = html;
}

function cambiarPaginaHist(nueva) {
  histPaginaActual = nueva;
  renderHistory();
}

// === IMPRIMIR TICKET PDF ===
async function imprimirTicket(ventaId) {
  try {
    const res = await fetch(`${API_URL}/ventas/${ventaId}`);
    if(!res.ok) throw new Error('Error obteniendo ticket');
    const data = await res.json();
    
    // Generar formato de ticket térmico HTML
    const fechaStr = new Date(data.fecha).toLocaleString('es-ES');
    const idFmt = String(data.id).padStart(5, '0');
    
    const lineasHTML = data.articulos.map(a => `
        <tr>
            <td style="padding:4px 0">${a.cantidad}x</td>
            <td style="padding:4px 0">${a.nombre}</td>
            <td style="padding:4px 0;text-align:right">$${a.subtotal.toFixed(2)}</td>
        </tr>
    `).join('');

    const ticketHTML = `
      <html>
      <head>
          <title>Ticket_${idFmt}</title>
          <style>
              body { font-family: monospace; color: #000; width: 300px; margin: 0 auto; padding: 20px; }
              .center { text-align: center; }
              table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 15px 0;}
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
              .total { font-size: 18px; font-weight: bold; text-align: right; }
          </style>
      </head>
      <body>
          <div class="center">
              <h2>PaperSys</h2>
              <p>Comprobante de Venta</p>
          </div>
          <div class="divider"></div>
          <p>Ticket: #${idFmt}<br>Fecha: ${fechaStr}<br>Atiende: ${data.cajero}</p>
          <div class="divider"></div>
          <table>
              ${lineasHTML}
          </table>
          <div class="divider"></div>
          <p style="text-align:right; margin-bottom:5px;">Método: ${data.metodo_pago.toUpperCase()}</p>
          <p class="total">TOTAL: $${data.total.toFixed(2)}</p>
          <div class="divider"></div>
          <p class="center">¡Gracias por su compra!</p>
          <script>
              window.onload = function() { window.print(); window.onafterprint = function(){ window.close(); } };
          </script>
      </body>
      </html>
    `;

    // Abrir ventana oculta y disparar impresión
    const ventana = window.open('', '_blank', 'width=400,height=600');
    ventana.document.write(ticketHTML);
    ventana.document.close();

  } catch(e) {
    console.error(e);
    mostrarToast('❌ Error generando ticket', 'error');
  }
}

// ============================================
// USUARIOS (datos de prueba por ahora)
// ============================================
const users = [
  {ini:'A', name:'Alana Rodríguez', email:'alana@papersys.mx', role:'admin', last:'Ahora', status:'ok'},
  {ini:'M', name:'María López', email:'maria.l@papersys.mx', role:'emp', last:'Hace 2 días', status:'ok'},
  {ini:'J', name:'José Hernández', email:'jose.h@papersys.mx', role:'emp', last:'Hace 5 horas', status:'ok'},
  {ini:'C', name:'Carla Méndez', email:'carla.m@papersys.mx', role:'emp', last:'Hace 1 semana', status:'low'},
];

function renderUsers(){
  const body = document.getElementById('usersBody');
  if (!body) return;
  body.innerHTML = users.map(u => `
    <tr>
      <td>
        <div class="prod-cell">
          <div class="avatar" style="width:36px;height:36px;font-size:13px;box-shadow:0 0 0 2px #FFFEFB, 0 0 0 3px var(--gold-light)">${u.ini}</div>
          <div class="prod-name">${u.name}</div>
        </div>
      </td>
      <td><span style="font-family:var(--mono);font-size:12.5px;color:var(--ink-soft)">${u.email}</span></td>
      <td><span class="role-tag role-${u.role}">${u.role==='admin'?'Administrador':'Empleado'}</span></td>
      <td><span class="prod-id">${u.last}</span></td>
      <td><span class="badge badge-${u.status==='ok'?'ok':'low'}">${u.status==='ok'?'Activo':'Inactivo'}</span></td>
      <td>
        <div class="row-actions">
          <button class="act-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ============================================
// CARRITO DE VENTAS Y BÚSQUEDA
// ============================================
let cart = [];

// 1. Buscador inteligente en tiempo real
const ventaBusqueda = document.getElementById('ventaBusqueda');
const ventaSugerencias = document.getElementById('ventaSugerencias');

if(ventaBusqueda) {
  ventaBusqueda.addEventListener('input', (e) => {
    const texto = e.target.value.toLowerCase().trim();
    if(texto === "") {
      ventaSugerencias.innerHTML = '';
      return;
    }

    // Buscar productos que coincidan y que tengan stock > 0
    const coincidencias = products.filter(p => 
      (p.name.toLowerCase().includes(texto) || (p.sku && p.sku.toLowerCase().includes(texto))) && 
      p.stock > 0
    ).slice(0, 5); // Mostramos máximo 5 sugerencias

    if(coincidencias.length === 0) {
      ventaSugerencias.innerHTML = '<div style="padding:15px;text-align:center;color:var(--muted);font-size:13px">No hay productos con stock que coincidan.</div>';
      return;
    }

    ventaSugerencias.innerHTML = coincidencias.map(p => `
      <div class="suggest" onclick="addToCart(${parseInt(p.id)})">
        <div class="prod-thumb">${p.emoji}</div>
        <div>
            <div class="suggest-name">${p.name}</div>
            <div style="font-size:11px;color:var(--muted)">Disponible: ${p.stock} unid.</div>
        </div>
        <div class="suggest-price">$${p.price.toFixed(2)}</div>
      </div>
    `).join('');
  });
}

// 2. Lógica del Carrito
function addToCart(id){
  const productoDB = products.find(p => parseInt(p.id) === id);
  if(!productoDB) return;

  const existing = cart.find(i => i.id === id);
  
  // Validar el stock antes de agregar
  if(existing){ 
    if(existing.qty < productoDB.stock) {
       existing.qty++; 
    } else {
       mostrarToast('⚠️ No hay más stock disponible de este producto', 'error');
       return;
    }
  } else { 
    cart.push({
      id: id, 
      name: productoDB.name, 
      price: productoDB.price, 
      qty: 1, 
      maxStock: productoDB.stock
    }); 
  }
  
  // Limpiar el buscador después de agregar
  if(ventaBusqueda) ventaBusqueda.value = '';
  if(ventaSugerencias) ventaSugerencias.innerHTML = '';
  
  renderCart();
}

function changeQty(idx, delta){
  const item = cart[idx];
  const newQty = item.qty + delta;
  
  if(newQty > item.maxStock) {
     mostrarToast('⚠️ Límite de stock alcanzado', 'error');
     return;
  }
  
  item.qty = newQty;
  if(item.qty < 1) cart.splice(idx, 1);
  renderCart();
}

function removeItem(idx){
  cart.splice(idx, 1);
  renderCart();
}

function clearCart(){
  cart = [];
  renderCart();
}

function renderCart(){
  const list = document.getElementById('cartList');
  if (!list) return;

  if(cart.length === 0){
    list.innerHTML = `<div class="cart-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
      <p>Sin productos aún</p>
      <span style="font-size:12.5px">Busca un producto para comenzar</span>
    </div>`;
  } else {
    list.innerHTML = cart.map((it, i) => `
      <div class="cart-item">
        <div class="cart-info">
          <div class="cart-name">${it.name}</div>
          <div class="cart-meta">$${it.price.toFixed(2)} c/u</div>
        </div>
        <div class="qty">
          <button onclick="changeQty(${i}, -1)">−</button>
          <input value="${it.qty}" readonly>
          <button onclick="changeQty(${i}, 1)">+</button>
        </div>
        <div class="cart-sub">$${(it.price * it.qty).toFixed(2)}</div>
        <button class="cart-rm" onclick="removeItem(${i})" title="Quitar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');
  }

  const subtotal = cart.reduce((s, it) => s + it.price * it.qty, 0);
  const count = cart.reduce((s, it) => s + it.qty, 0);
  
  document.getElementById('sumSubtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('sumCount').textContent = count;
  
  const [intPart, decPart] = subtotal.toFixed(2).split('.');
  document.getElementById('sumTotal').innerHTML = `$${intPart}<small>.${decPart}</small>`;
}

// 3. ENVIAR LA VENTA AL BACKEND Y LANZAR NOTIFICACIONES
async function registrarVentaEnBD() {
    if(cart.length === 0) {
        mostrarToast('⚠️ El carrito está vacío', 'error');
        return;
    }

    const metodoSelect = document.getElementById('ventaMetodoPago');
    const metodo_pago = metodoSelect ? metodoSelect.value : 'efectivo';
    const total = cart.reduce((s, it) => s + it.price * it.qty, 0);

    const productosParaBD = cart.map(item => ({
        producto_id: item.id,
        cantidad: item.qty,
        precio: item.price,
        subtotal: item.price * item.qty
    }));

    const payload = {
        metodo_pago: metodo_pago,
        total: total,
        productos: productosParaBD
    };

    try {
        const response = await fetch(`${API_URL}/ventas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al registrar la venta');

        mostrarToast(`✅ Venta #${data.venta_id} registrada con éxito`, 'success');
        
        // ============================================
        // 🧠 CEREBRO DE NOTIFICACIONES
        // ============================================
        
        // 1. Verificar si fue una "Venta Fuerte" (Mayor a $500 pesos)
        if (total >= 500) {
            agregarNotificacion(
                '💰 Venta Fuerte', 
                `Se registró una venta de $${total.toFixed(2)} MXN mediante ${metodo_pago}.`, 
                'exito'
            );
        }

        // 2. Verificar el Stock (Leyendo tus Preferencias de Configuración)
        const prefsGuardadas = localStorage.getItem('papersys_prefs');
        let alertasStockActivadas = false;
        
        if (prefsGuardadas) {
            const prefs = JSON.parse(prefsGuardadas);
            alertasStockActivadas = prefs.alertasStock;
        }

        // Si el usuario prendió el switch de alertas en la configuración...
        if (alertasStockActivadas) {
            cart.forEach(item => {
                // Calculamos cuánto stock quedó después de esta venta
                const stockRestante = item.maxStock - item.qty; 
                
                // Si quedaron 10 o menos unidades, disparamos la campanita
                if (stockRestante <= 10) {
                    agregarNotificacion(
                        '⚠️ Stock Bajo', 
                        `El producto "${item.name}" bajó a ${stockRestante} unidades. Se recomienda reabastecer.`, 
                        'alerta'
                    );
                }
            });
        }
        // ============================================

        // Limpiamos el carrito (ahora sí, después de haberlo analizado)
        clearCart();
        
        // Recargamos los módulos
        cargarProductos();
        cargarHistorial();
        cargarDashboard();

    } catch (error) {
        console.error(error);
        mostrarToast(`❌ ${error.message}`, 'error');
    }
}

// ============================================
// MODAL DE PRODUCTO (AGREGAR / EDITAR)
// ============================================
let categorias = [];

async function cargarCategorias(){
  try {
    const response = await fetch(`${API_URL}/categorias`);
    const data = await response.json();
    categorias = data.categorias;
    
    const select = document.getElementById('prodCategoria');
    select.innerHTML = '<option value="">Selecciona una categoría…</option>' +
      categorias.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');
  } catch (error) {
    console.error('Error al cargar categorías:', error);
  }
}

function abrirModalProducto(){
  // Modo "agregar": limpia el formulario
  document.getElementById('modalTitulo').innerHTML = 'Agregar <em>Producto</em>';
  document.getElementById('prodId').value = '';
  document.getElementById('prodNombre').value = '';
  document.getElementById('prodPrecio').value = '';
  document.getElementById('prodCantidad').value = '';
  document.getElementById('prodCategoria').value = '';
  document.getElementById('modalProducto').classList.add('active');
}

function prepararEditarProducto(id) {
  // 1. Buscamos el producto en nuestro arreglo local 'products'
  // Nota: p.id en el arreglo tiene ceros a la izquierda (ej: "001"), 
  // por eso lo convertimos a número para comparar.
  const producto = products.find(p => parseInt(p.id) === id);
  
  if (!producto) return;

  // 2. Cambiamos el título del modal
  document.getElementById('modalTitulo').innerHTML = 'Editar <em>Producto</em>';
  
  // 3. Rellenamos los campos con la información actual
  document.getElementById('prodId').value = id; // El ID oculto es clave
  document.getElementById('prodNombre').value = producto.name;
  document.getElementById('prodPrecio').value = producto.price;
  document.getElementById('prodCantidad').value = producto.stock;
  
  // Para la categoría, buscamos el ID basado en el nombre (ya que en 'products' guardas el nombre)
  const cat = categorias.find(c => c.nombre === producto.cat);
  document.getElementById('prodCategoria').value = cat ? cat.id : "";

  // 4. Abrimos el modal
  document.getElementById('modalProducto').classList.add('active');
}

function cerrarModalProducto(){
  document.getElementById('modalProducto').classList.remove('active');
}

async function guardarProducto(){
  const id = document.getElementById('prodId').value; // Leemos el ID oculto
  const nombre = document.getElementById('prodNombre').value.trim();
  const precio = parseFloat(document.getElementById('prodPrecio').value);
  const cantidad = parseInt(document.getElementById('prodCantidad').value);
  const categoria_id = parseInt(document.getElementById('prodCategoria').value);

  if (!nombre || isNaN(precio) || isNaN(cantidad) || isNaN(categoria_id)){
    mostrarToast('⚠️ Completa todos los campos correctamente', 'error');
    return;
  }
  
  // Decidimos la URL y el Método según si hay ID o no
  const esEdicion = id !== "";
  const url = esEdicion ? `${API_URL}/productos/${id}` : `${API_URL}/productos`;
  const metodo = esEdicion ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, precio, cantidad, categoria_id })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Error en la operación');
    
    mostrarToast(esEdicion ? '✨ Producto actualizado' : '✅ Producto creado', 'success');
    cerrarModalProducto();
    cargarProductos();
    cargarDashboard(); 
  } catch (error) {
    console.error(error);
    mostrarToast(`❌ ${error.message}`, 'error');
  }
}

// ============================================
// ELIMINAR PRODUCTO (DELETE)
// ============================================
async function eliminarProducto(id, nombre) {
  // 1. LEEMOS LA CONFIGURACIÓN ACTUAL DE LA BÓVEDA
  const prefsGuardadas = localStorage.getItem('papersys_prefs');
  let pedirConfirmacion = false; // Por defecto no preguntamos
  
  if (prefsGuardadas) {
    const prefs = JSON.parse(prefsGuardadas);
    pedirConfirmacion = prefs.confirmarBorrado; // Leemos el switch
  }

  // 2. ACTUAMOS SEGÚN EL SWITCH
  if (pedirConfirmacion) {
    // Si el switch está prendido, lanzamos tu alerta original
    if (!confirm('⚠️ ATENCIÓN:\n¿Estás seguro de que deseas eliminar este producto?\n\nEsta acción no se puede deshacer.')) {
      return; 
    }
  }
  
  try {
    // 2. Hacer la petición DELETE al backend
    const response = await fetch(`${API_URL}/productos/${id}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!response.ok) throw new Error(data.error || 'Error al eliminar producto');
    
    // 3. Mostrar el mensaje bonito y actualizar la tabla
    mostrarToast(`🗑️ ${nombre} eliminado exitosamente`, 'success');
    cargarProductos();
    cargarDashboard(); 
    
  } catch (error) {
    console.error(error);
    mostrarToast(`❌ ${error.message}`, 'error');
  }
}

// ============================================
// TOAST (NOTIFICACIONES BONITAS)
// ============================================
function mostrarToast(mensaje, tipo = 'success'){
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn .25s ease reverse';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// ============================================
// FILTROS DE PRODUCTOS
// ============================================
function aplicarFiltrosProductos() {
  // 1. Obtener los valores actuales de los 3 campos
  const texto = document.getElementById('filtroBusqueda').value.toLowerCase().trim();
  const categoria = document.getElementById('filtroCategoria').value;
  const estado = document.getElementById('filtroEstado').value;

  // 2. Filtrar el arreglo global 'products'
  const productosFiltrados = products.filter(p => {
    // Busca coincidencias en el nombre o en el ID
    const coincideTexto = p.name.toLowerCase().includes(texto) || p.id.includes(texto);
    // Si la categoría está vacía (Todas), es true. Si no, debe coincidir.
    const coincideCategoria = categoria === "" || p.cat === categoria;
    // Si el estado está vacío (Cualquiera), es true. Si no, debe coincidir.
    const coincideEstado = estado === "" || p.status === estado;

    // Solo mantenemos el producto si cumple con TODOS los filtros activos
    return coincideTexto && coincideCategoria && coincideEstado;
  });

  // 3. Actualizamos la lista actual y volvemos a la página 1
  listaActual = productosFiltrados;
  paginaActual = 1; 
  renderProducts();
}

// 4. Conectar los campos para que se filtren al instante
document.getElementById('filtroBusqueda').addEventListener('input', aplicarFiltrosProductos);
document.getElementById('filtroCategoria').addEventListener('change', aplicarFiltrosProductos);
document.getElementById('filtroEstado').addEventListener('change', aplicarFiltrosProductos);

// ============================================
// EXPORTAR A EXCEL (CSV)
// ============================================
function exportarAExcel() {
  // 1. Validar que haya datos para exportar
  if (listaActual.length === 0) {
    mostrarToast('⚠️ No hay datos para exportar', 'error');
    return;
  }

  // 2. Definir los encabezados de las columnas
  const encabezados = ['ID', 'SKU', 'Producto', 'Categoría', 'Precio', 'Existencia', 'Estado'];
  
  // 3. Construir las filas iterando sobre la lista filtrada
  const filas = listaActual.map(p => {
    return [
      p.id,
      p.sku,
      `"${p.name}"`, // Usamos comillas por si el nombre del producto tiene alguna coma
      p.cat,
      p.price.toFixed(2),
      p.stock,
      statusMap[p.status][0] // Aquí sacamos la palabra "Disponible", "Agotado", etc.
    ].join(','); // Unimos cada columna con una coma
  });

  // 4. Unir los encabezados y las filas con saltos de línea
  const contenidoCSV = [encabezados.join(','), ...filas].join('\n');

  // 5. Agregar el "BOM" (Byte Order Mark) 
  // Esto es un truco técnico para que Excel lea los acentos (á, é) perfectamente
  const bom = '\uFEFF';
  const blob = new Blob([bom + contenidoCSV], { type: 'text/csv;charset=utf-8;' });

  // 6. Crear un enlace invisible y simular un clic para forzar la descarga
  const enlace = document.createElement('a');
  const url = URL.createObjectURL(blob);
  enlace.setAttribute('href', url);
  
  // Nombrar el archivo dinámicamente con la fecha de hoy
  const fecha = new Date().toISOString().split('T')[0];
  enlace.setAttribute('download', `PaperSys_Inventario_${fecha}.csv`);
  
  document.body.appendChild(enlace);
  enlace.click(); // ¡Clic automático!
  
  // Limpiar la basura invisible
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
  
  mostrarToast('📥 Archivo exportado exitosamente', 'success');
}

// ============================================
// DASHBOARD PRINCIPAL
// ============================================
async function cargarDashboard() {
  try {
    const response = await fetch(`${API_URL}/dashboard`);
    if (!response.ok) throw new Error('Error al cargar dashboard');
    const data = await response.json();
    
    // 1. Llenar Tarjetas Superiores
    const elProds = document.getElementById('dashTotalProductos');
    const elVentas = document.getElementById('dashVentasDia');
    const elTrans = document.getElementById('dashTransacciones');
    const elStock = document.getElementById('dashStockBajo');
    
    if(elProds) elProds.textContent = data.productos_total;
    if(elVentas) elVentas.textContent = data.ingresos_hoy.toFixed(2);
    if(elTrans) elTrans.textContent = data.transacciones_hoy;
    if(elStock) elStock.textContent = data.stock_bajo;
    
    // --- MAGIA DE TEXTOS DINÁMICOS ---
    
    // 1. Fecha actual
    const elDate = document.getElementById('dashDatePill');
    if(elDate) {
        const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        elDate.textContent = new Date().toLocaleDateString('es-ES', opciones).toUpperCase();
    }

    // 2. Cálculos de crecimiento (Hoy vs Ayer)
    const ventasHoy = data.ingresos_hoy;
    const ventasAyer = data.ventas_ayer || 0;
    
    let textoCrecimiento = '';
    let htmlSubVentas = '';

    if (ventasAyer === 0 && ventasHoy > 0) {
        textoCrecimiento = '¡Excelente trabajo! Tienes ventas hoy y ayer no hubo.';
        htmlSubVentas = `<span class="up">↑ 100%</span> vs ayer`;
    } else if (ventasAyer === 0 && ventasHoy === 0) {
        textoCrecimiento = 'Aún no hay ventas registradas el día de hoy.';
        htmlSubVentas = `<span style="color:var(--muted)">Sin ventas ayer</span>`;
    } else {
        const crecimiento = ((ventasHoy - ventasAyer) / ventasAyer) * 100;
        if (crecimiento >= 0) {
            textoCrecimiento = `Las ventas han crecido un ${crecimiento.toFixed(1)}% hoy respecto a ayer.`;
            htmlSubVentas = `<span class="up">↑ ${crecimiento.toFixed(1)}%</span> vs ayer`;
        } else {
            textoCrecimiento = `Las ventas están un ${Math.abs(crecimiento).toFixed(1)}% por debajo de ayer.`;
            htmlSubVentas = `<span class="down">↓ ${Math.abs(crecimiento).toFixed(1)}%</span> vs ayer`;
        }
    }

    const elSubVentas = document.getElementById('dashSubVentas');
    const elWelcomeDesc = document.getElementById('dashWelcomeDesc');
    
    if(elSubVentas) elSubVentas.innerHTML = htmlSubVentas;
    if(elWelcomeDesc) elWelcomeDesc.textContent = `Aquí está un resumen general de tu papelería. ${textoCrecimiento}`;

    // 2. Llenar Top 5 Más Vendidos
    const topList = document.getElementById('dashTopList');
    if(topList && data.top_5) {
      const numRomanos = ['I', 'II', 'III', 'IV', 'V'];
      topList.innerHTML = data.top_5.map((prod, index) => `
          <div class="top-item" style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center;">
            <div style="display:flex; gap:15px; align-items:center;">
              <div style="color:var(--gold-deep); font-weight:bold; font-family:serif; width:20px;">${numRomanos[index]}</div>
              <div>
                <div style="font-weight:600; font-size:14px;">${prod.nombre}</div>
                <div style="font-size:11px; color:var(--muted); text-transform:uppercase;">${prod.categoria || 'Sin categoría'}</div>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:600;">${prod.total_vendido}</div>
              <div style="font-size:11px; color:var(--muted);">unidades</div>
            </div>
          </div>
      `).join('');
    }

    // 3. Dibujar Gráfica Dinámica (Últimos 7 días)
    const chartBars = document.getElementById('dashChartBars');
    if(chartBars) {
        const dias = [];
        for(let i=6; i>=0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dias.push(d);
        }
        
        let totalSemana = 0;
        const maxValor = Math.max(...data.ventas_semana.map(v => v.total_dia), 100); 
        
        // Usamos tus clases originales de CSS para que luzca perfecto
        chartBars.innerHTML = dias.map(dia => {
            const fechaStr = new Date(dia.getTime() - (dia.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            const ventaDia = data.ventas_semana.find(v => v.fecha_dia === fechaStr);
            const total = ventaDia ? ventaDia.total_dia : 0;
            totalSemana += total;
            
            const porcentaje = Math.max((total / maxValor) * 100, 3); // 3% mínimo para que se vea una pequeña base
            const nombreDia = dia.toLocaleDateString('es-ES', {weekday: 'short'}).replace('.', '').toUpperCase();
            const labelTotal = total > 0 ? (total >= 1000 ? '$'+(total/1000).toFixed(1)+'k' : '$'+total) : '';
            
            return `
            <div class="bar-col">
              <span class="bar-val">${labelTotal}</span>
              <div class="bar" style="height:${porcentaje}%"></div>
              <span class="bar-day">${nombreDia}</span>
            </div>
            `;
        }).join('');
        
        const elTotSemana = document.getElementById('dashTotalSemana');
        const elPromDiario = document.getElementById('dashPromedioDiario');
        if(elTotSemana) elTotSemana.textContent = `$${totalSemana.toFixed(2)}`;
        if(elPromDiario) elPromDiario.textContent = `$${(totalSemana/7).toFixed(2)}`;
    }

// 4. Actualizar Alerta de Stock Bajo (Banner inferior)
    const alertBanner = document.getElementById('dashAlertBanner');
    const alertTitle = document.getElementById('dashAlertTitle');

    if (alertBanner && alertTitle) {
        if (data.stock_bajo > 0) {
            // Si hay productos con stock bajo, mostramos la alerta y actualizamos el número
            alertBanner.style.display = 'flex'; 
            
            // Lógica para que suene natural en singular o plural
            if (data.stock_bajo === 1) {
                alertTitle.textContent = `1 producto con existencias bajas`;
            } else {
                alertTitle.textContent = `${data.stock_bajo} productos con existencias bajas`;
            }
        } else {
            // Si no hay stock bajo (es 0), escondemos la alerta por completo para mantener limpio el dashboard
            alertBanner.style.display = 'none'; 
        }
    }

  } catch (error) {
    console.error('❌ Error cargando dashboard:', error);
  }
}

// ============================================
// MÓDULO: USUARIOS
// ============================================
// Variables globales para la paginación de usuarios
let usuariosData = [];
let paginaUsuariosActual = 1;
const USUARIOS_POR_PAGINA = 10; // Aquí defines que sean 10 por página

async function cargarUsuarios() {
  try {
    const response = await fetch(`${API_URL}/usuarios`);
    if (!response.ok) throw new Error('Error al cargar usuarios');
    const data = await response.json();
    
    usuariosData = data.usuarios; // Guardamos todos los usuarios en la memoria
    paginaUsuariosActual = 1; // Siempre empezamos en la página 1
    
    renderizarTablaUsuarios(); // Llamamos a la función que dibuja la tabla
  } catch (error) {
    console.error('❌ Error cargando usuarios:', error);
  }
}

// Función que dibuja solo los 10 usuarios correspondientes a la página actual
function renderizarTablaUsuarios() {
  const tbody = document.getElementById('usuariosBody');
  const info = document.getElementById('infoPaginacionUsuarios');
  const pager = document.getElementById('botonesPaginacionUsuarios');
  
  if (!tbody || !info || !pager) return;
  
  if (usuariosData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--muted)">No hay usuarios registrados.</td></tr>`;
      info.textContent = 'Mostrando 0 usuarios';
      pager.innerHTML = '';
      return;
  }
  
  // 1. Matemáticas de Paginación
  const totalPaginas = Math.ceil(usuariosData.length / USUARIOS_POR_PAGINA);
  const inicio = (paginaUsuariosActual - 1) * USUARIOS_POR_PAGINA;
  const fin = inicio + USUARIOS_POR_PAGINA;
  const usuariosPagina = usuariosData.slice(inicio, fin); // Recortamos solo 10
  
  // 2. Dibujar las filas
  tbody.innerHTML = usuariosPagina.map(u => {
    const inicial = u.nombre_completo.charAt(0).toUpperCase();
    const badgeRol = u.rol === 'admin' 
      ? '<span style="background:var(--gold-deep); color:#fff; padding:4px 10px; border-radius:20px; font-size:10px; font-weight:bold; letter-spacing:1px;">ADMINISTRADOR</span>' 
      : '<span style="border:1px solid var(--gold-light); color:var(--ink-soft); padding:4px 10px; border-radius:20px; font-size:10px; font-weight:bold; letter-spacing:1px;">EMPLEADO</span>';
      
    const badgeEstado = u.estado === 'activo' 
      ? '<span style="color:#2d7a4d; font-size:12px; font-weight:500;">● Activo</span>' 
      : '<span style="color:#b25e2b; font-size:12px; font-weight:500;">● Inactivo</span>';
      
    const acceso = u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleDateString() : 'Nunca';
    
    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:36px; height:36px; border-radius:50%; background:var(--gold-light); color:var(--gold-deep); display:flex; align-items:center; justify-content:center; font-weight:bold; font-family:serif;">${inicial}</div>
            <span style="font-weight:600; font-size:14px;">${u.nombre_completo}</span>
          </div>
        </td>
        <td style="font-family:var(--mono); font-size:13px; color:var(--ink-soft);">${u.correo}</td>
        <td>${badgeRol}</td>
        <td style="font-size:13px; color:var(--muted);">${acceso}</td>
        <td>${badgeEstado}</td>
        <td style="text-align:right; display:flex; justify-content:flex-end; gap:5px;">
          <button class="btn btn-ghost btn-sm" onclick="editarUsuario(${u.id})" title="Editar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-ghost btn-sm" style="color: #b25e2b;" onclick="eliminarUsuario(${u.id})" title="Eliminar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  
  // 3. Actualizar textos y botones de paginación
  const total = usuariosData.length;
  info.textContent = `Mostrando ${inicio + 1} - ${Math.min(fin, total)} de ${total} usuarios`;
  
  let botonesHTML = '';
  for (let i = 1; i <= totalPaginas; i++) {
    // Si es la página actual, le ponemos fondo dorado
    const estiloActivo = i === paginaUsuariosActual ? 'background:var(--gold-light); color:var(--gold-deep); font-weight:bold;' : '';
    botonesHTML += `<button class="btn btn-ghost btn-sm" style="${estiloActivo}" onclick="cambiarPaginaUsuarios(${i})">${i}</button>`;
  }
  pager.innerHTML = botonesHTML;
}

// Función que se ejecuta al darle clic a un botón (ej: [1], [2], [3])
function cambiarPaginaUsuarios(nuevaPagina) {
  paginaUsuariosActual = nuevaPagina;
  renderizarTablaUsuarios();
}

// Abrir y cerrar el modal de usuarios
function abrirModalUsuario() {
  document.getElementById('formUsuario').reset();
  document.getElementById('modalUsuario').classList.add('active');
}

function cerrarModalUsuario() {
  document.getElementById('modalUsuario').classList.remove('active');
}

// Enviar los datos del nuevo usuario al Backend de Python
async function guardarUsuario() {
  const nombre = document.getElementById('usuNombre').value.trim();
  const correo = document.getElementById('usuCorreo').value.trim();
  const password = document.getElementById('usuPassword').value;
  const rol = document.getElementById('usuRol').value;

  if (!nombre || !correo || !password) {
    mostrarToast('⚠️ Por favor completa todos los campos', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre_completo: nombre,
        correo: correo,
        password: password,
        rol: rol
      })
    });

    const data = await response.json();

    if (response.ok) {
      mostrarToast('✅ Usuario registrado con éxito');
      cerrarModalUsuario();
      cargarUsuarios(); // Recargamos la tabla para ver al nuevo usuario
    } else {
      throw new Error(data.error || 'Error al guardar el usuario');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarToast(`❌ ${error.message}`, 'error');
  }
}

// Eliminar un usuario enviando la petición DELETE a Python
async function eliminarUsuario(id) {
  // 1. LEEMOS LA CONFIGURACIÓN ACTUAL DE LA BÓVEDA
  const prefsGuardadas = localStorage.getItem('papersys_prefs');
  let pedirConfirmacion = false; // Por defecto no preguntamos
  
  if (prefsGuardadas) {
    const prefs = JSON.parse(prefsGuardadas);
    pedirConfirmacion = prefs.confirmarBorrado; // Leemos si prendiste el switch
  }

  // 2. ACTUAMOS SEGÚN LO QUE DIGA EL SWITCH
  if (pedirConfirmacion) {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.')) {
      return; 
    }
  }

  try {
    const response = await fetch(`${API_URL}/usuarios/${id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (response.ok) {
      mostrarToast('🗑️ Usuario eliminado correctamente');
      cargarUsuarios(); // Recargamos la tabla para que desaparezca al instante
    } else {
      throw new Error(data.error || 'Error al eliminar el usuario');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarToast(`❌ ${error.message}`, 'error');
  }
}

// ============================================
// CONFIGURACIÓN: MODO OSCURO
// ============================================
function alternarModoOscuro() {
  const toggleBtn = document.getElementById('toggleDarkMode');
  const body = document.body;
  
  // Alternar la clase en el body y en el botón visual
  body.classList.toggle('dark-theme');
  toggleBtn.classList.toggle('on');
  
  // Guardar la preferencia en el navegador
  if (body.classList.contains('dark-theme')) {
    localStorage.setItem('papersys_tema', 'dark');
  } else {
    localStorage.setItem('papersys_tema', 'light');
  }
}

// Función para revisar el tema guardado al abrir la página
function cargarPreferenciaTema() {
  const temaGuardado = localStorage.getItem('papersys_tema');
  const toggleBtn = document.getElementById('toggleDarkMode');
  
  if (temaGuardado === 'dark') {
    document.body.classList.add('dark-theme');
    if (toggleBtn) toggleBtn.classList.add('on');
  } else {
    document.body.classList.remove('dark-theme');
    if (toggleBtn) toggleBtn.classList.remove('on');
  }
}

// ============================================
// CONFIGURACIÓN: DATOS DEL NEGOCIO
// ============================================

// Función para guardar los datos al presionar el botón
function guardarConfiguracion() {
  const config = {
    nombre: document.getElementById('confNombre').value,
    direccion: document.getElementById('confDireccion').value,
    telefono: document.getElementById('confTelefono').value,
    rfc: document.getElementById('confRFC').value,
    desc: document.getElementById('confDesc').value
  };
  
  // Convertimos a texto y guardamos en la bóveda del navegador
  localStorage.setItem('papersys_config', JSON.stringify(config));
  
  mostrarToast('✅ Configuración guardada correctamente');
}

// Función para cargar los datos guardados al entrar al sistema
function cargarConfiguracion() {
  const configGuardada = localStorage.getItem('papersys_config');
  
  if (configGuardada) {
    const config = JSON.parse(configGuardada); // Convertimos de texto a objeto de nuevo
    
    // Si existe, rellenamos los campos
    document.getElementById('confNombre').value = config.nombre || '';
    document.getElementById('confDireccion').value = config.direccion || '';
    document.getElementById('confTelefono').value = config.telefono || '';
    document.getElementById('confRFC').value = config.rfc || '';
    document.getElementById('confDesc').value = config.desc || '';
  }
}

// ============================================
// CONFIGURACIÓN: PREFERENCIAS GENERALES
// ============================================

// Función genérica para prender/apagar visualmente los switches
function alternarToggle(id) {
  document.getElementById(id).classList.toggle('on');
}

// Guarda todas las preferencias en tiempo real
function guardarPreferencias() {
  const prefs = {
    alertasStock: document.getElementById('prefStock').classList.contains('on'),
    confirmarBorrado: document.getElementById('prefConfirmar').classList.contains('on'),
    respaldoAuto: document.getElementById('prefRespaldo').classList.contains('on'),
    moneda: document.getElementById('prefMoneda').value,
    zonaHoraria: document.getElementById('prefZona').value
  };
  
  localStorage.setItem('papersys_prefs', JSON.stringify(prefs));
  mostrarToast('⚙️ Preferencias del sistema actualizadas');
}

// Carga las preferencias cuando el usuario abre la página
function cargarPreferencias() {
  const prefsGuardadas = localStorage.getItem('papersys_prefs');
  
  if (prefsGuardadas) {
    const prefs = JSON.parse(prefsGuardadas);
    
    // Restaurar los switches visualmente
    if (prefs.alertasStock) document.getElementById('prefStock').classList.add('on');
    else document.getElementById('prefStock').classList.remove('on');
    
    if (prefs.confirmarBorrado) document.getElementById('prefConfirmar').classList.add('on');
    else document.getElementById('prefConfirmar').classList.remove('on');
    
    if (prefs.respaldoAuto) document.getElementById('prefRespaldo').classList.add('on');
    else document.getElementById('prefRespaldo').classList.remove('on');
    
    // Restaurar los menús desplegables
    if (prefs.moneda) document.getElementById('prefMoneda').value = prefs.moneda;
    if (prefs.zonaHoraria) document.getElementById('prefZona').value = prefs.zonaHoraria;
  }
}

// ============================================
// SISTEMA DE NOTIFICACIONES (LA CAMPANITA)
// ============================================

// Abrir/Cerrar el panel
function toggleNotificaciones() {
  const panel = document.getElementById('panelNotificaciones');
  const badge = document.getElementById('campanaBadge');
  
  if (panel.style.display === 'none' || panel.style.display === '') {
    panel.style.display = 'flex';
    badge.style.display = 'none'; // Escondemos el puntito rojo al abrir
  } else {
    panel.style.display = 'none';
  }
}

// Crear una nueva notificación
function agregarNotificacion(titulo, texto, tipo = 'info') {
  const lista = document.getElementById('listaNotificaciones');
  const badge = document.getElementById('campanaBadge');
  const emptyMsg = lista.querySelector('.notif-empty');
  
  if (emptyMsg) {
    emptyMsg.remove(); // Quitamos el mensaje de "No hay notificaciones"
  }
  
  // Creamos el HTML de la nueva alerta
  const html = `
    <div class="notif-item ${tipo}">
      <div class="notif-title">${titulo}</div>
      <div class="notif-text">${texto}</div>
    </div>
  `;
  
  // La agregamos hasta arriba
  lista.insertAdjacentHTML('afterbegin', html);
  
  // Encendemos el puntito rojo si el panel está cerrado
  if (document.getElementById('panelNotificaciones').style.display !== 'flex') {
    badge.style.display = 'block';
  }
}

// Limpiar todas las notificaciones
function limpiarNotificaciones() {
  document.getElementById('listaNotificaciones').innerHTML = '<div class="notif-empty">No hay notificaciones nuevas</div>';
}

// ============================================
// INICIALIZAR TODO
// ============================================
cargarProductos();
cargarCategorias();
cargarHistorial();
cargarDashboard()
cargarUsuarios();
cargarPreferenciaTema();
cargarConfiguracion();
cargarPreferencias();
renderHistory();
renderUsers();