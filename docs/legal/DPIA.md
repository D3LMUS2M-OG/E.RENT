# Data Protection Impact Assessment (DPIA): E.Rent

Version 1.0 · 19 November 2026 · Owner: operator of E.Rent · Review: every 12 months and before any major change

Covers the two highest-risk processing activities: **landlord identity documents** and **private chat**. Under the Data Protection Act, 2019 an assessment is required where processing is likely to put people’s rights and freedoms at high risk.

## 1. Processing described

| | Identity documents | Private chat |
|---|---|---|
| Purpose | Verify that a landlord is who they say and may let the house, to protect tenants from fraud | Let tenants and landlords ask questions privately before a viewing |
| Data | National ID, proof of ownership (title deed, lease or utility bill), optional KRA PIN and selfie with ID | Text, photos, voice notes, documents, timestamps, read status |
| People | Landlords, caretakers, agents | Tenants, landlords, caretakers |
| Lawful basis | Consent; legitimate interest in preventing fraud | Contract (providing the service); legitimate interest in safety |
| Recipients | Verifiers (staff) only | The two participants; staff only through a report |
| Storage | Private bucket, signed short-lived links | Postgres rows; attachments in a private bucket |
| Retention | While needed to verify and protect users; deleted with the account or on request | 30 days, or earlier if either person deletes |
| Location of processing | Supabase and Vercel (regions outside Kenya possible) | Same |

## 2. Necessity and proportionality
- Documents are requested only from people who list houses, not from tenants. KRA PIN and the selfie are supporting evidence, not mandatory.
- Chat is deleted after 30 days to limit exposure; only reported messages are copied as evidence.
- Phone numbers are hidden by default and shared only with approval.

## 3. Risks and measures

| Risk | Likelihood | Severity | Measures | Residual |
|---|---|---|---|---|
| Identity documents exposed publicly | Low | High | Private bucket; no public URLs; row-level security tested in CI; signed links expire; open events audit-logged | Low |
| Staff misuse of documents or chats | Low | High | Permission-based roles; chats opened only via a report and logged; two-step sign-in for staff; audit log reviewed monthly | Low |
| Breach at a provider | Low | High | Encryption in transit and at rest; provider due diligence; incident plan (docs/legal/INCIDENT-RESPONSE.md) with 72-hour notification | Medium |
| Harassment or scams through chat | Medium | Medium | Block and report; scam-tips banner; moderation; sanctions | Medium |
| Over-retention | Medium | Medium | Automatic 30-day chat purge; account deletion removes files and rows; retention schedule | Low |
| Cross-border transfer without safeguards | Low | Medium | Provider contracts; disclosure in Privacy Policy; ODPC guidance followed | Low |
| Defamatory tenant ratings | Medium | Medium | Ratings visible only to landlords; short factual note limit; correction route; Review Policy | Low |

## 4. Consultation
Advocate review completed before launch. Ask the ODPC for guidance if a high residual risk remains after measures.

## 5. Sign-off
| Role | Name | Date |
|---|---|---|
| Operator | | |
| Advocate | | |
