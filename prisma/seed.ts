import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { countWorkdays, toIso } from "../src/lib/dates";
import { hashPassword } from "../src/lib/password";

async function main() {
  await prisma.notification.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.user.updateMany({ data: { managerId: null } });
  await prisma.user.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.jobTitle.deleteMany();
  await prisma.staffRole.deleteMany();
  await prisma.department.deleteMany();
  await prisma.company.deleteMany();

  const kft = await prisma.company.create({ data: { name: "Virgo Kft." } });
  const zrt = await prisma.company.create({ data: { name: "Virgo Zrt." } });

  const development = await prisma.department.create({ data: { name: "Fejlesztés" } });
  const marketing = await prisma.department.create({ data: { name: "Marketing" } });
  const design = await prisma.department.create({ data: { name: "Design" } });
  const people = await prisma.department.create({ data: { name: "People & Culture" } });
  const sales = await prisma.department.create({ data: { name: "Értékesítés" } });

  await prisma.jobTitle.createMany({
    data: [
      { name: "Rendszergazda" },
      { name: "Munkavállaló" },
      { name: "Marketinges" },
      { name: "Fejlesztő" },
      { name: "Terméktervező" },
      { name: "HR kapcsolattartó" },
      { name: "Üzletfejlesztő" },
      { name: "Csapatvezető" },
    ],
  });

  await prisma.staffRole.createMany({
    data: [
      { name: "Munkavállaló", kind: "employee" },
      { name: "Vezető", kind: "manager" },
      { name: "HR", kind: "hr" },
    ],
  });

  const base = await prisma.leaveType.create({
    data: { name: "Alapszabadság", deductsBalance: true },
  });
  await prisma.leaveType.create({
    data: { name: "Életkor szerinti pótszabadság", deductsBalance: true },
  });
  await prisma.leaveType.create({
    data: { name: "Gyermek utáni pótszabadság", deductsBalance: true },
  });
  await prisma.leaveType.create({
    data: { name: "Apasági szabadság", deductsBalance: false },
  });
  await prisma.leaveType.create({
    data: { name: "Rendkívüli szabadság", deductsBalance: false },
  });
  await prisma.leaveType.create({
    data: { name: "Fizetett szabadság", deductsBalance: true },
  });
  await prisma.leaveType.create({
    data: { name: "Betegszabadság", deductsBalance: false },
  });

  await prisma.user.create({
    data: {
      firstName: "Admin",
      lastName: "Virgo",
      email: "admin@virgo.hu",
      passwordHash: await hashPassword("VirgoAdmin2026"),
      role: "admin",
      roleTitle: "Admin",
      jobTitle: "Rendszergazda",
      initials: "VA",
      companyId: kft.id,
      departmentId: people.id,
    },
  });

  const peter = await prisma.user.create({
    data: {
      firstName: "Péter",
      lastName: "Kovács",
      email: "peter.kovacs@virgo.hu",
      role: "manager",
      roleTitle: "Vezető",
      jobTitle: "Munkavállaló",
      initials: "KP",
      companyId: kft.id,
      departmentId: development.id,
    },
  });

  const barbara = await prisma.user.create({
    data: {
      firstName: "Barbara",
      lastName: "Nagy",
      email: "barbara.nagy@virgo.hu",
      role: "employee",
      roleTitle: "Munkavállaló",
      jobTitle: "Marketinges",
      initials: "NB",
      companyId: kft.id,
      departmentId: marketing.id,
      managerId: peter.id,
    },
  });

  const ferenc = await prisma.user.create({
    data: {
      firstName: "Ferenc",
      lastName: "Tóth",
      email: "ferenc.toth@virgo.hu",
      role: "employee",
      roleTitle: "Munkavállaló",
      jobTitle: "Fejlesztő",
      initials: "TF",
      companyId: kft.id,
      departmentId: development.id,
      managerId: peter.id,
    },
  });

  const sara = await prisma.user.create({
    data: {
      firstName: "Sára",
      lastName: "Varga",
      email: "sara.varga@virgo.hu",
      role: "employee",
      roleTitle: "Munkavállaló",
      jobTitle: "Terméktervező",
      initials: "VS",
      companyId: kft.id,
      departmentId: design.id,
      managerId: peter.id,
    },
  });

  const mark = await prisma.user.create({
    data: {
      firstName: "Márk",
      lastName: "Balogh",
      email: "mark.balogh@virgo.hu",
      role: "employee",
      roleTitle: "Munkavállaló",
      jobTitle: "Fejlesztő",
      initials: "BM",
      companyId: kft.id,
      departmentId: development.id,
      managerId: peter.id,
    },
  });

  await prisma.user.create({
    data: {
      firstName: "Dóra",
      lastName: "Fekete",
      email: "dora.fekete@virgo.hu",
      role: "hr",
      roleTitle: "HR",
      jobTitle: "HR kapcsolattartó",
      initials: "DF",
      companyId: kft.id,
      departmentId: people.id,
    },
  });

  await prisma.user.create({
    data: {
      firstName: "Nóra",
      lastName: "Papp",
      email: "nora.papp@virgo.hu",
      role: "hr",
      roleTitle: "HR",
      jobTitle: "HR kapcsolattartó",
      initials: "NP",
      companyId: kft.id,
      departmentId: people.id,
    },
  });

  const anna = await prisma.user.create({
    data: {
      firstName: "Anna",
      lastName: "Kiss",
      email: "anna.kiss@virgo.hu",
      role: "employee",
      roleTitle: "Munkavállaló",
      jobTitle: "Üzletfejlesztő",
      initials: "KA",
      companyId: zrt.id,
      departmentId: sales.id,
    },
  });

  const gabor = await prisma.user.create({
    data: {
      firstName: "Gábor",
      lastName: "Molnár",
      email: "gabor.molnar@virgo.hu",
      role: "manager",
      roleTitle: "Vezető",
      jobTitle: "Csapatvezető",
      initials: "MG",
      companyId: zrt.id,
      departmentId: sales.id,
    },
  });

  await prisma.user.update({
    where: { id: anna.id },
    data: { managerId: gabor.id },
  });

  const everyone = await prisma.user.findMany();
  await prisma.leaveBalance.createMany({
    data: everyone.map((user) => ({
      userId: user.id,
      year: 2026,
      totalDays: 25,
      q1Quota: 6,
      q2Quota: 7,
      q3Quota: 6,
      q4Quota: 6,
    })),
  });

  async function request(input: {
    userId: number;
    companyId: number;
    start: string;
    end: string;
    status: "pending" | "approved" | "rejected";
    note?: string;
    reviewerId?: number;
  }) {
    await prisma.leaveRequest.create({
      data: {
        userId: input.userId,
        companyId: input.companyId,
        leaveTypeId: base.id,
        startDate: new Date(`${input.start}T00:00:00.000Z`),
        endDate: new Date(`${input.end}T00:00:00.000Z`),
        workDays: countWorkdays(input.start, input.end),
        note: input.note,
        status: input.status,
        reviewerId: input.status === "pending" ? null : (input.reviewerId ?? peter.id),
        reviewedAt:
          input.status === "pending" ? null : new Date("2026-10-20T09:00:00.000Z"),
      },
    });
  }

  await request({
    userId: peter.id,
    companyId: kft.id,
    start: "2026-02-02",
    end: "2026-02-05",
    status: "approved",
  });
  await request({
    userId: peter.id,
    companyId: kft.id,
    start: "2026-06-08",
    end: "2026-06-08",
    status: "rejected",
    note: "A kiadás ebben a hétben nem megoldható.",
  });
  await request({
    userId: peter.id,
    companyId: kft.id,
    start: "2026-08-03",
    end: "2026-08-07",
    status: "approved",
  });
  await request({
    userId: peter.id,
    companyId: kft.id,
    start: "2026-10-19",
    end: "2026-10-19",
    status: "approved",
  });
  await request({
    userId: peter.id,
    companyId: kft.id,
    start: "2026-11-12",
    end: "2026-11-13",
    status: "pending",
    note: "Családi program.",
  });
  await request({
    userId: peter.id,
    companyId: kft.id,
    start: "2026-11-23",
    end: "2026-11-24",
    status: "pending",
  });

  await request({
    userId: barbara.id,
    companyId: kft.id,
    start: "2026-10-29",
    end: "2026-10-29",
    status: "approved",
    reviewerId: peter.id,
  });
  await request({
    userId: barbara.id,
    companyId: kft.id,
    start: "2026-12-14",
    end: "2026-12-15",
    status: "pending",
  });
  await request({
    userId: ferenc.id,
    companyId: kft.id,
    start: "2026-11-02",
    end: "2026-11-03",
    status: "approved",
    reviewerId: peter.id,
  });
  await request({
    userId: ferenc.id,
    companyId: kft.id,
    start: "2026-12-01",
    end: "2026-12-01",
    status: "pending",
  });
  await request({
    userId: sara.id,
    companyId: kft.id,
    start: "2026-11-09",
    end: "2026-11-09",
    status: "approved",
    reviewerId: peter.id,
  });
  await request({
    userId: sara.id,
    companyId: kft.id,
    start: "2026-11-27",
    end: "2026-11-27",
    status: "pending",
  });
  await request({
    userId: mark.id,
    companyId: kft.id,
    start: "2026-11-16",
    end: "2026-11-20",
    status: "approved",
    reviewerId: peter.id,
  });

  await request({
    userId: anna.id,
    companyId: zrt.id,
    start: "2026-11-04",
    end: "2026-11-06",
    status: "approved",
    reviewerId: gabor.id,
  });
  await request({
    userId: gabor.id,
    companyId: zrt.id,
    start: "2026-11-18",
    end: "2026-11-18",
    status: "approved",
  });

  const pending = await prisma.leaveRequest.findMany({
    where: { status: "pending" },
    include: { user: true },
  });
  for (const row of pending) {
    if (!row.user.managerId) continue;
    const start = toIso(row.startDate);
    const end = toIso(row.endDate);
    await prisma.notification.create({
      data: {
        userId: row.user.managerId,
        requestId: row.id,
        title: `${row.user.lastName} ${row.user.firstName}`,
        detail: `${start}${end === start ? "" : ` – ${end}`} · ${row.workDays} nap jóváhagyásra vár`,
        href: "/jovahagyasok",
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
