import { initTRPC } from "@trpc/server";
import superjson from "superjson";

const t = initTRPC.create({
  transformer: superjson,
});

export const router = t.router;
export const baseProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
