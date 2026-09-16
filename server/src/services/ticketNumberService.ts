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

  let allocatedNumber = sequence.nextVal === 2 ? 1 : sequence.nextVal - 1;
  let paddedSequence = String(allocatedNumber).padStart(5, "0");
  let candidate = `TKT-${year}-${paddedSequence}`;

  const existing = await tx.ticket.findUnique({
    where: { ticketNumber: candidate },
    select: { id: true },
  });

  if (existing) {
    const lastTicket = await tx.ticket.findFirst({
      where: { ticketNumber: { startsWith: `TKT-${year}-` } },
      orderBy: { ticketNumber: "desc" },
      select: { ticketNumber: true },
    });

    let maxNum = allocatedNumber;
    if (lastTicket) {
      const parts = lastTicket.ticketNumber.split("-");
      const lastNum = parseInt(parts[2], 10);
      if (!isNaN(lastNum) && lastNum >= maxNum) {
        maxNum = lastNum;
      }
    }

    allocatedNumber = maxNum + 1;
    paddedSequence = String(allocatedNumber).padStart(5, "0");
    candidate = `TKT-${year}-${paddedSequence}`;

    await tx.ticketNumberSequence.update({
      where: { year },
      data: { nextVal: allocatedNumber + 1 },
    });
  }

  return candidate;
}
