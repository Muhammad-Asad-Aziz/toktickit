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

  // 3. Development Requesters (4 Active + 1 Inactive)
  const requesters = [
    { name: "Sompong IT", email: "sompong.it@kmutt.ac.th", department: "Information Technology Office", isActive: true },
    { name: "Anong Staff", email: "anong.sta@kmutt.ac.th", department: "Academic Affairs Office", isActive: true },
    { name: "Kittisak Student", email: "kittisak.stu@kmutt.ac.th", department: "Computer Engineering Dept", isActive: true },
    { name: "Wichai Faculty", email: "wichai.fac@kmutt.ac.th", department: "Department of Mathematics", isActive: true },
    { name: "Prasert Inactive", email: "prasert.ina@kmutt.ac.th", department: "Human Resources Office", isActive: false },
  ];

  for (const user of requesters) {
    const normalizedEmail = user.email.trim().toLowerCase();
    await prismaClient.requesterUser.upsert({
      where: { email: normalizedEmail },
      update: { name: user.name, department: user.department, isActive: user.isActive },
      create: { name: user.name, email: normalizedEmail, department: user.department, isActive: user.isActive },
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
