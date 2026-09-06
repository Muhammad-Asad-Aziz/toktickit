import { Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export async function getRequesters(_req: Request, res: Response) {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
    res.status(200).json(requesters);
  } catch {
    res.status(500).json({ error: "Failed to fetch development requesters" });
  }
}
