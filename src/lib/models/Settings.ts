import mongoose, { Schema, Document } from "mongoose";

export interface ISettings extends Document {
  currentBalance: number;
  balanceDate: Date;
  taxDebt: number;
  taxDebtDate: Date;
  creditDebt: number;
  creditDebtDate: Date;
  incomeTags: string[];
  vsaoiRate: number;
  iinRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    currentBalance: { type: Number, default: 0 },
    balanceDate: { type: Date, default: Date.now },
    taxDebt: { type: Number, default: 0 },
    taxDebtDate: { type: Date, default: Date.now },
    creditDebt: { type: Number, default: 0 },
    creditDebtDate: { type: Date, default: Date.now },
    incomeTags: [{ type: String }],
    vsaoiRate: { type: Number, default: 31.07 },
    iinRate: { type: Number, default: 25.5 },
  },
  { timestamps: true },
);

export default mongoose.models.Settings ||
  mongoose.model<ISettings>("Settings", SettingsSchema);
