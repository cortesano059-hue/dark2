import { createEvent } from "#base";
import { startSalaryScheduler } from "../../schedulers/salaryScheduler.js";

createEvent({
    name: "ready",
    event: "ready",
    once: true,
    async run(client) {
        // console.log(ck.green("🔥 READY EXECUTE INICIADO"));

        // Note: Constatic handles command registration automatically in bootstrap.ts, 
        // so we don't need to manually register commands here like in the old 'ready.js'.
        // However, we can log the count if we want, but 'bootstrap.ts' usually does it.

        /* ===============================
           INICIO DEL SCHEDULER
           =============================== */
        startSalaryScheduler(client);
    }
});
