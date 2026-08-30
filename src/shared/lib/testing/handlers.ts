import type { HttpHandler } from 'msw'

/** Base handlers remain empty; each test owns its exact OpenAPI-bound fixture. */
export const handlers: HttpHandler[] = []
