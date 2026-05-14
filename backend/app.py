"""
PaperSys - Servidor Flask
API REST para la aplicación de gestión de papelería
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
from config import conectar_db
from datetime import datetime
import random
import string
import bcrypt
import mysql.connector

# Crear la aplicación Flask
app = Flask(__name__)

# Habilitar CORS (permite que el frontend en :5500 hable con el backend en :5000)
CORS(app)


# ============================================
# RUTA DE PRUEBA
# ============================================
@app.route('/')
def inicio():
    """Página de bienvenida del API"""
    return jsonify({
        'mensaje': '🪶 PaperSys API funcionando correctamente',
        'version': '1.0',
        'endpoints': {
            'productos': '/api/productos',
            'categorias': '/api/categorias'
        }
    })


# ============================================
# PRODUCTOS Y GENERACIÓN DE SKU
# ============================================
def generar_sku(nombre_prod, categoria_id, conexion):
    """Genera un código SKU único basado en categoría, nombre y fecha"""
    cursor = conexion.cursor()
    cursor.execute("SELECT nombre FROM categorias WHERE id = %s", (categoria_id,))
    cat = cursor.fetchone()
    
    # Tomar las primeras 3 letras de la categoría y del nombre
    sigla_cat = (cat[0][:3]).upper() if cat else "GEN"
    sigla_nom = (nombre_prod[:3]).upper().replace(" ", "X")
    fecha = datetime.now().strftime("%y%m") # Año y mes actual (ej. 2605)
    aleatorio = ''.join(random.choices(string.digits, k=3)) # 3 números al azar
    
    return f"{sigla_cat}-{sigla_nom}-{fecha}{aleatorio}"

@app.route('/api/productos', methods=['GET'])
def listar_productos():
    """Devuelve la lista de productos incluyendo el SKU"""
    conexion = conectar_db()
    if not conexion:
        return jsonify({'error': 'No se pudo conectar a la base de datos'}), 500
    
    try:
        cursor = conexion.cursor(dictionary=True)
        # Agregamos p.sku a la consulta SELECT
        cursor.execute("""
            SELECT 
                p.id, p.sku, p.nombre, p.precio, p.cantidad,
                p.categoria_id, c.nombre AS categoria, p.fecha_creacion
            FROM productos p
            LEFT JOIN categorias c ON p.categoria_id = c.id
            ORDER BY p.id ASC
        """)
        productos = cursor.fetchall()
        
        for p in productos:
            p['precio'] = float(p['precio'])
            if p['fecha_creacion']:
                p['fecha_creacion'] = p['fecha_creacion'].isoformat()
        
        cursor.close()
        conexion.close()
        
        return jsonify({
            'total': len(productos),
            'productos': productos
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/productos', methods=['POST'])
def crear_producto():
    """Crea un nuevo producto generando su SKU automáticamente"""
    datos = request.get_json()
    
    if not datos or not all(k in datos for k in ('nombre', 'precio', 'cantidad', 'categoria_id')):
        return jsonify({'error': 'Faltan campos requeridos'}), 400
    
    conexion = conectar_db()
    if not conexion:
        return jsonify({'error': 'Error de conexión'}), 500
    
    try:
        # Generar el nuevo SKU
        nuevo_sku = generar_sku(datos['nombre'], datos['categoria_id'], conexion)
        
        cursor = conexion.cursor()
        sql = """
            INSERT INTO productos (sku, nombre, precio, cantidad, categoria_id) 
            VALUES (%s, %s, %s, %s, %s)
        """
        valores = (nuevo_sku, datos['nombre'], datos['precio'], datos['cantidad'], datos['categoria_id'])
        cursor.execute(sql, valores)
        conexion.commit()
        
        nuevo_id = cursor.lastrowid
        cursor.close()
        conexion.close()
        
        return jsonify({
            'mensaje': '✅ Producto creado exitosamente',
            'id': nuevo_id,
            'sku': nuevo_sku
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# ELIMINAR PRODUCTO (DELETE)
# ============================================
@app.route('/api/productos/<int:id>', methods=['DELETE'])
def eliminar_producto(id):
    """
    Elimina un producto de la base de datos según su ID.
    """
    conexion = conectar_db()
    if not conexion:
        return jsonify({'error': 'No se pudo conectar a la base de datos'}), 500
    
    try:
        cursor = conexion.cursor()
        
        # 1. Verificar si el producto existe antes de borrarlo
        cursor.execute("SELECT id FROM productos WHERE id = %s", (id,))
        if not cursor.fetchone():
            return jsonify({'error': 'El producto no existe'}), 404

        # 2. Ejecutar el borrado
        cursor.execute("DELETE FROM productos WHERE id = %s", (id,))
        conexion.commit()
        
        cursor.close()
        conexion.close()
        
        return jsonify({'mensaje': '✅ Producto eliminado exitosamente'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# ACTUALIZAR PRODUCTO (PUT)
# ============================================
@app.route('/api/productos/<int:id>', methods=['PUT'])
def actualizar_producto(id):
    """
    Actualiza los datos de un producto existente.
    Espera JSON: { nombre, precio, cantidad, categoria_id }
    """
    datos = request.get_json()
    
    # Validar campos
    if not datos or not all(k in datos for k in ('nombre', 'precio', 'cantidad', 'categoria_id')):
        return jsonify({'error': 'Faltan campos obligatorios'}), 400
    
    conexion = conectar_db()
    if not conexion:
        return jsonify({'error': 'Error de conexión'}), 500
    
    try:
        cursor = conexion.cursor()
        sql = """
            UPDATE productos 
            SET nombre = %s, precio = %s, cantidad = %s, categoria_id = %s 
            WHERE id = %s
        """
        valores = (datos['nombre'], datos['precio'], datos['cantidad'], datos['categoria_id'], id)
        
        cursor.execute(sql, valores)
        conexion.commit()
        
        cursor.close()
        conexion.close()
        
        return jsonify({'mensaje': '✅ Producto actualizado correctamente'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# VENTAS
# ============================================
@app.route('/api/ventas', methods=['POST'])
def registrar_venta():
    """
    Registra una nueva venta, guarda sus detalles y descuenta el inventario.
    Espera JSON: { metodo_pago, total, productos: [{producto_id, cantidad, precio, subtotal}, ...] }
    """
    datos = request.get_json()
    
    # Validar que venga información y que el carrito no esté vacío
    if not datos or not datos.get('productos') or len(datos['productos']) == 0:
        return jsonify({'error': 'El carrito está vacío'}), 400
        
    conexion = conectar_db()
    if not conexion:
        return jsonify({'error': 'Error al conectar con la base de datos'}), 500
        
    try:
        # Desactivamos el autocommit para manejar la transacción manualmente
        conexion.autocommit = False
        cursor = conexion.cursor()
        
        # 1. Insertar la venta general (Asumimos usuario_id = 1 porque aún no hay login completo)
        sql_venta = """
            INSERT INTO ventas (total, metodo_pago, usuario_id) 
            VALUES (%s, %s, %s)
        """
        cursor.execute(sql_venta, (datos['total'], datos['metodo_pago'], 1))
        
        # Obtenemos el ID de la venta que se acaba de crear
        venta_id = cursor.lastrowid 
        
        # 2. Iterar sobre los productos del carrito
        for item in datos['productos']:
            # a) Insertar en el detalle de la venta
            sql_detalle = """
                INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(sql_detalle, (venta_id, item['producto_id'], item['cantidad'], item['precio'], item['subtotal']))
            
            # b) Descontar del inventario real
            sql_stock = """
                UPDATE productos 
                SET cantidad = cantidad - %s 
                WHERE id = %s AND cantidad >= %s
            """
            cursor.execute(sql_stock, (item['cantidad'], item['producto_id'], item['cantidad']))
            
            # Si affected_rows es 0, significa que no había stock suficiente
            if cursor.rowcount == 0:
                raise Exception(f"Stock insuficiente para el producto ID {item['producto_id']}")
                
        # 3. Si todo salió bien, confirmamos la transacción (Guardamos definitivamente)
        conexion.commit()
        cursor.close()
        conexion.close()
        
        return jsonify({
            'mensaje': '✅ Venta registrada exitosamente', 
            'venta_id': venta_id
        }), 201
        
    except Exception as e:
        # Si ocurre CUALQUIER error, deshacemos todos los cambios en las 3 tablas
        if conexion:
            conexion.rollback() 
            conexion.close()
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/ventas', methods=['GET'])
def listar_ventas():
    """
    Devuelve el historial de todas las ventas registradas.
    Calcula el total de artículos vendidos por cada transacción.
    """
    conexion = conectar_db()
    if not conexion:
        return jsonify({'error': 'Error de conexión a la BD'}), 500
        
    try:
        cursor = conexion.cursor(dictionary=True)
        # Hacemos una subconsulta para contar cuántos artículos en total tuvo esa venta
        sql = """
            SELECT 
                v.id, 
                v.fecha, 
                v.metodo_pago, 
                v.total, 
                COALESCE(u.nombre_completo, 'Usuario General') AS cajero,
                (SELECT COALESCE(SUM(cantidad), 0) FROM detalle_ventas WHERE venta_id = v.id) as articulos
            FROM ventas v
            LEFT JOIN usuarios u ON v.usuario_id = u.id
            ORDER BY v.fecha DESC
        """
        cursor.execute(sql)
        ventas = cursor.fetchall()
        
        # Formatear los datos para que JSON los entienda
        for v in ventas:
            v['total'] = float(v['total'])
            v['articulos'] = int(v['articulos'])
            if v['fecha']:
                v['fecha'] = v['fecha'].isoformat()
                
        cursor.close()
        conexion.close()
        
        return jsonify({'ventas': ventas}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# DETALLE DE VENTA (TICKET)
# ============================================
@app.route('/api/ventas/<int:id>', methods=['GET'])
def obtener_ticket(id):
    """Obtiene los detalles completos de una venta para imprimir el ticket"""
    conexion = conectar_db()
    if not conexion:
        return jsonify({'error': 'Error de conexión a la BD'}), 500
        
    try:
        cursor = conexion.cursor(dictionary=True)
        
        # 1. Datos generales de la venta
        cursor.execute("""
            SELECT v.id, v.fecha, v.metodo_pago, v.total, 
                   COALESCE(u.nombre_completo, 'Usuario General') AS cajero 
            FROM ventas v LEFT JOIN usuarios u ON v.usuario_id = u.id 
            WHERE v.id = %s
        """, (id,))
        venta = cursor.fetchone()
        
        if not venta:
            return jsonify({'error': 'Venta no encontrada'}), 404

        # 2. Lista de productos vendidos
        cursor.execute("""
            SELECT d.cantidad, d.precio_unitario, d.subtotal, p.nombre 
            FROM detalle_ventas d JOIN productos p ON d.producto_id = p.id 
            WHERE d.venta_id = %s
        """, (id,))
        detalles = cursor.fetchall()
        
        # Formatear números y fechas
        venta['total'] = float(venta['total'])
        if venta['fecha']: venta['fecha'] = venta['fecha'].isoformat()
        
        for d in detalles:
            d['precio_unitario'] = float(d['precio_unitario'])
            d['subtotal'] = float(d['subtotal'])
            
        venta['articulos'] = detalles
        
        cursor.close()
        conexion.close()
        return jsonify(venta), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# DASHBOARD PRINCIPAL
# ============================================
@app.route('/api/dashboard', methods=['GET'])
def obtener_dashboard():
    """Devuelve todas las métricas necesarias para el Panel Principal"""
    conexion = conectar_db()
    if not conexion: return jsonify({'error': 'Error de conexión'}), 500
    
    try:
        cursor = conexion.cursor(dictionary=True)
        
        # 1. Tarjetas Superiores (Productos Totales y Stock Bajo)
        cursor.execute("SELECT COUNT(*) as total FROM productos")
        prods = cursor.fetchone()['total']
        
        cursor.execute("SELECT COUNT(*) as stock_bajo FROM productos WHERE cantidad <= 10 AND cantidad > 0")
        stock_bajo = cursor.fetchone()['stock_bajo']
        
        # 2. Ventas del día de hoy y comparativa con ayer
        cursor.execute("SELECT COUNT(*) as transacciones, COALESCE(SUM(total), 0) as ingresos FROM ventas WHERE DATE(fecha) = CURDATE()")
        ventas_hoy = cursor.fetchone()
        
        cursor.execute("SELECT COALESCE(SUM(total), 0) as ingresos FROM ventas WHERE DATE(fecha) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)")
        ventas_ayer = cursor.fetchone()['ingresos']
        
        # 3. Top 5 Más Vendidos (Histórico)
        cursor.execute("""
            SELECT p.nombre, c.nombre as categoria, SUM(d.cantidad) as total_vendido
            FROM detalle_ventas d
            JOIN productos p ON d.producto_id = p.id
            LEFT JOIN categorias c ON p.categoria_id = c.id
            GROUP BY p.id
            ORDER BY total_vendido DESC
            LIMIT 5
        """)
        top_5 = cursor.fetchall()
        
        # 4. Gráfica: Ventas de los últimos 7 días
        cursor.execute("""
            SELECT DATE(fecha) as fecha_dia, SUM(total) as total_dia
            FROM ventas
            WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
            GROUP BY DATE(fecha)
            ORDER BY fecha_dia ASC
        """)
        ventas_semana = cursor.fetchall()
        
        # Formatear datos para el JSON
        for v in ventas_semana:
            v['fecha_dia'] = str(v['fecha_dia'])
            v['total_dia'] = float(v['total_dia'])

        cursor.close()
        conexion.close()

        return jsonify({
            'productos_total': prods,
            'stock_bajo': stock_bajo,
            'transacciones_hoy': ventas_hoy['transacciones'],
            'ingresos_hoy': float(ventas_hoy['ingresos']),
            'ventas_ayer': float(ventas_ayer),
            'top_5': top_5,
            'ventas_semana': ventas_semana
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# CATEGORÍAS
# ============================================
@app.route('/api/categorias', methods=['GET'])
def listar_categorias():
    """Devuelve la lista de todas las categorías"""
    conexion = conectar_db()
    if not conexion:
        return jsonify({'error': 'No se pudo conectar a la base de datos'}), 500
    
    try:
        cursor = conexion.cursor(dictionary=True)
        cursor.execute("SELECT * FROM categorias ORDER BY id")
        categorias = cursor.fetchall()
        cursor.close()
        conexion.close()
        return jsonify({
            'total': len(categorias),
            'categorias': categorias
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# GESTIÓN DE USUARIOS
# ============================================

@app.route('/api/usuarios', methods=['GET'])
def obtener_usuarios():
    """Devuelve la lista de todos los usuarios registrados adaptada a la BD actual"""
    conexion = conectar_db()
    if not conexion: return jsonify({'error': 'Error de conexión'}), 500
    
    try:
        cursor = conexion.cursor(dictionary=True)
        # Extraemos usando los nombres reales de TU tabla: 'usuario', 'activo', 'fecha_registro'
        cursor.execute("SELECT id, nombre_completo, usuario AS correo, rol, activo, fecha_registro FROM usuarios WHERE activo = 1 ORDER BY id ASC")
        usuarios = cursor.fetchall()
        
        # Adaptamos los datos para que el Frontend (JS) los entienda sin modificar nada más
        for u in usuarios:
            u['estado'] = 'activo' if u['activo'] == 1 else 'inactivo'
            if u['fecha_registro']:
                u['ultimo_acceso'] = u['fecha_registro'].isoformat()
            else:
                u['ultimo_acceso'] = None
                
        cursor.close()
        conexion.close()
        return jsonify({'usuarios': usuarios}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/usuarios', methods=['POST'])
def crear_usuario():
    """Crea un nuevo usuario usando la estructura de la tabla actual"""
    datos = request.get_json()
    
    if not datos or not datos.get('nombre_completo') or not datos.get('correo') or not datos.get('password'):
        return jsonify({'error': 'Faltan datos obligatorios'}), 400
        
    conexion = conectar_db()
    if not conexion: return jsonify({'error': 'Error de conexión'}), 500
    
    try:
        password_plana = datos['password'].encode('utf-8')
        sal = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(password_plana, sal).decode('utf-8')
        
        cursor = conexion.cursor()
        
        # INSERTAMOS usando los nombres de TU tabla: 'usuario' y 'password'
        sql = """
            INSERT INTO usuarios (nombre_completo, usuario, password, rol)
            VALUES (%s, %s, %s, %s)
        """
        # datos['correo'] del formulario web entra en la columna 'usuario' de la BD
        valores = (datos['nombre_completo'], datos['correo'], password_hash, datos.get('rol', 'empleado'))
        
        cursor.execute(sql, valores)
        conexion.commit()
        
        nuevo_id = cursor.lastrowid
        cursor.close()
        conexion.close()
        
        return jsonify({'mensaje': 'Usuario creado exitosamente', 'id': nuevo_id}), 201
        
    except mysql.connector.IntegrityError:
        return jsonify({'error': 'Este correo ya está registrado en el sistema'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/usuarios/<int:id>', methods=['DELETE'])
def eliminar_usuario(id):
    """Realiza una 'Baja Lógica' (Soft Delete) para proteger el historial de ventas"""
    conexion = conectar_db()
    if not conexion: return jsonify({'error': 'Error de conexión'}), 500
    
    try:
        cursor = conexion.cursor()
        
        # EN LUGAR DE BORRAR (DELETE), ACTUALIZAMOS SU ESTADO A INACTIVO (activo = 0)
        cursor.execute("UPDATE usuarios SET activo = 0 WHERE id = %s", (id,))
        conexion.commit()
        
        if cursor.rowcount == 0:
            cursor.close()
            conexion.close()
            return jsonify({'error': 'Usuario no encontrado'}), 404
            
        cursor.close()
        conexion.close()
        
        return jsonify({'mensaje': 'Usuario desactivado correctamente'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================
# ARRANCAR EL SERVIDOR
# ============================================
if __name__ == '__main__':
    print("🪶 Iniciando PaperSys API...")
    print("📡 Servidor corriendo en: http://localhost:5000")
    print("⏹️  Presiona CTRL+C para detener\n")
    app.run(debug=True, port=5000)