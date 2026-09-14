import bcrypt from "bcryptjs";
import { getPrisma } from "../src/prisma.js";

export async function seed(prismaClient = getPrisma()) {
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
