import React from "react";
import { StepIndicator, type StepNumber } from "./StepIndicator.js";
import { Step1Details, type Step1FormData } from "./Step1Details.js";
import { Step2Quotes } from "./Step2Quotes.js";
import { Step3Confirmation } from "./Step3Confirmation.js";
import type { SchemeQuote } from "../../types/loan.types.js";

interface LoanApplicationFlowProps {
  onViewDashboard: () => void;
}

const initialFormData: Step1FormData = {
  fullName: "",
  mobileNumber: "",
  email: "",
  grossWeightGrams: "",
  netWeightGrams: "",
  karat: 22
};

export const LoanApplicationFlow: React.FC<LoanApplicationFlowProps> = ({
  onViewDashboard
}) => {
  const [currentStep, setCurrentStep] = React.useState<StepNumber>(1);
  const [formData, setFormData] = React.useState<Step1FormData>(initialFormData);
  const [selectedScheme, setSelectedScheme] = React.useState<SchemeQuote | null>(null);
  const [appliedLoanAmount, setAppliedLoanAmount] = React.useState<number | undefined>(undefined);

  const handleFormDataChange = (updates: Partial<Step1FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleSelectScheme = (scheme: SchemeQuote, customAmount?: number) => {
    setSelectedScheme(scheme);
    setAppliedLoanAmount(customAmount);
  };

  const handleReset = () => {
    setFormData(initialFormData);
    setSelectedScheme(null);
    setAppliedLoanAmount(undefined);
    setCurrentStep(1);
  };

  const grossNum = parseFloat(formData.grossWeightGrams) || 0;
  const netNum = parseFloat(formData.netWeightGrams) || 0;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Intro Header */}
      <div className="text-center mb-8">
        <span className="text-xs font-bold uppercase tracking-widest text-amber-400/90 block mb-2">
          Fast & Transparent Digital Gold Financing
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Apply for an Instant Gold Loan
        </h1>
        <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
          Sanction your loan in 3 transparent steps against genuine gold collateral with industry-leading low interest rates.
        </p>
      </div>

      {/* Step Progress Bar */}
      <StepIndicator
        currentStep={currentStep}
        onStepClick={(step) => {
          // Allow going back to previous steps, but only advance if step 1 is valid
          if (step < currentStep) {
            setCurrentStep(step);
          }
        }}
      />

      {/* Step Components */}
      <div className="mt-8">
        {currentStep === 1 && (
          <Step1Details
            formData={formData}
            onChange={handleFormDataChange}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <Step2Quotes
            grossWeightGrams={grossNum}
            netWeightGrams={netNum}
            karat={formData.karat}
            selectedSchemeId={selectedScheme?.schemeId || ""}
            appliedLoanAmount={appliedLoanAmount}
            onSelectScheme={handleSelectScheme}
            onBack={() => setCurrentStep(1)}
            onNext={() => {
              if (selectedScheme) {
                setCurrentStep(3);
              }
            }}
          />
        )}

        {currentStep === 3 && selectedScheme && (
          <Step3Confirmation
            applicant={{
              fullName: formData.fullName,
              mobileNumber: formData.mobileNumber,
              email: formData.email
            }}
            gold={{
              grossWeightGrams: grossNum,
              netWeightGrams: netNum,
              karat: formData.karat
            }}
            selectedScheme={selectedScheme}
            appliedLoanAmount={appliedLoanAmount}
            onBack={() => setCurrentStep(2)}
            onReset={handleReset}
            onViewDashboard={onViewDashboard}
          />
        )}
      </div>
    </div>
  );
};
