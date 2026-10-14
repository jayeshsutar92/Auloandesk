import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL ?? "");
const prisma = new PrismaClient({ adapter });

export const LOAN_SCHEMES_SEED = [
  {
    code: "PLAN_BULLET_01",
    name: "Bullet Repayment",
    description: "Pay principal and interest at the end of the 12-month tenure. 12% p.a., 70% max LTV.",
    annualInterestRate: 12.0,
    tenureMonths: 12,
    maxLtv: 0.70,
    isActive: true
  },
  {
    code: "PLAN_EMI_01",
    name: "Monthly EMI",
    description: "Regular monthly principal and interest installments over 12 months. 10.5% p.a., 75% max LTV.",
    annualInterestRate: 10.5,
    tenureMonths: 12,
    maxLtv: 0.75,
    isActive: true
  }
];

export async function seedLoanSchemes(client: PrismaClient = prisma): Promise<void> {
  console.log("[AuLoanDesk Seed] Seeding loan schemes...");

  for (const scheme of LOAN_SCHEMES_SEED) {
    const upserted = await client.loanScheme.upsert({
      where: { code: scheme.code },
      update: {
        name: scheme.name,
        description: scheme.description,
        annualInterestRate: scheme.annualInterestRate,
        tenureMonths: scheme.tenureMonths,
        maxLtv: scheme.maxLtv,
        isActive: scheme.isActive
      },
      create: {
        code: scheme.code,
        name: scheme.name,
        description: scheme.description,
        annualInterestRate: scheme.annualInterestRate,
        tenureMonths: scheme.tenureMonths,
        maxLtv: scheme.maxLtv,
        isActive: scheme.isActive
      }
    });

    console.log(`[AuLoanDesk Seed] Seeded scheme: ${upserted.code} (${upserted.name})`);
  }

  console.log("[AuLoanDesk Seed] Loan schemes seeded successfully.");
}

async function main(): Promise<void> {
  try {
    await seedLoanSchemes(prisma);
  } catch (error) {
    console.error("[AuLoanDesk Seed] Error executing database seed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes("seed")) {
  void main();
}
