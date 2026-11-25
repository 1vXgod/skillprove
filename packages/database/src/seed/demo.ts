import { encodeQuestion } from "@skillprove/assessment-engine";
import { questionContentSchema, type QuestionContent } from "@skillprove/validation";
import type { Prisma, PrismaClient } from "../generated/prisma/client";
import type { DifficultyLevel } from "../generated/prisma/enums";
import type { QuestionRow } from "../repositories/assessments";
import { assertExpectedBranch, checkTestDatabaseUrl, UnsafeTestDatabaseError } from "../test-database-guard";

/*
 * Development-only demo data (Milestone 7): a demo company and four published, public, fully
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
type DemoQuestion =
  | { kind: "multiple_choice"; prompt: string; choices: Choice[]; correctChoiceId: string; explanation: string; skill: string }
  | { kind: "multiple_select"; prompt: string; choices: Choice[]; correctChoiceIds: string[]; explanation: string; skill: string }
  | { kind: "true_false"; prompt: string; correct: boolean; explanation: string; skill: string };

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
];

/** A demo question as authoring content, parsed by the same schema the authoring API uses. */
export function demoQuestionContent(question: DemoQuestion, skillId: string, difficulty: DemoAssessment["difficulty"]): QuestionContent {
  const content: Record<string, unknown> = { ...question, skillId, difficulty, estimatedMinutes: 2 };
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
