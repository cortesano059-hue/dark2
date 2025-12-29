import { Schema } from "mongoose";
import { t } from "../utils.js";
const guildSchema = new Schema(
  {
    id: t.string,
    channels: {
      logs: String,
      general: String
    }
  },
  {
    statics: {
      async get(id) {
        return await this.findOne({ id }) ?? this.create({ id });
      }
    }
  }
);
export {
  guildSchema
};
