// src/app/api/usuarios/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";

import { user } from "@/db/schema"; // esquema user de Drizzle

export async function GET() {
  try {
    const usuarios = await db.select().from(user);

    // Transformamos campos para la vista
    const usuariosFormateados = usuarios.map((u) => ({
      id: u.id,
      nombre: u.name?.split(" ")[0] ?? "",
      apellido: u.name?.split(" ")[1] ?? "",
      email: u.email,
      rol: u.role || "user",
      estado: u.status === "active" ? "activo" : "inactivo",
      fechaRegistro: u.createdAt?.toISOString?.().split("T")[0] ?? "",
      ultimoAcceso: u.updatedAt?.toISOString?.().split("T")[0] ?? "",
      kycVerificado: u.emailVerified ?? false,
    }));

    return NextResponse.json(usuariosFormateados);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}
