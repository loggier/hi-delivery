import { NextResponse } from "next/server";

export const simulateLatency = (min = 200, max = 600) => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(res => setTimeout(res, delay));
};

export const jsonResponse = (status: number, data: any) => {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
};

export const errorResponse = (status: number, message: string) => {
  return jsonResponse(status, { message });
};
