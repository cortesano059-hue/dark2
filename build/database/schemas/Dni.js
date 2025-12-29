import { Schema, model } from "mongoose";
const DniSchema = new Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  dni: { type: String, required: true },
  nombre: { type: String, required: true },
  apellido: { type: String, required: true },
  edad: { type: Number, required: true },
  nacionalidad: { type: String, required: true },
  psid: { type: String, required: true }
});
DniSchema.index({ userId: 1, guildId: 1 }, { unique: true });
DniSchema.index({ dni: 1, guildId: 1 }, { unique: true });
const Dni = model("Dni", DniSchema);
export {
  Dni
};
