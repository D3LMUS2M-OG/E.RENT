export type AgreementInput = {
  landlordName: string; tenantName: string; premises: string; rent: number; deposit: number; dueDay: number; startDate: string;
  termMonths: number;            // 0 = month to month
  noticeDays: number; utilities: { water: boolean; electricity: boolean; garbage: boolean; security: boolean }; pets: boolean; extra: string;
};

const kes = (n: number) => `KES ${n.toLocaleString("en-KE")}`;
const ord = (n: number) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
const date = (d: string) => (d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" }) : "__________");
const blank = (s: string, w = "__________________") => s.trim() || w;

/** A plain residential tenancy agreement built from the details entered. It is a starting template, not legal advice. */
export function buildAgreement(a: AgreementInput) {
  const pays = Object.entries({ water: "water", electricity: "electricity", garbage: "garbage collection", security: "security" }).filter(([k]) => a.utilities[k as keyof typeof a.utilities]).map(([, v]) => v);
  const term = a.termMonths > 0 ? `The tenancy begins on ${date(a.startDate)} and runs for ${a.termMonths} ${a.termMonths === 1 ? "month" : "months"}. It may be renewed in writing by agreement of both parties.` : `The tenancy begins on ${date(a.startDate)} and continues from month to month until ended by notice under clause 10.`;
  const clauses: { heading: string; text: string }[] = [
    { heading: "The premises", text: `The Landlord lets and the Tenant takes the residential premises described as: ${blank(a.premises, "(describe the house and its location)")} (the "Premises").` },
    { heading: "Term", text: term },
    { heading: "Rent", text: `The Tenant shall pay rent of ${kes(a.rent)} per month, in advance, on or before the ${ord(a.dueDay)} day of each month, by a method agreed in writing. The Landlord shall give a receipt for every payment.` },
    { heading: "Deposit", text: `The Tenant has paid, or shall pay before taking possession, a refundable deposit of ${kes(a.deposit)}. The Landlord holds it as security for unpaid rent and for damage beyond fair wear and tear. It is not rent and may not be used by the Tenant as the last month's rent unless the Landlord agrees in writing. After the Tenant leaves and returns the keys, the Landlord shall return the deposit, with a written list of any deductions, within 30 days.` },
    { heading: "Condition and inventory", text: "The parties have inspected the Premises together and recorded its condition, the fittings, and the meter readings in writing or by dated photographs. The Tenant shall return the Premises in the same condition, fair wear and tear excepted." },
    { heading: "Utilities and charges", text: pays.length ? `The Tenant shall pay for: ${pays.join(", ")}, and any other charges listed in the additional terms. The Landlord shall pay all other charges on the Premises, including land rates.` : "The Landlord shall pay all charges on the Premises, including land rates, unless the additional terms say otherwise. The Tenant shall pay for any utility used exclusively by the Tenant that is metered separately." },
    { heading: "Use of the Premises", text: `The Tenant shall use the Premises as a private residence only, shall not cause nuisance to neighbours, and shall not use it for any unlawful purpose. ${a.pets ? "Pets are allowed, and the Tenant is responsible for any damage or nuisance they cause." : "Pets are not allowed without the Landlord's written consent."}` },
    { heading: "Repairs and maintenance", text: "The Tenant shall keep the Premises clean and tell the Landlord promptly about any defect. The Landlord shall keep the structure, roof, plumbing and wiring in good repair. The Tenant shall pay for damage caused by the Tenant, the Tenant's household or visitors." },
    { heading: "Access and subletting", text: "The Landlord may enter the Premises at reasonable times after at least 24 hours' notice, or at once in an emergency. The Tenant shall not sublet or share the Premises, or assign this agreement, without the Landlord's written consent." },
    { heading: "Changes to the rent", text: "The Landlord shall not increase the rent during a fixed term unless this agreement says so. Any increase after that shall be in writing, with at least the notice in clause 10." },
    { heading: "Ending the tenancy", text: `Either party may end the tenancy by giving the other at least ${a.noticeDays} days' written notice${a.termMonths > 0 ? " that takes effect at or after the end of the fixed term" : ""}. The Landlord may not lock out the Tenant or remove the Tenant's belongings except through a lawful process. If rent is unpaid, the Landlord shall give written notice before taking any action.` },
    { heading: "Disputes and law", text: "The parties shall first try to settle any dispute by talking to each other. This agreement is governed by the laws of Kenya, and the parties may take a dispute to the proper tribunal or court." },
  ];
  if (a.extra.trim()) clauses.push({ heading: "Additional terms", text: a.extra.trim() });
  return {
    title: "Residential Tenancy Agreement",
    intro: `This agreement is made on __________________ between ${blank(a.landlordName)} (the "Landlord") and ${blank(a.tenantName)} (the "Tenant").`,
    clauses,
    note: "This agreement was drafted with an E.Rent template. E.Rent is not a party to it and does not hold rent or deposits. It is a starting point, not legal advice: have an advocate check it, and ask whether it needs to be stamped, before you sign.",
  };
}
