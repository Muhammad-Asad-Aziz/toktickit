import { Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export async function getRelatedSystems(_req: Request, res: Response) {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
      orderBy: { name: "asc" },
    });
    res.status(200).json(systems);
  } catch {
    res.status(500).json({ error: "Failed to fetch related systems" });
  }
}
