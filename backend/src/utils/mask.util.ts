/**
 * Masks a 10-digit Indian mobile number to the format 9876XXXX10
 * (first 4 digits, 4 Xs, last 2 digits).
 */
export function maskMobileNumber(mobile: string): string {
  const digits = mobile.replace(/\D/g, "");
  if (digits.length !== 10) {
    return mobile;
  }
  const firstFour = digits.slice(0, 4);
  const lastTwo = digits.slice(8);
  return `${firstFour}XXXX${lastTwo}`;
}
