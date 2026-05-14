"""
PaperSys - Configuración de base de datos
Maneja la conexión con MySQL usando variables del archivo .env
"""

import mysql.connector
from mysql.connector import Error
from dotenv import load_dotenv
import os

# Ruta absoluta al archivo .env (siempre lo encuentra, sin importar desde dónde se ejecute)
ruta_env = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(ruta_env)


def conectar_db():
    """
    Crea y devuelve una conexión activa a la base de datos MySQL.
    Si falla, devuelve None y muestra el error.
    """
    try:
        conexion = mysql.connector.connect(
            host=os.getenv('DB_HOST'),
            port=int(os.getenv('DB_PORT', 3306)),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DB_NAME')
        )
        if conexion.is_connected():
            return conexion
    except Error as e:
        print(f"❌ Error al conectar con MySQL: {e}")
        return None


def probar_conexion():
    """
    Prueba la conexión y muestra información del servidor.
    """
    print("🔍 Verificando variables de entorno...")
    print(f"   DB_HOST: {os.getenv('DB_HOST')}")
    print(f"   DB_PORT: {os.getenv('DB_PORT')}")
    print(f"   DB_USER: {os.getenv('DB_USER')}")
    print(f"   DB_NAME: {os.getenv('DB_NAME')}")
    print(f"   DB_PASSWORD: {'*' * len(os.getenv('DB_PASSWORD', ''))}")
    print()
    
    conexion = conectar_db()
    if conexion:
        info = conexion.server_info
        cursor = conexion.cursor()
        cursor.execute("SELECT DATABASE();")
        db = cursor.fetchone()
        print(f"✅ Conectado a MySQL versión {info}")
        print(f"📁 Base de datos activa: {db[0]}")
        cursor.close()
        conexion.close()
        return True
    return False


if __name__ == "__main__":
    probar_conexion()