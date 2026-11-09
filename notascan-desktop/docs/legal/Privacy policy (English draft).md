# Personal data processing policy · NotaScan

**Version 2026.1 · in force since October 6, 2026 · English translation of the Spanish version**

> **The Spanish version is the one that governs.** This English text is a technical draft translated by the development
> team so that people who read English can understand it. **A lawyer must review it before it is used.** If this text
> and the Spanish one differ, the Spanish one applies.

> **Technical draft.** The development team wrote the policy based on Colombian Law 1581 of 2012, Decree 1377 of 2013
> (compiled in Decree 1074 of 2015) and on how the app really works. **A lawyer must review it before it is used with
> real data.** Each school fills in the fields in brackets.

## 1. Who processes the data

- **Data controller:** each school that uses NotaScan. **[School name]**, [tax ID], [address], [city], personal data
  email **[email]**, phone [phone]. The school decides what its community's data is used for.
- **Data processor:** NotaScan (Diego Armando Pinta Cuasquen, [ID number], [contact email]). It provides the platform
  and processes the data only on behalf of the school and following its instructions.
- **Sub-processors** that NotaScan uses to provide the service (see section 6).

## 2. What data is processed

| Data subject | Data | Purpose |
|---|---|---|
| Students (mostly **minors**) | First and last names, ID type and number, student code, course, enrollment status, enrollment date, clearance (library, fees, documents) | Enrollment and academic management |
| | Grades, attendance, behavior notes, teacher comments, report cards | Academic record and follow-up |
| | **Exam photos** (sheet with name, code and handwritten grade) | Reading the grade so the teacher can verify it |
| | **Health data** (allergies, conditions, medical notes, emergency contact). **Sensitive data** | Handling emergencies at school |
| Guardians | Name, relationship, phone | Contact about the student |
| School staff (teachers, academic office, principal's office) | Name, school email, role, area, last access, record of the actions they sign (who verified a grade, who decided a request) | Access to the app and traceability of the academic record |

NotaScan does **not** use this data for advertising, does not sell it and does not build commercial profiles.

## 3. Purposes

1. Enroll the student and manage their school life (grades, attendance, student record, report cards, reports).
2. Read the grade in exam photos automatically **so the teacher can verify it**. The grade that counts is always the
   one the teacher confirms.
3. Let the principal's office and the academic office supervise academic work and keep school statistics.
4. Contact the guardian about the student.
5. Handle the student's health emergencies (only with express authorization for sensitive data).
6. Keep the platform secure and traceable (who made each change).

## 4. Authorization

- Data of students who are **minors** is processed with the **prior, express and informed authorization of their legal
  representative (guardian)**, respecting the best interests of the child and their fundamental rights (Law 1581,
  art. 7. Decree 1377, art. 12). When the student is mature enough, their opinion is heard.
- **Health data is sensitive.** Giving it is **optional** (no one is required to give it) and it needs explicit,
  separate authorization (Law 1581, arts. 5 and 6).
- The school keeps proof of each authorization. In NotaScan, the academic office records the signed authorization with
  its version, date and how it was delivered.
- Staff accept this policy the first time they sign in. The acceptance is recorded with its version and date.

## 5. Where and for how long it is kept

| Data | Where | For how long |
|---|---|---|
| Academic and enrollment data | Supabase database (São Paulo region, Brazil) | As long as education rules require for the academic record [**to be confirmed by the lawyer**]. After that it is deleted or anonymized |
| Exam photos | Private Supabase storage (one folder per teacher) | **Until the school closes the academic term.** Closing it deletes them automatically. The grade is kept |
| Health data | Database, accessible only to the academic office and the principal's office | While the student is enrolled or until the authorization is revoked |
| Record of authorizations and acceptances | Database | While the relationship with the school lasts and for the legal term needed to prove the authorization |
| Offline gradebook queue | On the teacher's computer (local app storage) | Until the grade is sent to the database |
| Theme preference (light, dark or system) | Only on this computer (local app storage). It does not identify the person and is not sent to NotaScan or to third parties | Until it is changed or the app's data is cleared |

## 6. Who it is shared with

The data is **not sold or transferred** to third parties. To provide the service, NotaScan uses these sub-processors.
There must be a contract with each one that stops them from using the data for their own purposes.

| Sub-processor | Purpose | Country |
|---|---|---|
| Supabase Inc. | Database, photo storage, sign-in accounts | Servers in Brazil (São Paulo). Company in the USA |
| Anthropic PBC | Reading the grade, code and name in the exam photo (Claude Haiku 4.5 model) | USA |
| [Email provider, for example Brevo] | Sending invitations and access codes to staff | [Country] |

These are **international transmissions to processors** (Decree 1377, arts. 24 and 25). The photo is sent to Anthropic
**only for that reading**. [**Check with the lawyer and Anthropic's current contract** whether it keeps the images and for
how long, and that it does not use them to train models.]

## 7. Security

- Access with a personal account and password. Each role sees only what it needs (teachers see their courses, and only
  the academic office and the principal's office see health and guardian data). This is enforced in the database, not
  only on screen.
- Each school sees only its own data.
- Photos are in private storage. Each teacher uploads and sees only their own.
- Important actions are signed by the database with the person who did them (verifying grades, deciding requests,
  recording authorizations).
- Keys for external services are only on the server, never in the app.

## 8. Rights of the data subject

The data subject (or the guardian, for a minor) can:

1. **Know, update and correct** their data.
2. **Ask for proof of the authorization** they gave.
3. **Be told** how their data has been used.
4. **File complaints** with the Superintendence of Industry and Commerce (SIC), after going through the school first.
5. **Revoke the authorization and ask for deletion** of their data, unless there is a legal or contractual duty to keep
   it (for example, the academic record).
6. **Access** their data free of charge.

## 9. How to exercise these rights

- Write to **[school's data email]** or go to the academic office with the data subject's ID (and the guardian's, for a
  minor).
- **Queries** are answered within **10 business days** at most. This can be extended 5 more days, giving the reason
  (Law 1581, art. 14).
- **Claims** (correction, update, deletion, revocation) are answered within **15 business days** at most. This can be
  extended 8 more days, giving the reason (Law 1581, art. 15).
- From NotaScan, the academic office can **export all the data of a student** and **correct it**.

## 10. Changes to this policy

Each important change has a new version and date. Staff must accept the new version when they sign in, and the school
informs guardians. If the purposes change, authorization is requested again.

| Version | Date | Change |
|---|---|---|
| 2026.1 | 2026-10-06 | First version |
