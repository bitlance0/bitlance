# Guía de Colaboración

Este documento te guiará paso a paso para comenzar a colaborar en este proyecto.

---

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- Node.js (versión 18 o superior)
- Git
- Una cuenta de GitHub

---

## 🚀 Primeros Pasos

### 1. Clonar el repositorio

```bash
git clone https://github.com/rcarlosdev/proyecto01
cd proyecto01
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y configura las variables necesarias:
Edita el archivo `.env` con los valores apropiados para tu entorno de desarrollo.

### 4. Configurar la base de datos (si es necesario)

Si el proyecto utiliza una base de datos, asegúrate de tenerla configurada y ejecuta las migraciones:

```bash
npm run db:push
```

### 5. Ejecutar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación.

---

## 🎨 Tecnologías Utilizadas

Este proyecto utiliza:

- **Next.js** - Framework de React
- **Tailwind CSS** - Framework de CSS utility-first
- **shadcn/ui** - Biblioteca de componentes de UI
- **Drizzle ORM** - ORM para TypeScript

---

## 📊 Drizzle ORM - Operaciones Básicas

Drizzle es el ORM que utilizamos para interactuar con la base de datos.

### Estructura básica

Nuestras definiciones de tablas se encuentran en `src/db/schema.ts`.  
Ejemplo:

```typescript
// Ejemplo de definición de tabla
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 256 }),
  email: varchar('email', { length: 256 }).unique(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Operaciones CRUD básicas

#### Crear registros

```typescript
import { db } from '@/db';
import { users } from '@/db/schema';

// Insertar un nuevo usuario
const newUser = await db.insert(users).values({
  name: 'John Doe',
  email: 'john@example.com'
}).returning();
```

#### Leer registros

```typescript
// Obtener todos los usuarios
const allUsers = await db.select().from(users);

// Obtener usuario por ID
const user = await db.select().from(users).where(eq(users.id, 1));
```

#### Actualizar registros

```typescript
// Actualizar usuario
await db.update(users)
  .set({ name: 'Jane Doe' })
  .where(eq(users.id, 1));
```

#### Eliminar registros

```typescript
// Eliminar usuario
await db.delete(users).where(eq(users.id, 1));
```

### Ejecutar el estudio de la base de datos

Para visualizar y manipular la base de datos localmente, ejecuta:

```bash
npm run db:studio
```

Esto abrirá una interfaz web en tu navegador donde podrás ver y editar los datos.

---

## 🎛️ Comandos Disponibles

- `npm run dev` - Inicia el servidor de desarrollo  
- `npm run build` - Construye la aplicación para producción  
- `npm run start` - Inicia el servidor de producción  
- `npm run lint` - Ejecuta ESLint  
- `npm run db:studio` - Abre el estudio de la base de datos  
- `npm run db:push` - Ejecuta migraciones de la base de datos  

---

## 🧩 Componentes con shadcn/ui

Este proyecto utiliza componentes de **shadcn/ui**, que están preconfigurados con **Tailwind CSS**.

### Uso de componentes

```tsx
import { Button } from "@/components/ui/button";

export default function MyComponent() {
  return (
    <div>
      <Button variant="default">Haz clic aquí</Button>
    </div>
  );
}
```
