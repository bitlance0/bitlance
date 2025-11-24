// src/app/api/news/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

  if (!API_KEY) {
    return NextResponse.json(
      { error: "Missing Alpha Vantage API key" },
      { status: 500 }
    );
  }

  const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&apikey=${API_KEY}`;

  try {
    const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 min opcional
    const data = await res.json();

    // Valida respuesta
    if (!data.feed) {
      return NextResponse.json(
        { error: "No se encontraron noticias", raw: data },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Error al obtener noticias:", err);
    return NextResponse.json(
      { error: "Error al obtener noticias" },
      { status: 500 }
    );
  }
}
