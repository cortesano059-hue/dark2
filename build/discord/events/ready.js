import { createEvent } from "#base";
import { startSalaryScheduler } from "../../schedulers/salaryScheduler.js";
createEvent({
  name: "ready",
  event: "ready",
  once: true,
  async run(client) {
    startSalaryScheduler(client);
  }
});
