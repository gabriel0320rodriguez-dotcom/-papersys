¡Perfecto! 😴☕ Aquí va tu **guía express para retomar PaperSys cuando vuelvas a la compu**. Guárdala/recuérdala porque la usarás todos los días:

---

## ☀️ Rutina diaria para retomar PaperSys

### 🟢 Paso 1 — Abrir VS Code con tu proyecto

**Opción A (recomendada):** Abre VS Code y en la pantalla de bienvenida verás "Recientes" → clic en **PaperSys**

**Opción B:** Si no aparece, ve a **Archivo → Abrir carpeta** → navega a `D:\PaperSys` → Seleccionar carpeta

> 💡 También puedes hacer doble clic en la carpeta `D:\PaperSys` desde el Explorador de Windows, luego clic derecho → "Open with Code"

---

### 🟢 Paso 2 — Verificar que MySQL esté corriendo

Como configuramos MySQL con **inicio automático**, debería estar prendido solo cada vez que enciendes la computadora. ✅

Si dudas, abre **MySQL Workbench** rapidito y conéctate. Si entra sin error, está corriendo. Cierra Workbench si no lo vas a usar.

---

### 🟢 Paso 3 — Abrir la terminal en VS Code

`` Ctrl + ñ `` (o `Ctrl + ` ` con el acento grave)

Deberías ver:
```
PS D:\PaperSys>
```

---

### 🟢 Paso 4 — Activar el entorno virtual

```powershell
venv\Scripts\activate
```

Verás aparecer `(venv)` en verde al inicio:
```
(venv) PS D:\PaperSys>
```

> ⚠️ **Súper importante:** SIEMPRE activa el `venv` antes de correr Python. Si no, te dirá "No module named flask" y otros errores.

---

### 🟢 Paso 5 — Arrancar el backend (Flask)

```powershell
python backend/app.py
```

Verás:
```
🪶 Iniciando PaperSys API...
📡 Servidor corriendo en: http://localhost:5000
⏹️  Presiona CTRL+C para detener
```

**No cierres esa terminal.** El servidor está corriendo ahí. 🟢

---

### 🟢 Paso 6 — Abrir una segunda terminal (opcional pero útil)

Si necesitas ejecutar otros comandos mientras Flask corre:

`` Ctrl + Shift + ñ `` → se abre nueva terminal

Y actívala también:
```powershell
venv\Scripts\activate
```

---

### 🟢 Paso 7 — Abrir el frontend

En el Explorador de VS Code:
1. Clic derecho en `frontend/index.html`
2. **"Open with Live Server"**
3. Se abrirá tu navegador en `http://127.0.0.1:5500/frontend/index.html`

---

## 🎯 Resumen visual

```
┌──────────────────────────────────────────────┐
│  🟢 1. Abrir VS Code → PaperSys              │
│  🟢 2. MySQL ya corre solo (auto)            │
│  🟢 3. Ctrl + ñ → abrir terminal             │
│  🟢 4. venv\Scripts\activate                 │
│  🟢 5. python backend/app.py                 │
│  🟢 6. Clic derecho index.html → Live Server │
│                                              │
│  ✅ ¡A trabajar! 🚀                         │
└──────────────────────────────────────────────┘
```

---

## 🛑 Cuando termines de trabajar

1. **Detener Flask:** `Ctrl + C` en la terminal donde corre
2. **Cerrar Live Server:** en la barra inferior derecha de VS Code, donde dice "Port: 5500", haz clic para detener
3. **Cerrar VS Code:** normal, con la X
4. **MySQL puede quedarse corriendo:** no consume casi recursos. Si quieres apagarlo, en `services.msc` busca `MySQL80` y dale "Detener". Pero no es necesario.

---

## 🚨 Solución de problemas comunes al retomar

| Si te pasa... | Solución |
|---|---|
| `python no se reconoce` | No activaste el `venv` → hazlo |
| `Address already in use` al correr Flask | Otro Flask sigue corriendo. Cierra todas las terminales y reintenta |
| Live Server no abre | Tal vez se actualizó VS Code. Reinstala "Live Server" si pasa |
| `No module named flask` | El `venv` no está activo |
| Error de conexión a MySQL | Servicio MySQL apagado. Inícialo en `services.msc` |

---

## ✅ Cuando vuelvas y estés lista

Antes de empezar a codear, mándame screenshot de cómo se ve tu VS Code con:
- Flask corriendo en una terminal
- `(venv)` activo
- Y dime "lista" 

Y continuamos con el **Paso 10: conectar el frontend con la API** — donde tu PaperSys mostrará productos REALES de MySQL en la tabla. 🪶✨

---

### 🌙 Una cosa más antes de descansar

Si quieres tener **toda esta guía escrita** para no perderla, te recomiendo:

1. Abre tu archivo `README.md` (que está en la raíz, vacío)
2. Pega ahí los pasos 1-7 que te di arriba
3. Guarda con `Ctrl + S`

