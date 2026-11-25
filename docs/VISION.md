> Long-term product vision. Not everything here is built or planned for now. See [docs/STATUS.md](STATUS.md) for the real state.

# SKILLPROVE — Complete Product Vision & Development Specification

## 1. Project Overview

**Product name:** SkillProve  
**Product type:** AI-powered skills assessment and talent verification platform  
**Platforms:** Web application + Native mobile application  
**Initial target market:** Kosovo, with architecture designed for international expansion  
**Languages:** Albanian (default) and English  
**Currency:** EUR (€)

### The idea

SkillProve is a platform that connects companies with people based on their actual skills, not just their CVs, degrees, or claimed experience.

The main problem SkillProve solves is that companies often struggle to determine whether a candidate actually possesses the skills they claim to have.

Traditional recruitment relies heavily on CVs, interviews, certificates, and personal statements. These don't always demonstrate someone's real abilities.

SkillProve introduces a system where:

1. Candidates create professional skill profiles.
2. Companies create business accounts.
3. Companies search and discover candidates based on skills, experience, and qualifications.
4. Companies send candidates customized skill assessments.
5. Candidates complete assessments through the web or mobile application.
6. AI evaluates the submitted answers and practical work using predefined criteria and scoring rubrics.
7. Candidates receive verified skill results.
8. Companies can compare candidates based on demonstrated abilities.

**The main concept: Prove your skills. Don't just claim them.**

---

## 2. Platform Architecture

SkillProve must consist of two fully integrated applications sharing the same backend, API, authentication system, and PostgreSQL database.

### A. Web Application

A complete responsive web application optimized for:

- Desktop computers.
- Laptops.
- Tablets.
- Mobile browsers.

The web application should serve both candidates and companies.

Main areas:
- Public landing page.
- Candidate registration and authentication.
- Company registration and authentication.
- Candidate dashboard.
- Company dashboard.
- Candidate discovery and search.
- Skill assessments.
- Assessment results.
- Skill Passport.
- Profile management.
- Notifications.
- Account and security settings.
- Administrative platform management.

### B. Mobile Application

A real native mobile application built using React Native and Expo.

It must share the same backend and database as the web application.

The mobile application should provide:

- Candidate registration and login.
- Company account access.
- Candidate profiles.
- Skill Passport.
- Assessment invitations.
- Assessment completion.
- Assessment results.
- Push notifications.
- Profile editing.
- Account settings.
- Dashboard and activity overview.

Mobile and web must remain synchronized. An action performed on one platform must be reflected on the other.

For example, if a candidate completes an assessment on mobile, their updated results must immediately become available on the web application.

---

## 3. User Types and Permissions

SkillProve should support three main user categories.

### A. Candidates

People who want to demonstrate their professional abilities and make their skills visible to companies.

Candidates should be able to:

- Create personal accounts.
- Build professional profiles.
- Add work experience.
- Add education.
- Add certificates.
- Add portfolio projects.
- Add languages.
- Add skills.
- Receive assessment invitations.
- Complete assessments.
- View assessment history.
- View verified skill scores.
- Manage profile visibility.
- Share their Skill Passport.
- Receive notifications.
- Manage privacy settings.

### B. Companies

Businesses looking for qualified candidates based on actual skills.

Companies should be able to:

- Register company accounts.
- Create company profiles.
- Manage company information.
- Invite team members.
- Search candidates.
- Filter candidates by skills.
- View candidate Skill Passports according to their privacy permissions.
- Create skill assessments.
- Generate assessments using AI.
- Customize assessment difficulty and duration.
- Send assessment invitations.
- Track assessment progress.
- Review completed assessments.
- View AI evaluation reports.
- Compare candidate performance.
- Manage assessment history.
- Save interesting candidates.
- Receive notifications.

The company experience should be designed to make recruitment easier, faster, and more objective.

### C. Platform Administrators

Administrators manage the SkillProve ecosystem.

They should have access to:

- User management.
- Company management.
- Candidate management.
- Assessment management.
- Reports and analytics.
- Platform statistics.
- Account verification and moderation.
- Reports and complaints.
- Platform configuration.
- AI usage monitoring.
- System activity logs.

Permissions must be strictly enforced on the backend, not just hidden in the interface.

---

## 4. Candidate Profiles

Every candidate should have a professional profile that functions as their digital professional identity.

### Profile information

- Full name.
- Profile photograph.
- Professional headline.
- Biography.
- Location.
- Contact information with privacy controls.
- Employment status.
- Professional experience.
- Education.
- Certifications.
- Portfolio.
- Languages.
- Technical skills.
- Soft skills.

### Skill Passport

The Skill Passport is one of the most important features of SkillProve.

It should distinguish between three types of skills:

1. **Verified skills:** Skills demonstrated through completed and evaluated SkillProve assessments.
2. **Currently being assessed:** Skills for which the candidate has an active assessment.
3. **Self-reported skills:** Skills manually added by the candidate that have not been verified.

Each verified skill should display relevant information:

- Skill name.
- Score.
- Assessment date.
- Assessment difficulty.
- Assessment status.
- Verification details.

Verified scores must be immutable historical results. A candidate must never be able to manually change an AI-verified score.

### Privacy

Candidate profiles should be private by default.

Candidates should control their profile visibility and decide what information can be shared with companies.

Provide a profile preview so candidates can understand what companies can see.

---

## 5. Company Platform

Companies are the primary customers of SkillProve.

Their main goal is to find people with the skills required for their business.

### Company dashboard

Display:

- Total candidates discovered.
- Sent invitations.
- Pending assessments.
- Completed assessments.
- Average candidate scores.
- Recent activity.
- Saved candidates.
- Assessment statistics.

### Candidate discovery

Build a searchable candidate directory.

Companies should be able to search and filter by:

- Skills.
- Skill proficiency.
- Verified scores.
- Professional experience.
- Education.
- Certificates.
- Languages.
- Location.
- Availability.
- Assessment status.

Candidate search should be fast, relevant, and easy to use.

### Candidate comparison

Companies should be able to compare multiple candidates using:

- Verified skills.
- Assessment results.
- Experience.
- Education.
- Certifications.
- Relevant qualifications.

The comparison system should help businesses make informed recruitment decisions without automatically treating AI scores as the only measure of candidate quality.

---

## 6. AI-Powered Assessment System

This is the core technology behind SkillProve.

Companies should be able to create assessments manually or generate them using AI.

### Assessment creation

Companies can specify:

- Assessment title.
- Description.
- Skill being evaluated.
- Difficulty level.
- Number of questions.
- Expected duration.
- Assessment type.
- Evaluation criteria.
- Passing score.

### Difficulty levels

- Beginner.
- Intermediate.
- Advanced.

### Supported question types

1. Multiple choice.
2. True or false.
3. Short answer.
4. Scenario-based questions.
5. Practical assignments.

### AI assessment generation

The AI system should generate relevant assessments based on the selected skill and company requirements.

Generated assessments must have structured, validated output.

AI-generated content should be reviewed by the company before invitations are sent.

### Assessment execution

Candidates should be able to:

- Open invitations.
- Read assessment instructions.
- Start assessments.
- Answer questions.
- Complete practical tasks.
- Submit their work.
- See their submission status.
- View results when available.

Assessment execution must support both web and mobile.

### AI evaluation

After submission, AI evaluates the candidate's answers against predefined rubrics.

Evaluation should consider:

- Correctness.
- Technical understanding.
- Problem-solving.
- Quality of the solution.
- Relevance to the question.
- Completeness.
- Reasoning where appropriate.

Each assessment should produce:

- Overall score.
- Individual question scores.
- Skill-specific evaluation.
- Strengths.
- Weaknesses.
- Detailed feedback.
- Evaluation summary.
- Final assessment status.

AI evaluations must be based on actual submitted answers and the assessment rubric.

The system should avoid presenting AI-generated scores as infallible or as guaranteed proof of someone's overall professional ability.

### AI architecture

Use a provider-independent AI abstraction.

Initial provider: Google Gemini.

Keep the architecture ready for alternative providers, including OpenAI.

Implement:

- Structured JSON responses.
- Schema validation.
- Retry mechanisms.
- Timeouts.
- Error handling.
- Usage tracking.
- Cost controls.
- Evaluation versioning.
- Auditability.

---

## 7. Assessment Invitations and Notifications

Companies should be able to send assessment invitations to candidates.

Candidates should receive notifications when:

- A company sends an invitation.
- An assessment deadline approaches.
- An assessment is completed.
- An evaluation is ready.
- Their profile receives relevant activity.

Companies should receive notifications when:

- A candidate accepts or declines an invitation.
- A candidate starts an assessment.
- A candidate submits an assessment.
- An evaluation is completed.

Support:
- In-app notifications.
- Mobile push notifications.
- Email notifications.

Use Expo Push Notifications for the mobile application.

---

## 8. Business Model and Pricing

SkillProve should initially be accessible to businesses without requiring payment.

The original business model is based on keeping company access free initially.

The architecture should support future monetization without requiring major changes to the application.

Potential future premium capabilities could include:

- Higher assessment limits.
- Advanced candidate filtering.
- Bulk candidate invitations.
- Advanced analytics.
- Team collaboration.
- Custom assessment templates.
- Advanced AI evaluation capabilities.
- Recruitment integrations.

Do not introduce artificial payment barriers into the initial free experience.

Keep subscription and entitlement functionality extensible for future business plans.

---

## 9. Technology Stack

Use the established SkillProve technology decisions.

### Frontend — Web
- Next.js.
- React.
- TypeScript.
- Tailwind CSS.
- Shared design system.
- Responsive layouts.

### Frontend — Mobile
- React Native.
- Expo.
- TypeScript.
- Expo Router.
- Shared design tokens and API contracts where practical.

### Backend
- Next.js API application.
- REST API architecture.
- Shared services and business logic.
- Zod validation.
- Strict server-side authorization.

### Database
- PostgreSQL.
- Neon Database.
- Prisma ORM.

Web and mobile must use the same database through the shared backend.

### Authentication
- Clerk.
- Social authentication.
- Secure session handling.
- User synchronization through Clerk webhooks.
- Role-based authorization.

### Storage
- Cloudflare R2 for future file and media storage.

### Notifications
- Expo Push Notifications.
- Email notification integration.

### AI
- Google Gemini as the initial AI provider.
- Provider-independent AI integration.
- OpenAI compatibility for future expansion.

---

## 10. Design System and User Experience

SkillProve should look and feel like a modern international SaaS product.

The design should communicate:

- Trust.
- Professionalism.
- Technology.
- Intelligence.
- Simplicity.
- Credibility.

### Established brand colors

- Deep indigo: #222c6e.
- Primary blue: #2f5be0.

### Design requirements

- Modern and clean interfaces.
- Consistent spacing.
- Clear typography.
- Professional dashboard layouts.
- Accessible contrast.
- Responsive components.
- Subtle animations.
- Meaningful loading states.
- Skeleton loaders.
- Empty states.
- Error states.
- Confirmation dialogs.
- Toast notifications.

Support three appearance modes:

- Light.
- Dark.
- System.

### Internationalization

Albanian should be the default language, with English also supported.

Use a centralized translation system rather than hardcoded text.

Support Kosovo-specific formatting:

- Locale: sq.
- Timezone: Europe/Belgrade.
- Currency: EUR.
- Phone prefix: +383.

Keep the architecture ready for additional countries, currencies, languages, and regional settings.

---

## 11. Security and Data Protection

Security must be a fundamental part of the platform.

Implement:

- Role-based permissions.
- Company data isolation.
- Candidate data privacy.
- Ownership checks.
- Server-side validation.
- Secure authentication.
- Rate limiting.
- Input sanitization.
- Audit logs.
- Secure file access.
- Protection against unauthorized assessment access.
- Assessment submission integrity.
- Protection against unauthorized score modification.

Companies must never access another company's private data.

Candidates must never be able to modify verified assessment results.

All sensitive operations must be authorized on the backend.

---

## 12. Important Product Principles

These principles must guide all future development.

1. SkillProve is a complete web AND mobile platform, not just a website.
2. Both applications must share the same backend and database.
3. Candidate experience must be as important as company experience.
4. Real skills and demonstrated abilities are more important than self-reported claims.
5. AI should assist evaluation, not replace human judgment.
6. Verified assessment results must be trustworthy and auditable.
7. Privacy and security must be implemented from the beginning.
8. The initial business experience should remain free.
9. The product must be scalable and maintainable.
10. The platform should be ready for international expansion.

---

## 13. Development Instructions

Before making any changes to the existing SkillProve repository:

1. Inspect the entire existing monorepo.
2. Read the existing project documentation and development roadmap.
3. Inspect the API, web, and mobile applications.
4. Inspect the database schema and Prisma models.
5. Inspect authentication and authorization.
6. Review existing tests and CI configuration.
7. Identify completed milestones and unfinished functionality.
8. Identify architectural inconsistencies and technical debt.

**IMPORTANT:** This document describes the complete product vision. It does not mean that every feature should be implemented immediately.

Preserve all successfully completed milestones and existing functionality.

Do not rewrite working implementations just because a different approach is possible.

Follow the existing milestone plan, development conventions, branch strategy, and testing requirements.

Before starting any new milestone, identify:
- What already exists.
- What is missing.
- What needs improvement.
- Which files and modules will be affected.
- Which database changes are necessary.
- What tests must pass.

Implement features incrementally with appropriate unit, integration, and end-to-end tests.

Never claim a feature is complete unless its implementation and required verification have actually passed.

---

## 14. Final Vision

SkillProve should become a platform where companies can discover, assess, and compare people based on demonstrated professional abilities.

Candidates should have a place where they can build their professional identity, prove their skills, and make their verified abilities visible to potential employers.

Companies should spend less time guessing whether a candidate has the required skills and more time discovering people who can actually perform the work.

**SkillProve — Prove Your Skills. Build Your Future.**
