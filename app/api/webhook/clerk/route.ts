import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { WebhookEvent } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/clerk-sdk-node";

import { createUser, updateUser, deleteUser } from "@/lib/actions/user.actions";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing Clerk webhook secret");
    return new Response("Missing Clerk webhook secret", { status: 400 });
  }

  // Get the necessary headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id") ?? "";
  const svix_timestamp = headerPayload.get("svix-timestamp") ?? "";
  const svix_signature = headerPayload.get("svix-signature") ?? "";

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  const body = await req.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (error) {
    console.error("Webhook verification failed:", error);
    return new Response("Invalid webhook", { status: 400 });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  if (eventType === "user.created") {
       const {
         id,
         email_addresses,
         image_url,
         first_name,
         last_name,
         username,
       } = evt.data;


    const user = await createUser({
      clerkId: id,
      email: email_addresses[0]?.email_address,
      username: username!,
      firstName: first_name,
      lastName: last_name,
      photo: image_url,
    });

    // Store internal ID in Clerk metadata
    if (user) {
      await clerkClient.users.updateUserMetadata(id, {
        publicMetadata: {
          appUserId: user._id,
        },
      });
    }

    return NextResponse.json({ message: "User created", user });
  }

  if (eventType === "user.updated") {
    const { id, username, first_name, last_name, image_url } = evt.data;

    const updated = await updateUser(id, {
      username: username!,
      firstName: first_name,
      lastName: last_name,
      photo: image_url,
    });

    return NextResponse.json({ message: "User updated", updated });
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    const deleted = await deleteUser(id);

    return NextResponse.json({ message: "User deleted", deleted });
  }

  return new Response("", { status: 200 });
}
// export const runtime = "edge";
// export const dynamic = "force-dynamic";
// export const revalidate = 0;
// export const preferredRegion = "auto";
