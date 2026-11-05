import { createApiClient } from "@skillprove/api-client";

const devDefault = process.env.NODE_ENV === "development" ? "http://localhost:4000" : "";

// A production build without this variable has no API to call, and the UI shows the error state.
export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? devDefault;

export const api = createApiClient({ baseUrl: apiBaseUrl });
