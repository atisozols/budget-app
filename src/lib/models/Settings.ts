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
  vsaoiPensionRate: number;
  vsaoiThreshold: number;
  iinRate: number;
  homeCards: {
    id: string;
    enabled: boolean;
  }[];
  savingsGoal: number;
  savingsStartMonth?: string;
  budgets: {
    categoryId: mongoose.Types.ObjectId;
    amount: number;
  }[];
  quickPicks: {
    categoryId: mongoose.Types.ObjectId;
    description?: string;
    isWriteOff?: boolean;
    incomeType?: "bruto" | "neto";
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
    // Self-employed: below the threshold (minimum wage) only the pension
    // rate applies; above it, the full rate on the threshold + pension rate
    // on the rest.
    vsaoiPensionRate: { type: Number, default: 10 },
    vsaoiThreshold: { type: Number, default: 780 },
    iinRate: { type: Number, default: 25.5 },
    savingsGoal: { type: Number, default: 0 },
    savingsStartMonth: { type: String },
    budgets: [
      {
        categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
        amount: { type: Number, default: 0 },
      },
    ],
    quickPicks: [
      {
        categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
        description: { type: String },
        isWriteOff: { type: Boolean },
        incomeType: { type: String, enum: ["bruto", "neto"] },
      },
    ],
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
