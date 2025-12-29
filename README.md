# 🌌 DarkRP Bot & Dashboard

<div align="center">

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![NodeJS](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)

**Una solución integral para comunidades de Roleplay en Discord.**
*Gestión económica, inventarios en tiempo real y un dashboard inmersivo.*

[Características](#-características) • [Tecnologías](#-stack-tecnológico) • [Instalación](#-instalación)

</div>

---

## ✨ Características Principales

### 🎮 Sistema de Roleplay Avanzado
*   **Economía Robusta**: Sistema de dinero en mano y banco, con transferencias seguras y logs detallados.
*   **Inventario & Mochilas**: Gestión visual de objetos, mochilas con capacidad limitada y metadatos de items.
*   **Tienda & Catálogo**: Compra y venta de objetos configurable por servidor.
*   **Salarios Automáticos**: Cron jobs (`node-schedule`) para pagos periódicos según roles de Discord.

### 💻 Dashboard Moderno (Web)
*   **Diseño Premium**: Interfaz *Glassmorphism* construida con **TailwindCSS** y animaciones fluidas.
*   **Sincronización Real-Time**: WebSockets (`Socket.io`) para actualizaciones instantáneas entre el bot y la web.
*   **Gestión Total**:
    *   **Mi Perfil**: Visualiza tu inventario, saldo y estadísticas.
    *   **Administración**: Panel para que los dueños de servidores editen la economía de sus usuarios.
    *   **Mochilas**: Organización visual de items dentro de contenedores.

### 🤖 Bot de Discord Potente
*   **Comandos Slash**: Interacciones modernas y rápidas.
*   **Base de Datos Sólida**: Persistencia de datos confiable con **MongoDB** y **Mongoose**.
*   **Arquitectura Escalable**: Estructura modular basada en eventos y comandos.

---

## 🛠 Stack Tecnológico

Este proyecto opera como un **Monorepo** que integra el Bot y el Dashboard.

| Componente | Tecnologías Clave |
| :--- | :--- |
| **Backend & Bot** | `Node.js`, `Discord.js v14`, `Fastify`, `Socket.io`, `Mongoose` |
| **Frontend (Dashboard)** | `React`, `Vite`, `TypeScript`, `TailwindCSS`, `Framer Motion` |
| **Herramientas** | `Tsup` (Build), `Concurrently` (Dev), `Zod` (Validación) |

---

## 🚀 Instalación y Despliegue

### Requisitos Previos
*   Node.js v20+
*   MongoDB Database

### 1. Clonar y Preparar
```bash
git clone https://github.com/tu-usuario/darkrp-bot.git
cd darkrp-bot
npm install
```

### 2. Configurar Entorno (`.env`)
Crea un archivo `.env` en la raíz con las siguientes variables:
```env
# Discord
BOT_TOKEN=tu_token_aqui
CLIENT_ID=tu_client_id

# Database
MONGO_URI=mongodb+srv://...

# Web / Dashboard
DASHBOARD_URL=http://localhost:3000
JWT_SECRET=secreto_super_seguro
SERVER_PORT=3000
```

### 3. Ejecutar en Desarrollo
Para iniciar tanto el Bot como la Web simultáneamente:
```bash
npm run dev
```

### 4. Compilar para Producción
Genera los archivos optimizados en `dist/` y `build/`:
```bash
npm run build
```

---

## 📜 Scripts Disponibles

*   `npm run dev`: Inicia entorno de desarrollo (Bot + Web con Hot Reload).
*   `npm run build`: Compila todo el proyecto.
*   `npm run start`: Inicia la versión compilada (Producción).
*   `npm run build:bot`: Compila solo el bot.
*   `npm run build:web`: Compila solo el dashboard.

---

<div align="center">
  <sub>Desarrollado con ❤️ para llevar el Roleplay al siguiente nivel.</sub>
</div>
