import mongoose, { Schema, Document } from "mongoose";
import { DEFAULT_HOME_CARDS, HOME_CARD_DEFINITIONS } from "@/lib/homeCards";

export interface ISettings extends Document {
  userId: mongoose.Types.ObjectId;
  currentBalance: number;
  balanceDate: Date;
  taxDebt: number;
  taxDebtDate: Date;
  creditDebt: number;
  creditDebtDate: Date;
  incomeTags: string[];
  vsaoiRate: number;
  iinRate: number;
  homeCards: {
    id: string;
    enabled: boolean;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    currentBalance: { type: Number, default: 0 },
    balanceDate: { type: Date, default: Date.now },
    taxDebt: { type: Number, default: 0 },
    taxDebtDate: { type: Date, default: Date.now },
    creditDebt: { type: Number, default: 0 },
    creditDebtDate: { type: Date, default: Date.now },
    incomeTags: [{ type: String }],
    vsaoiRate: { type: Number, default: 31.07 },
    iinRate: { type: Number, default: 25.5 },
    homeCards: [
      {
        id: {
          type: String,
          enum: HOME_CARD_DEFINITIONS.map((card) => card.id),
          required: true,
        },
        enabled: { type: Boolean, default: true },
      },
    ],
  },
  { timestamps: true },
);

SettingsSchema.path("homeCards").default(() =>
  DEFAULT_HOME_CARDS.map((card) => ({ ...card })),
);

SettingsSchema.index({ userId: 1 }, { unique: true });

export default mongoose.models.Settings ||
  mongoose.model<ISettings>("Settings", SettingsSchema);
