-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "loan_schemes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "annualInterestRate" DECIMAL(5,2) NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "maxLtv" DECIMAL(5,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_applications" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "maskedMobileNumber" TEXT NOT NULL,
    "email" TEXT,
    "grossWeightGrams" DECIMAL(8,2) NOT NULL,
    "netWeightGrams" DECIMAL(8,2) NOT NULL,
    "goldKarat" INTEGER NOT NULL,
    "rate24kPerGram" DECIMAL(10,2) NOT NULL,
    "pureGoldGrams" DECIMAL(8,3) NOT NULL,
    "goldValue" DECIMAL(12,2) NOT NULL,
    "eligibleLoan" DECIMAL(12,2) NOT NULL,
    "appliedLoanAmount" DECIMAL(12,2),
    "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "schemeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loan_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loan_schemes_code_key" ON "loan_schemes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "loan_applications_applicationNumber_key" ON "loan_applications"("applicationNumber");

-- CreateIndex
CREATE INDEX "loan_applications_mobileNumber_createdAt_idx" ON "loan_applications"("mobileNumber", "createdAt");

-- AddForeignKey
ALTER TABLE "loan_applications" ADD CONSTRAINT "loan_applications_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "loan_schemes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
