import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/", // homepage
  "/sign-in(.*)", // sign-in page
  "/sign-up(.*)", // sign-up page
  "/events/:id", // event detail page
  "/api/uploadthing", // ignored API route
  "/api/webhook/clerk",
  "/api/webhook/stripe",
]);

const isIgnoredRoute = createRouteMatcher([
  "/api/uploadthing",
  "/api/webhook/clerk",
  "/api/webhook/stripe",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req) && !isIgnoredRoute(req)) {
    await auth(); // protect non-public, non-ignored routes
  }
});

export const config = {
  matcher: [
    // Match all app routes except static assets
    "/((?!_next|.*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)", // Always include API and TRPC routes
  ],
};
