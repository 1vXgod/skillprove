import { encodeQuestion } from "@skillprove/assessment-engine";
import { questionContentSchema, type QuestionContent } from "@skillprove/validation";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { DifficultyLevel } from "../generated/prisma/enums";
import type { QuestionRow } from "../repositories/assessments";
import { assertExpectedBranch, checkTestDatabaseUrl, UnsafeTestDatabaseError } from "../test-database-guard";

/*
 * Development-only demo data (Milestone 7): a demo company and six published, public, fully
 * objective assessments, so the candidate flow can be tried on a phone. Never run against
 * production. Accepted targets: a local database; a named, server-confirmed Neon branch that is
 * not an application database (the database-test rules); or the configured development
 * database (Neon `main`) when DEMO_ALLOW_DEV_DATABASE=1 opts in explicitly.
 */

const ACTION = "run the demo seed";

/** A Neon endpoint's pooled and direct hosts differ only by the "-pooler" suffix. */
function endpointOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^([^.]+)-pooler\./, "$1.");
  } catch {
    throw new UnsafeTestDatabaseError("a database URL could not be parsed.", ACTION);
  }
}

/** Hosts listed in PRODUCTION_DATABASE_HOSTS (comma-separated). Empty until production exists. */
export function parseProductionHosts(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/^([^.]+)-pooler\./, "$1."))
    .filter(Boolean);
}

/**
 * Throws unless the target is safe. Returns the Neon branch to confirm with the server, or null
 * for a local database or the opted-in development database. Production is always refused:
 * `NODE_ENV=production`, or any host in `productionHosts`, whatever else is set.
 */
export function checkDemoDatabaseUrl(options: {
  url: string;
  protectedUrls: readonly string[];
  allowedBranchId: string | undefined;
  nodeEnv: string | undefined;
  /** DEMO_ALLOW_DEV_DATABASE=1: the configured development database may be seeded. */
  allowDevDatabase: boolean;
  productionHosts: readonly string[];
}): { requiredBranchId: string | null } {
  if (options.nodeEnv === "production") throw new UnsafeTestDatabaseError("NODE_ENV is production.", ACTION);
  const endpoint = endpointOf(options.url);
  if (options.productionHosts.includes(endpoint)) {
    throw new UnsafeTestDatabaseError("the database is listed in PRODUCTION_DATABASE_HOSTS.", ACTION);
  }
  if (options.allowDevDatabase && options.protectedUrls.some((url) => endpointOf(url) === endpoint)) {
    return { requiredBranchId: null };
  }
  try {
    return checkTestDatabaseUrl(options);
  } catch (error) {
    if (error instanceof UnsafeTestDatabaseError) {
      const reason = error.reason.replace("TEST_DATABASE_URL", "DEMO_DATABASE_URL").replace("TEST_NEON_BRANCH_ID", "DEMO_NEON_BRANCH_ID");
      const hint = reason.includes("same endpoint") ? " For the development database, set DEMO_ALLOW_DEV_DATABASE=1." : "";
      throw new UnsafeTestDatabaseError(reason + hint, ACTION);
    }
    throw error;
  }
}

/** The server, not the URL, says which branch this is. */
export async function assertDemoBranch(client: PrismaClient, expected: string) {
  const [row] = await client.$queryRaw<{ branch: string | null }[]>`SELECT current_setting('neon.branch_id', true) AS branch`;
  try {
    assertExpectedBranch(row?.branch ?? null, expected);
  } catch {
    throw new UnsafeTestDatabaseError("the connected Neon branch is not DEMO_NEON_BRANCH_ID.", ACTION);
  }
}

export const DEMO_COMPANY_SLUG = "skillprove-demo";

type Choice = { id: string; text: string };
/** `difficulty` overrides the assessment's for one question, for assessments of mixed difficulty. */
type QuestionBase = { explanation: string; skill: string; difficulty?: DemoAssessment["difficulty"] };
type DemoQuestion =
  | (QuestionBase & { kind: "multiple_choice"; prompt: string; choices: Choice[]; correctChoiceId: string })
  | (QuestionBase & { kind: "multiple_select"; prompt: string; choices: Choice[]; correctChoiceIds: string[] })
  | (QuestionBase & { kind: "true_false"; prompt: string; correct: boolean });

interface DemoAssessment {
  /** Fixed, so a second run finds the first one's rows instead of adding new ones. */
  id: string;
  title: string;
  description: string;
  language: "en" | "sq";
  difficulty: Exclude<DifficultyLevel, "EXPERT">;
  durationMinutes: number;
  maxAttempts: number;
  /** Skill slug to weight; weights total 100. */
  skills: Record<string, number>;
  questions: DemoQuestion[];
}

/** One rubric criterion per skill, so automatic scoring gives each criterion that skill's result. */
const CRITERION_TITLES: Record<string, string> = { javascript: "JavaScript", sql: "SQL", react: "React", typescript: "TypeScript" };

const abc = (...texts: string[]): Choice[] => texts.map((text, i) => ({ id: String.fromCharCode(65 + i), text }));

export const DEMO_ASSESSMENTS: readonly DemoAssessment[] = [
  {
    id: "de300000-0000-4000-8000-000000000001",
    title: "JavaScript basics",
    description: "Variables, types, arrays and functions.",
    language: "en",
    difficulty: "BEGINNER",
    durationMinutes: 10,
    maxAttempts: 3,
    skills: { javascript: 100 },
    questions: [
      { kind: "multiple_choice", skill: "javascript", prompt: "Which keyword declares a variable that cannot be reassigned?", choices: abc("var", "let", "const"), correctChoiceId: "C", explanation: "A const binding cannot be reassigned." },
      { kind: "true_false", skill: "javascript", prompt: "typeof null returns \"null\".", correct: false, explanation: "It returns \"object\", a long-standing quirk of the language." },
      { kind: "multiple_choice", skill: "javascript", prompt: "What does [1, 2, 3].map((n) => n * 2) return?", choices: abc("[2, 4, 6]", "[1, 2, 3]", "12"), correctChoiceId: "A", explanation: "map returns a new array with each element transformed." },
      { kind: "multiple_select", skill: "javascript", prompt: "Which of these values are falsy?", choices: abc("0", "\"\" (empty string)", "\"0\"", "[] (empty array)"), correctChoiceIds: ["A", "B"], explanation: "0 and the empty string are falsy; non-empty strings and all arrays are truthy." },
      { kind: "true_false", skill: "javascript", prompt: "=== compares values without converting their types.", correct: true, explanation: "Strict equality never converts types." },
    ],
  },
  {
    id: "de300000-0000-4000-8000-000000000002",
    title: "Pyetje SQL",
    description: "SELECT, WHERE, JOIN dhe grupimi i të dhënave.",
    language: "sq",
    difficulty: "INTERMEDIATE",
    durationMinutes: 10,
    maxAttempts: 2,
    skills: { sql: 100 },
    questions: [
      { kind: "multiple_choice", skill: "sql", prompt: "Cila fjalë kyçe filtron rreshtat pas grupimit me GROUP BY?", choices: abc("WHERE", "HAVING", "ORDER BY"), correctChoiceId: "B", explanation: "HAVING filtron grupet; WHERE filtron rreshtat para grupimit." },
      { kind: "true_false", skill: "sql", prompt: "INNER JOIN kthen edhe rreshtat që nuk kanë përputhje në tabelën tjetër.", correct: false, explanation: "Vetëm LEFT, RIGHT ose FULL JOIN i mbajnë rreshtat pa përputhje." },
      { kind: "multiple_select", skill: "sql", prompt: "Cilat janë funksione agregate?", choices: abc("COUNT", "SUM", "UPPER", "AVG"), correctChoiceIds: ["A", "B", "D"], explanation: "UPPER punon me një vlerë të vetme, jo me një grup." },
      { kind: "multiple_choice", skill: "sql", prompt: "Si i gjeni rreshtat ku kolona email është bosh (NULL)?", choices: abc("email = NULL", "email IS NULL", "email == ''"), correctChoiceId: "B", explanation: "NULL krahasohet me IS NULL, jo me =." },
    ],
  },
  {
    id: "de300000-0000-4000-8000-000000000003",
    title: "React with TypeScript",
    description: "Components, state and typing props.",
    language: "en",
    difficulty: "ADVANCED",
    durationMinutes: 15,
    maxAttempts: 2,
    skills: { react: 50, typescript: 50 },
    questions: [
      { kind: "multiple_choice", skill: "react", prompt: "Which hook runs code after a component renders?", choices: abc("useState", "useEffect", "useMemo"), correctChoiceId: "B", explanation: "useEffect runs after render; the others do not run side effects." },
      { kind: "true_false", skill: "react", prompt: "Calling a state setter changes the state variable immediately, within the same render.", correct: false, explanation: "The new value appears on the next render." },
      { kind: "multiple_select", skill: "react", prompt: "Which of these cause a component to re-render?", choices: abc("Its state changes", "Its parent re-renders", "A ref's .current changes"), correctChoiceIds: ["A", "B"], explanation: "Changing a ref does not trigger a render." },
      { kind: "multiple_choice", skill: "typescript", prompt: "Which type accepts any value but must be narrowed before use?", choices: abc("any", "unknown", "never"), correctChoiceId: "B", explanation: "unknown is the type-safe counterpart of any." },
      { kind: "true_false", skill: "typescript", prompt: "Type annotations are checked at runtime in the browser.", correct: false, explanation: "Types are erased when TypeScript compiles to JavaScript." },
      { kind: "multiple_choice", skill: "typescript", prompt: "How do you mark the prop `title` as optional?", choices: abc("title?: string", "title: string?", "optional title: string"), correctChoiceId: "A", explanation: "A question mark after the property name makes it optional." },
    ],
  },
  {
    // Ten questions for one skill: answering all of them reaches confidence 50, the minimum for
    // the Skill Passport to show a level, so a level can be seen in demos.
    id: "de300000-0000-4000-8000-000000000004",
    title: "JavaScript intermediate",
    description: "Scope, closures, promises, objects and array methods.",
    language: "en",
    difficulty: "INTERMEDIATE",
    durationMinutes: 20,
    maxAttempts: 3,
    skills: { javascript: 100 },
    questions: [
      { kind: "multiple_choice", skill: "javascript", prompt: "What does this log? for (var i = 0; i < 3; i++) setTimeout(() => console.log(i));", choices: abc("0 1 2", "3 3 3", "undefined three times"), correctChoiceId: "B", explanation: "var is function-scoped, so every callback sees the final value 3; let would give 0 1 2." },
      { kind: "true_false", skill: "javascript", prompt: "A closure can read variables of its outer function after that function has returned.", correct: true, explanation: "Closures keep a reference to the scope they were created in." },
      { kind: "multiple_choice", skill: "javascript", prompt: "What does Promise.all do when one of its promises rejects?", choices: abc("Waits for the rest, then resolves", "Rejects as soon as that promise rejects", "Ignores the rejected promise"), correctChoiceId: "B", explanation: "Promise.all rejects with the first rejection; Promise.allSettled waits for all." },
      { kind: "multiple_select", skill: "javascript", prompt: "Which array methods return a new array instead of changing the original?", choices: abc("map", "filter", "sort", "splice"), correctChoiceIds: ["A", "B"], explanation: "sort and splice change the array in place." },
      { kind: "multiple_choice", skill: "javascript", prompt: "Inside a regular function called as obj.method(), what is `this`?", choices: abc("obj", "The global object, always", "The function itself"), correctChoiceId: "A", explanation: "For a method call, this is the object before the dot." },
      { kind: "true_false", skill: "javascript", prompt: "Arrow functions have their own `this`.", correct: false, explanation: "Arrow functions use the `this` of the scope they were defined in." },
      { kind: "multiple_choice", skill: "javascript", prompt: "What is the value of [1, 2, 3].reduce((sum, n) => sum + n, 10)?", choices: abc("6", "16", "10"), correctChoiceId: "B", explanation: "reduce starts from 10 and adds 1, 2 and 3." },
      { kind: "multiple_select", skill: "javascript", prompt: "Which of these copy an object one level deep?", choices: abc("{ ...obj }", "Object.assign({}, obj)", "const copy = obj", "structuredClone(obj)"), correctChoiceIds: ["A", "B"], explanation: "Spread and Object.assign copy one level; assignment copies nothing, and structuredClone copies deeply." },
      { kind: "multiple_choice", skill: "javascript", prompt: "What does `await` do inside an async function?", choices: abc("Blocks the whole program until the promise settles", "Pauses that function until the promise settles", "Turns the promise into a callback"), correctChoiceId: "B", explanation: "Only the async function pauses; other code keeps running." },
      { kind: "true_false", skill: "javascript", prompt: "Object keys declared with `const obj = {}` cannot be changed.", correct: false, explanation: "const stops reassigning the variable, not changing the object it points to." },
    ],
  },
  {
    // Twelve questions for one skill, of mixed difficulty: answering all of them gives confidence
    // 60, so a good result shows a Skill Passport level and a medal in demos.
    id: "de300000-0000-4000-8000-000000000005",
    title: "SQL në praktikë",
    description: "Filtrim, JOIN, grupim, nënpyetje dhe indekse, nga më e lehta te më e vështira.",
    language: "sq",
    difficulty: "INTERMEDIATE",
    durationMinutes: 20,
    maxAttempts: 3,
    skills: { sql: 100 },
    questions: [
      { kind: "multiple_choice", skill: "sql", difficulty: "BEGINNER", prompt: "Cila komandë lexon të dhëna nga një tabelë?", choices: abc("SELECT", "INSERT", "UPDATE"), correctChoiceId: "A", explanation: "SELECT lexon; INSERT shton dhe UPDATE ndryshon rreshta." },
      { kind: "true_false", skill: "sql", difficulty: "BEGINNER", prompt: "ORDER BY name DESC i rendit emrat nga Z në A.", correct: true, explanation: "DESC rendit në rend zbritës." },
      { kind: "multiple_choice", skill: "sql", difficulty: "BEGINNER", prompt: "Si i merr vetëm 5 rreshtat e parë në PostgreSQL?", choices: abc("LIMIT 5", "TOP 5 pas FROM", "FIRST 5"), correctChoiceId: "A", explanation: "PostgreSQL përdor LIMIT; TOP është sintaksë e SQL Server." },
      { kind: "multiple_select", skill: "sql", difficulty: "BEGINNER", prompt: "Cilat kushte gjejnë qytetet Prishtinë ose Prizren?", choices: abc("city IN ('Prishtinë', 'Prizren')", "city = 'Prishtinë' OR city = 'Prizren'", "city = 'Prishtinë' AND city = 'Prizren'"), correctChoiceIds: ["A", "B"], explanation: "IN dhe OR japin të njëjtin rezultat; AND nuk përputhet kurrë me dy vlera njëherësh." },
      { kind: "multiple_choice", skill: "sql", prompt: "Çfarë kthen LEFT JOIN për një klient pa porosi?", choices: abc("Asnjë rresht për atë klient", "Klientin, me NULL në kolonat e porosisë", "Një gabim"), correctChoiceId: "B", explanation: "LEFT JOIN i mban të gjitha rreshtat e tabelës së majtë." },
      { kind: "true_false", skill: "sql", prompt: "COUNT(email) i numëron edhe rreshtat ku email është NULL.", correct: false, explanation: "COUNT(kolona) i anashkalon NULL; COUNT(*) numëron të gjitha rreshtat." },
      { kind: "multiple_choice", skill: "sql", prompt: "Si e gjen numrin e porosive për çdo klient?", choices: abc("SELECT customer_id, COUNT(*) FROM orders GROUP BY customer_id", "SELECT customer_id, COUNT(*) FROM orders", "SELECT COUNT(customer_id) FROM orders ORDER BY customer_id"), correctChoiceId: "A", explanation: "GROUP BY krijon një grup për çdo klient, dhe COUNT numëron brenda grupit." },
      { kind: "multiple_select", skill: "sql", prompt: "Cilat nga këto mund të shkruhen në klauzolën HAVING?", choices: abc("COUNT(*) > 3", "SUM(total) >= 100", "Një kusht mbi kolonën e grupimit", "Një kusht mbi një kolonë që as grupohet, as agregohet"), correctChoiceIds: ["A", "B", "C"], explanation: "HAVING pranon agregate dhe kolonat e grupimit, por jo kolona të tjera të pa agreguara." },
      { kind: "multiple_choice", skill: "sql", difficulty: "ADVANCED", prompt: "Cila pyetje gjen klientët që nuk kanë asnjë porosi?", choices: abc("... WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)", "... WHERE c.id NOT IN (SELECT customer_id FROM orders WHERE customer_id = NULL)", "... INNER JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL"), correctChoiceId: "A", explanation: "NOT EXISTS me nënpyetje të lidhur është mënyra e sigurt; = NULL nuk përputhet kurrë dhe INNER JOIN nuk kthen klientë pa porosi." },
      { kind: "true_false", skill: "sql", difficulty: "ADVANCED", prompt: "Një indeks mbi (last_name, first_name) ndihmon edhe një kërkim vetëm sipas first_name.", correct: false, explanation: "Një indeks i përbërë ndihmon kryesisht kur kushti fillon me kolonën e parë." },
      { kind: "multiple_choice", skill: "sql", difficulty: "ADVANCED", prompt: "Çfarë bën ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at DESC)?", choices: abc("Numëron porositë e çdo klienti nga më e reja", "Fshin porositë e dyfishta", "Grupon të gjitha porositë në një rresht"), correctChoiceId: "A", explanation: "Funksioni i dritares e rinis numërimin për çdo klient, pa i bashkuar rreshtat." },
      { kind: "multiple_select", skill: "sql", difficulty: "ADVANCED", prompt: "Cilat janë të vërteta për një transaksion?", choices: abc("ROLLBACK i anulon ndryshimet që nga BEGIN", "Ndryshimet bëhen të dukshme për të tjerët pas COMMIT", "Çdo SELECT brenda tij bllokon tabelën për të gjithë"), correctChoiceIds: ["A", "B"], explanation: "Një SELECT i zakonshëm nuk i bllokon lexuesit e tjerë." },
    ],
  },
  {
    id: "de300000-0000-4000-8000-000000000006",
    title: "TypeScript in practice",
    description: "Types, narrowing, generics and utility types, from basics to advanced.",
    language: "en",
    difficulty: "ADVANCED",
    durationMinutes: 20,
    maxAttempts: 3,
    skills: { typescript: 100 },
    questions: [
      { kind: "multiple_choice", skill: "typescript", difficulty: "BEGINNER", prompt: "Which annotation declares a list of numbers?", choices: abc("number[]", "number", "[number]"), correctChoiceId: "A", explanation: "number[] (or Array<number>) is a list; [number] is a one-element tuple." },
      { kind: "true_false", skill: "typescript", difficulty: "BEGINNER", prompt: "TypeScript can infer the type of `const n = 5` without an annotation.", correct: true, explanation: "Inference gives n the literal type 5." },
      { kind: "multiple_choice", skill: "typescript", difficulty: "BEGINNER", prompt: "Which type allows a value to be a string or undefined?", choices: abc("string | undefined", "string & undefined", "string?"), correctChoiceId: "A", explanation: "A union with | allows either type." },
      { kind: "multiple_select", skill: "typescript", difficulty: "BEGINNER", prompt: "Which of these can describe the shape of an object?", choices: abc("interface", "type alias", "enum"), correctChoiceIds: ["A", "B"], explanation: "Interfaces and type aliases describe shapes; an enum is a set of named constants." },
      { kind: "multiple_choice", skill: "typescript", difficulty: "INTERMEDIATE", prompt: "After `if (typeof value === \"string\")`, what is value's type inside the block?", choices: abc("string", "unknown", "It stays unchanged"), correctChoiceId: "A", explanation: "typeof checks narrow the type inside the block." },
      { kind: "true_false", skill: "typescript", difficulty: "INTERMEDIATE", prompt: "readonly on a property stops it from being reassigned through that type.", correct: true, explanation: "readonly is checked at compile time and prevents assignment." },
      { kind: "multiple_choice", skill: "typescript", difficulty: "INTERMEDIATE", prompt: "What does Partial<User> produce?", choices: abc("User with every property optional", "User without its methods", "A copy of User that cannot change"), correctChoiceId: "A", explanation: "Partial makes each property optional; Readonly stops changes." },
      { kind: "multiple_select", skill: "typescript", difficulty: "INTERMEDIATE", prompt: "Which of these narrow a union of { kind: \"a\" } | { kind: \"b\" }?", choices: abc("switch (x.kind)", "if (x.kind === \"a\")", "if (x instanceof Object)"), correctChoiceIds: ["A", "B"], explanation: "Checking the shared literal field narrows a discriminated union; instanceof Object does not." },
      { kind: "multiple_choice", skill: "typescript", prompt: "What is T in `function first<T>(items: T[]): T`, called as first([1, 2])?", choices: abc("number", "number[]", "unknown"), correctChoiceId: "A", explanation: "T is inferred from the array's element type." },
      { kind: "true_false", skill: "typescript", prompt: "A function whose return type is `never` can return normally.", correct: false, explanation: "never means the function never returns: it throws or loops forever." },
      { kind: "multiple_choice", skill: "typescript", prompt: "What does `keyof { id: number; name: string }` give?", choices: abc("\"id\" | \"name\"", "number | string", "string[]"), correctChoiceId: "A", explanation: "keyof gives the union of the property names." },
      { kind: "multiple_select", skill: "typescript", prompt: "Which are true of `satisfies`?", choices: abc("It checks a value against a type", "It keeps the value's more specific inferred type", "It converts the value at runtime"), correctChoiceIds: ["A", "B"], explanation: "satisfies only checks at compile time and keeps the narrower type." },
    ],
  },
];

/** A demo question as authoring content, parsed by the same schema the authoring API uses. */
export function demoQuestionContent(question: DemoQuestion, skillId: string, difficulty: DemoAssessment["difficulty"]): QuestionContent {
  const content: Record<string, unknown> = { ...question, skillId, difficulty: question.difficulty ?? difficulty, estimatedMinutes: 2 };
  delete content.skill;
  return questionContentSchema.parse(content);
}

/** Encodes a demo question exactly as the authoring API would store it. */
function toRow(question: DemoQuestion, skillId: string, difficulty: DemoAssessment["difficulty"]) {
  const row = encodeQuestion(demoQuestionContent(question, skillId, difficulty)) as QuestionRow;
  return { ...row, options: row.options as Prisma.InputJsonValue, answerKey: row.answerKey as Prisma.InputJsonValue };
}

/**
 * Creates what is missing and leaves everything else alone: published versions cannot change,
 * and a second run must not add duplicates. Needs the skill taxonomy (`pnpm db:seed`) first.
 */
export async function seedDemoData(client: PrismaClient): Promise<{ created: number; existing: number }> {
  const slugs = [...new Set(DEMO_ASSESSMENTS.flatMap((a) => Object.keys(a.skills)))];
  const skills = await client.skill.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
  const skillId = new Map(skills.map((s) => [s.slug, s.id]));
  const missing = slugs.filter((slug) => !skillId.has(slug));
  if (missing.length > 0) throw new Error(`Skills ${missing.join(", ")} are missing. Run pnpm db:seed first.`);
  const idOf = (slug: string) => skillId.get(slug)!;

  const company = await client.company.upsert({
    where: { slug: DEMO_COMPANY_SLUG },
    create: { slug: DEMO_COMPANY_SLUG, name: "SkillProve Demo", description: "Demo data for development. Not a real company." },
    update: {},
  });

  let created = 0;
  for (const demo of DEMO_ASSESSMENTS) {
    if (await client.assessment.findUnique({ where: { id: demo.id }, select: { id: true } })) continue;
    await client.$transaction(async (tx) => {
      await tx.assessment.create({ data: { id: demo.id, ownerType: "COMPANY", ownerCompanyId: company.id, visibility: "PUBLIC" } });
      const version = await tx.assessmentVersion.create({
        data: {
          assessmentId: demo.id,
          version: 1,
          title: demo.title,
          description: demo.description,
          language: demo.language,
          format: "MULTIPLE_CHOICE",
          difficulty: demo.difficulty,
          assessmentType: "KNOWLEDGE",
          durationMinutes: demo.durationMinutes,
          maxAttempts: demo.maxAttempts,
          questions: { create: demo.questions.map((q, i) => ({ position: i + 1, ...toRow(q, idOf(q.skill), demo.difficulty) })) },
          skills: { create: Object.entries(demo.skills).map(([slug, weight]) => ({ skillId: idOf(slug), weight })) },
        },
      });
      const rubric = await tx.assessmentRubricVersion.create({
        data: {
          assessmentVersionId: version.id,
          version: 1,
          criteria: {
            create: Object.entries(demo.skills).map(([slug, weight]) => ({ key: slug, title: CRITERION_TITLES[slug] ?? slug, weight, skillId: idOf(slug) })),
          },
        },
      });
      const now = new Date();
      await tx.assessmentRubricVersion.update({ where: { id: rubric.id }, data: { publishedAt: now } });
      await tx.assessmentVersion.update({ where: { id: version.id }, data: { status: "PUBLISHED", publishedAt: now } });
    });
    created += 1;
  }
  return { created, existing: DEMO_ASSESSMENTS.length - created };
}

/**
 * Adds an existing user to the demo company as an ADMIN, so the Company section and assessment
 * authoring can be tried. The user must have signed in once, so their account exists. Safe to
 * repeat: an existing membership, whatever its role or status, is left alone.
 */
export async function addDemoMember(client: PrismaClient, email: string): Promise<"added" | "existing"> {
  const user = await client.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true } });
  if (!user) throw new Error("No user has that email. Sign in to SkillProve once with it, then run the demo seed again.");
  const company = await client.company.findUnique({ where: { slug: DEMO_COMPANY_SLUG }, select: { id: true } });
  if (!company) throw new Error("The demo company is missing. Run the demo seed without DEMO_MEMBER_EMAIL first.");

  const existing = await client.companyMember.findUnique({ where: { companyId_userId: { companyId: company.id, userId: user.id } }, select: { id: true } });
  if (existing) return "existing";
  await client.companyMember.create({ data: { companyId: company.id, userId: user.id, role: "ADMIN" } });
  return "added";
}
