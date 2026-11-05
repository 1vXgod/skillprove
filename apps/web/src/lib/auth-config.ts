/** False until Clerk keys are set. Auth screens then say so, rather than pretending to work. */
export const isClerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
