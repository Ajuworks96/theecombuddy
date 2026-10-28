import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

export const GET = (req: MedusaRequest, res: MedusaResponse) => {
  res.status(200).json({
    status: "ok",
    service: "the-ecom-buddy-backend",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
};

