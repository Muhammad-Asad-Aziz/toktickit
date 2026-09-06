import { Prisma } from "@prisma/client";

/**
 * Atomically generates a unique sequential Ticket Number in the format TKT-YYYY-NNNNN.
 * Uses PostgreSQL row-level locking via upsert on TicketNumberSequence inside the transaction.
 *
 * - Formats: TKT-YYYY-NNNNN (e.g., TKT-2026-00001, TKT-2026-00002)
 * - Annual sequence reset: resets counter to 00001 on year rollover.
 * - Concurrency safe: serialized updates prevent duplicate ticket numbers across parallel requests.
 */
export async function generateTicketNumber(
  tx: Prisma.TransactionClient,
  targetYear?: number
): Promise<string> {
  const year = targetYear ?? new Date().getFullYear();

  // Atomically advance or initialize sequence counter for the current year
  const sequence = await tx.ticketNumberSequence.upsert({
    where: { year },
    update: { nextVal: { increment: 1 } },
    create: { year, nextVal: 2 },
  });

  const allocatedNumber = sequence.nextVal === 2 ? 1 : sequence.nextVal - 1;
  const paddedSequence = String(allocatedNumber).padStart(5, "0");

  return `TKT-${year}-${paddedSequence}`;
}
