// src/app/api/itick/structure/route.ts

import { NextResponse } from "next/server";
import { buildMarketStructure } from "@/lib/itick/buildMarketStructure";

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url);

  const market = searchParams.get("market");
  const exchange = searchParams.get("exchange");

  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      token: process.env.ITICK_API_KEY!,
    },
  };

  const url = `${process.env.ITICK_API_URL}/symbol/list`;

  const res = await fetch(url, options);

  if (!res.ok) {
    return NextResponse.json(
      { error: "Error fetching iTick symbols" },
      { status: 500 }
    );
  }

  const json = await res.json();

  // debug tipos reales que entrega iTick
  const types = new Set<string>();

  json.data.forEach((item: any) => {
    if (item.t) types.add(item.t);
  });

  console.log("ITICK RAW TYPES:", [...types]);

  // construir estructura
  const structure = buildMarketStructure(json.data);

  console.log("AVAILABLE MARKETS:", Object.keys(structure));

  Object.keys(structure).forEach((m) => {
    console.log("EXCHANGES FOR", m, Object.keys(structure[m]));
  });

  // 🔹 si no se pasa market → devolver solo mercados disponibles
  if (!market) {
    return NextResponse.json(Object.keys(structure));
  }

  const marketData = structure[market];

  if (!marketData) {
    return NextResponse.json([]);
  }

  // 🔹 si solo se pide market → devolver exchanges
  if (!exchange) {
    return NextResponse.json(Object.keys(marketData));
  }

  const exchangeData = marketData[exchange];

  if (!exchangeData) {
    return NextResponse.json([]);
  }

  // 🔹 devolver símbolos del exchange
  return NextResponse.json(exchangeData);
}


// src/app/api/itick/structure/route.ts

// import { NextResponse } from "next/server";
// import { buildMarketStructure } from "@/lib/itick/buildMarketStructure";

// export async function GET() {

//   const options = {
//     method: "GET",
//     headers: {
//       accept: "application/json",
//       token: process.env.ITICK_API_KEY!,
//     },
//   };

//       const url = `${process.env.ITICK_API_URL}/symbol/list?type=stock&region=US`;
//     // const url = `${process.env.ITICK_API_URL}/symbol/list`;
// console.log("ITICK_API_KEY:", process.env.ITICK_API_KEY?.slice(0,3));
// console.log("ITICK_API_URL:", process.env.ITICK_API_URL);
//   const res = await fetch(url, options);
//   const json = await res.json();
//   console.log("ITICK RAW RESPONSE:", json);
//   const types = new Set<string>();

// json.data.forEach((item: any) => {
//   if (item.t) types.add(item.t);
// });

//     // console.log("ITICK RAW TYPES:", [...types]);

//   const structure = buildMarketStructure(json.data);

//   return NextResponse.json(structure);
// }

