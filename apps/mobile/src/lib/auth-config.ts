/** Unset until Clerk is configured. The app then says so, rather than pretending to work. */
export const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || null;
