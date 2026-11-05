interface Names {
  sq: string;
  en: string;
}

export interface SeedCategory {
  slug: string;
  parent?: string;
  name: Names;
}

export interface SeedSkill {
  slug: string;
  category: string;
  name: Names;
  aliases?: string[];
}

/** Parents come before their children. */
export const SKILL_CATEGORIES: SeedCategory[] = [
  { slug: "technology", name: { sq: "Teknologji", en: "Technology" } },
  { slug: "software-development", parent: "technology", name: { sq: "Zhvillim softueri", en: "Software development" } },
  { slug: "web-development", parent: "software-development", name: { sq: "Zhvillim uebi", en: "Web development" } },
  { slug: "mobile-development", parent: "software-development", name: { sq: "Zhvillim aplikacionesh mobile", en: "Mobile development" } },
  { slug: "data", parent: "technology", name: { sq: "Të dhëna", en: "Data" } },
  { slug: "infrastructure", parent: "technology", name: { sq: "Infrastrukturë dhe DevOps", en: "Infrastructure and DevOps" } },
  { slug: "quality-assurance", parent: "technology", name: { sq: "Sigurimi i cilësisë", en: "Quality assurance" } },
  { slug: "design", name: { sq: "Dizajn", en: "Design" } },
  { slug: "marketing", name: { sq: "Marketing", en: "Marketing" } },
  { slug: "business", name: { sq: "Biznes", en: "Business" } },
  { slug: "finance", name: { sq: "Financa dhe kontabilitet", en: "Finance and accounting" } },
  { slug: "communication", name: { sq: "Komunikim dhe gjuhë", en: "Communication and languages" } },
];

export const SKILLS: SeedSkill[] = [
  { slug: "javascript", category: "web-development", name: { sq: "JavaScript", en: "JavaScript" }, aliases: ["JS", "ECMAScript"] },
  { slug: "typescript", category: "web-development", name: { sq: "TypeScript", en: "TypeScript" }, aliases: ["TS"] },
  { slug: "react", category: "web-development", name: { sq: "React", en: "React" }, aliases: ["ReactJS", "React.js"] },
  { slug: "nextjs", category: "web-development", name: { sq: "Next.js", en: "Next.js" }, aliases: ["NextJS"] },
  { slug: "html-css", category: "web-development", name: { sq: "HTML dhe CSS", en: "HTML and CSS" }, aliases: ["HTML", "CSS"] },
  { slug: "nodejs", category: "software-development", name: { sq: "Node.js", en: "Node.js" }, aliases: ["NodeJS", "Node"] },
  { slug: "python", category: "software-development", name: { sq: "Python", en: "Python" }, aliases: ["Py"] },
  { slug: "java", category: "software-development", name: { sq: "Java", en: "Java" } },
  { slug: "csharp", category: "software-development", name: { sq: "C#", en: "C#" }, aliases: ["CSharp", ".NET", "dotnet"] },
  { slug: "php", category: "software-development", name: { sq: "PHP", en: "PHP" } },
  { slug: "react-native", category: "mobile-development", name: { sq: "React Native", en: "React Native" }, aliases: ["RN"] },
  { slug: "flutter", category: "mobile-development", name: { sq: "Flutter", en: "Flutter" } },
  { slug: "swift", category: "mobile-development", name: { sq: "Swift", en: "Swift" } },
  { slug: "kotlin", category: "mobile-development", name: { sq: "Kotlin", en: "Kotlin" } },
  { slug: "sql", category: "data", name: { sq: "SQL", en: "SQL" }, aliases: ["PostgreSQL", "MySQL"] },
  { slug: "data-analysis", category: "data", name: { sq: "Analizë e të dhënave", en: "Data analysis" }, aliases: ["Analizë të dhënash"] },
  { slug: "machine-learning", category: "data", name: { sq: "Mësim makinerik", en: "Machine learning" }, aliases: ["ML"] },
  { slug: "docker", category: "infrastructure", name: { sq: "Docker", en: "Docker" } },
  { slug: "aws", category: "infrastructure", name: { sq: "AWS", en: "AWS" }, aliases: ["Amazon Web Services"] },
  { slug: "linux", category: "infrastructure", name: { sq: "Linux", en: "Linux" } },
  { slug: "software-testing", category: "quality-assurance", name: { sq: "Testim softueri", en: "Software testing" }, aliases: ["QA"] },
  { slug: "ui-design", category: "design", name: { sq: "Dizajn i ndërfaqes", en: "UI design" }, aliases: ["UI"] },
  { slug: "ux-design", category: "design", name: { sq: "Dizajn i përvojës së përdoruesit", en: "UX design" }, aliases: ["UX"] },
  { slug: "graphic-design", category: "design", name: { sq: "Dizajn grafik", en: "Graphic design" } },
  { slug: "digital-marketing", category: "marketing", name: { sq: "Marketing digjital", en: "Digital marketing" } },
  { slug: "seo", category: "marketing", name: { sq: "Optimizim për motorë kërkimi", en: "Search engine optimization" }, aliases: ["SEO"] },
  { slug: "content-writing", category: "marketing", name: { sq: "Shkrim përmbajtjeje", en: "Content writing" }, aliases: ["Copywriting"] },
  { slug: "project-management", category: "business", name: { sq: "Menaxhim projektesh", en: "Project management" }, aliases: ["PM"] },
  { slug: "sales", category: "business", name: { sq: "Shitje", en: "Sales" } },
  { slug: "customer-support", category: "business", name: { sq: "Mbështetje e klientëve", en: "Customer support" } },
  { slug: "accounting", category: "finance", name: { sq: "Kontabilitet", en: "Accounting" } },
  { slug: "financial-analysis", category: "finance", name: { sq: "Analizë financiare", en: "Financial analysis" } },
  { slug: "english-language", category: "communication", name: { sq: "Gjuhë angleze", en: "English language" }, aliases: ["Anglisht", "English"] },
  { slug: "albanian-language", category: "communication", name: { sq: "Gjuhë shqipe", en: "Albanian language" }, aliases: ["Shqip", "Albanian"] },
  { slug: "business-writing", category: "communication", name: { sq: "Shkrim profesional", en: "Business writing" } },
];
