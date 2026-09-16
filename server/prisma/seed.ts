import bcrypt from "bcryptjs";
import { getPrisma } from "../src/prisma.js";

export async function seed(prismaClient = getPrisma()) {
  await prismaClient.$executeRawUnsafe(`ALTER TABLE tickets ALTER COLUMN "itPriority" DROP NOT NULL;`);

  // 1. Categories (4 Master Records)
  const categories = [
    { code: "ACC", name: "Account and Access", description: "Logins, passwords, IAM, permissions, account unlock" },
    { code: "HW", name: "Hardware", description: "Monitors, laptops, desktop towers, keyboards, docks, peripherals" },
    { code: "SW", name: "Software", description: "OS issues, university portal tools, desktop applications, licenses" },
    { code: "NET", name: "Network", description: "Campus Wi-Fi, Ethernet ports, DNS, VPN tunnels, connectivity" },
  ];

  for (const cat of categories) {
    await prismaClient.category.upsert({
      where: { name: cat.name },
      update: { code: cat.code, description: cat.description, isActive: true },
      create: { code: cat.code, name: cat.name, description: cat.description, isActive: true },
    });
  }

  // 2. Related Systems (7 Records)
  const relatedSystems = [
    "Email",
    "Campus Wi-Fi",
    "VPN",
    "LEB2 App",
    "Grade Submission App",
    "Printer",
    "Corporate Laptop",
  ];

  for (const name of relatedSystems) {
    await prismaClient.relatedSystem.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  // 3. Authenticated Users (Requesters, IT Staff, Administrators)
  const defaultPasswordHash = bcrypt.hashSync("Password123!", 10);
  const initialPasswordHash = bcrypt.hashSync("InitialPass123!", 10);

  const users = [
    // Requesters (Active & Inactive, reconciling Lab 2 and Lab 3)
    {
      name: "Sompong IT",
      email: "sompong.it@kmutt.ac.th",
      department: "Information Technology Office",
      role: "REQUESTER" as const,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultPasswordHash,
    },
    {
      name: "Anong Staff",
      email: "anong.sta@kmutt.ac.th",
      department: "Academic Affairs Office",
      role: "REQUESTER" as const,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultPasswordHash,
    },
    {
      name: "Anong Staff",
      email: "anong.st@kmutt.ac.th",
      department: "Academic Affairs Office",
      role: "REQUESTER" as const,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultPasswordHash,
    },
    {
      name: "Kittisak Student",
      email: "kittisak.stu@kmutt.ac.th",
      department: "Computer Engineering Dept",
      role: "REQUESTER" as const,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultPasswordHash,
    },
    {
      name: "Mana Student",
      email: "mana.st@kmutt.ac.th",
      department: "Computer Engineering Dept",
      role: "REQUESTER" as const,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultPasswordHash,
    },
    {
      name: "Wichai Faculty",
      email: "wichai.fac@kmutt.ac.th",
      department: "Department of Mathematics",
      role: "REQUESTER" as const,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultPasswordHash,
    },
    {
      name: "Kanda Faculty",
      email: "kanda.fc@kmutt.ac.th",
      department: "Department of Mathematics",
      role: "REQUESTER" as const,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultPasswordHash,
    },
    {
      name: "Prasert Inactive",
      email: "prasert.ina@kmutt.ac.th",
      department: "Human Resources Office",
      role: "REQUESTER" as const,
      isActive: false,
      mustChangePassword: false,
      passwordHash: defaultPasswordHash,
    },
    {
      name: "Prasert Inactive",
      email: "prasert.in@kmutt.ac.th",
      department: "Human Resources Office",
      role: "REQUESTER" as const,
      isActive: false,
      mustChangePassword: false,
      passwordHash: defaultPasswordHash,
    },
    {
      name: "New Requester",
      email: "new.requester@kmutt.ac.th",
      department: "Science Faculty",
      role: "REQUESTER" as const,
      isActive: true,
      mustChangePassword: true,
      passwordHash: initialPasswordHash,
    },

    // IT Staff (Active & Inactive)
    {
      name: "Wichai IT",
      email: "wichai.it@kmutt.ac.th",
      department: "IT Infrastructure Services",
      role: "IT_STAFF" as const,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultPasswordHash,
    },
    {
      name: "Nareerat IT",
      email: "nareerat.it@kmutt.ac.th",
      department: "Campus Network Operations",
      role: "IT_STAFF" as const,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultPasswordHash,
    },
    {
      name: "Ekachai IT",
      email: "ekachai.it@kmutt.ac.th",
      department: "User Support Services",
      role: "IT_STAFF" as const,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultPasswordHash,
    },
    {
      name: "Inactive Staff",
      email: "inactive.staff@kmutt.ac.th",
      department: "Former IT Resolver",
      role: "IT_STAFF" as const,
      isActive: false,
      mustChangePassword: false,
      passwordHash: defaultPasswordHash,
    },

    // Administrators
    {
      name: "Admin TokTick",
      email: "admin.toktick@kmutt.ac.th",
      department: "IT Central Administration",
      role: "ADMINISTRATOR" as const,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultPasswordHash,
    },
    {
      name: "Backup Admin",
      email: "backup.admin@kmutt.ac.th",
      department: "Disaster Recovery Services",
      role: "ADMINISTRATOR" as const,
      isActive: true,
      mustChangePassword: false,
      passwordHash: defaultPasswordHash,
    },
  ];

  for (const user of users) {
    const normalizedEmail = user.email.trim().toLowerCase();
    await prismaClient.user.upsert({
      where: { email: normalizedEmail },
      update: {
        name: user.name,
        department: user.department,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        passwordHash: user.passwordHash,
      },
      create: {
        name: user.name,
        email: normalizedEmail,
        department: user.department,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        passwordHash: user.passwordHash,
      },
    });
  }

  // 4. Seed Tickets for Issue 13 IT Staff Queue Verification
  const dbUsers = await prismaClient.user.findMany();
  const userMap = new Map(dbUsers.map((u) => [u.email.toLowerCase(), u.id]));

  const dbCategories = await prismaClient.category.findMany();
  const categoryMap = new Map(dbCategories.map((c) => [c.name, c.id]));

  const dbRelatedSystems = await prismaClient.relatedSystem.findMany();
  const systemMap = new Map(dbRelatedSystems.map((s) => [s.name, s.id]));

  const tickets = [
    {
      ticketNumber: "TKT-2026-00001",
      summary: "Wi-Fi disconnects frequently in CB2 3rd floor",
      description: "Wi-Fi signals disconnect repeatedly when connecting in CB2 3rd floor classroom.",
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requestedPriority: "HIGH" as const,
      itPriority: "URGENT" as const,
      currentStatus: "OPEN" as const,
      requesterEmail: "sompong.it@kmutt.ac.th",
      ownerEmail: "wichai.it@kmutt.ac.th",
      createdAt: new Date("2026-09-03T10:14:00Z"),
    },
    {
      ticketNumber: "TKT-2026-00002",
      summary: "Projector in CB2301 lamp flickering",
      description: "Classroom projector bulb blinks intermittently during morning sessions.",
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "NEW" as const,
      requesterEmail: "anong.sta@kmutt.ac.th",
      ownerEmail: null,
      createdAt: new Date("2026-09-03T10:30:00Z"),
    },
    {
      ticketNumber: "TKT-2026-00003",
      summary: "Cannot access LEB2 portal from dormitory",
      description: "Student getting SSL timeout when attempting to submit homework on LEB2.",
      categoryName: "Software",
      systemName: "LEB2 App",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "IN_PROGRESS" as const,
      requesterEmail: "kittisak.stu@kmutt.ac.th",
      ownerEmail: "nareerat.it@kmutt.ac.th",
      createdAt: new Date("2026-09-03T11:00:00Z"),
    },
    {
      ticketNumber: "TKT-2026-00004",
      summary: "VPN connection timeout on macOS Sonoma",
      description: "Faculty member cannot connect to internal research servers via Cisco VPN.",
      categoryName: "Network",
      systemName: "VPN",
      requestedPriority: "MEDIUM" as const,
      itPriority: "LOW" as const,
      currentStatus: "WAITING_FOR_REQUESTER" as const,
      requesterEmail: "wichai.fac@kmutt.ac.th",
      ownerEmail: "wichai.it@kmutt.ac.th",
      createdAt: new Date("2026-09-03T11:45:00Z"),
    },
    {
      ticketNumber: "TKT-2026-00005",
      summary: "Request second monitor for faculty office",
      description: "Requesting additional 24-inch HDMI monitor for teaching workload.",
      categoryName: "Hardware",
      systemName: "Corporate Laptop",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      currentStatus: "RESOLVED" as const,
      requesterEmail: "wichai.fac@kmutt.ac.th",
      ownerEmail: "ekachai.it@kmutt.ac.th",
      createdAt: new Date("2026-09-03T12:00:00Z"),
    },
    {
      ticketNumber: "TKT-2026-00006",
      summary: "Email quota exceeded warning received",
      description: "Mailbox approaching 99% storage limit. Requesting archive guidance.",
      categoryName: "Account and Access",
      systemName: "Email",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "CLOSED" as const,
      requesterEmail: "anong.sta@kmutt.ac.th",
      ownerEmail: "nareerat.it@kmutt.ac.th",
      createdAt: new Date("2026-09-03T12:30:00Z"),
    },
    {
      ticketNumber: "TKT-2026-00007",
      summary: "SPSS license renewal activation error",
      description: "License server reports error code 0x8004 for statistics lab machines.",
      categoryName: "Software",
      systemName: "Corporate Laptop",
      requestedPriority: "HIGH" as const,
      itPriority: "HIGH" as const,
      currentStatus: "REOPENED" as const,
      requesterEmail: "sompong.it@kmutt.ac.th",
      ownerEmail: "wichai.it@kmutt.ac.th",
      createdAt: new Date("2026-09-03T13:00:00Z"),
    },
    {
      ticketNumber: "TKT-2026-00008",
      summary: "Accidental duplicate ticket submission",
      description: "Submitted duplicate request by mistake. Please cancel.",
      categoryName: "Account and Access",
      systemName: "Email",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      currentStatus: "CANCELLED" as const,
      requesterEmail: "kittisak.stu@kmutt.ac.th",
      ownerEmail: "admin.toktick@kmutt.ac.th",
      createdAt: new Date("2026-09-03T13:30:00Z"),
    },
    {
      ticketNumber: "TKT-2026-00009",
      summary: "Library 4th floor Ethernet port dead",
      description: "Wall jack 4A-12 has no link light when plugged into laptop.",
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "NEW" as const,
      requesterEmail: "sompong.it@kmutt.ac.th",
      ownerEmail: null,
      createdAt: new Date("2026-09-03T14:00:00Z"),
    },
    {
      ticketNumber: "TKT-2026-00010",
      summary: "Student information system timeout during enrollment",
      description: "Database connection timeout during priority enrollment period.",
      categoryName: "Software",
      systemName: "Grade Submission App",
      requestedPriority: "URGENT" as const,
      itPriority: "URGENT" as const,
      currentStatus: "IN_PROGRESS" as const,
      requesterEmail: "kittisak.stu@kmutt.ac.th",
      ownerEmail: "wichai.it@kmutt.ac.th",
      createdAt: new Date("2026-09-03T14:30:00Z"),
    },
    {
      ticketNumber: "TKT-2026-00011",
      summary: "Printer paper jam error 50.4 in Eng Building",
      description: "Heavy paper jam in tray 2 causing error 50.4.",
      categoryName: "Hardware",
      systemName: "Printer",
      requestedPriority: "LOW" as const,
      itPriority: "LOW" as const,
      currentStatus: "NEW" as const,
      requesterEmail: "anong.sta@kmutt.ac.th",
      ownerEmail: null,
      createdAt: new Date("2026-09-03T15:00:00Z"),
    },
    {
      ticketNumber: "TKT-2026-00012",
      summary: "Microsoft Teams audio glitch on campus network",
      description: "Audio drops out every 2 minutes when using desktop Teams client on campus.",
      categoryName: "Network",
      systemName: "Campus Wi-Fi",
      requestedPriority: "MEDIUM" as const,
      itPriority: "MEDIUM" as const,
      currentStatus: "OPEN" as const,
      requesterEmail: "sompong.it@kmutt.ac.th",
      ownerEmail: "ekachai.it@kmutt.ac.th",
      createdAt: new Date("2026-09-03T15:30:00Z"),
    },
  ];

  for (const t of tickets) {
    const requesterId = userMap.get(t.requesterEmail.toLowerCase()) || 1;
    const ownerId = t.ownerEmail ? userMap.get(t.ownerEmail.toLowerCase()) || null : null;
    const categoryId = categoryMap.get(t.categoryName) || 1;
    const relatedSystemId = systemMap.get(t.systemName) || 1;

    await prismaClient.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        requesterId,
        ownerId,
        categoryId,
        relatedSystemId,
        createdAt: t.createdAt,
      },
      create: {
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        requesterId,
        ownerId,
        categoryId,
        relatedSystemId,
        createdAt: t.createdAt,
      },
    });
  }
}

// CLI execution wrapper
async function main() {
  await seed();
}

if (process.argv[1]?.includes("seed")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await getPrisma().$disconnect();
    });
}
