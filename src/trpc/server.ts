import "server-only";
import { createCallerFactory } from "./init";
import { appRouter } from "./router";

const createCaller = createCallerFactory(appRouter);
export const serverApi = createCaller({});
