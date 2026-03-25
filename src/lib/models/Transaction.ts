import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  amount: number;
  type: "expense" | "income";
  categoryId: mongoose.Types.ObjectId;
  description: string;
  date: Date;
  tags: string[];
  incomeType?: "bruto" | "neto";
  isWriteOff: boolean;
  recurringPaymentId?: mongoose.Types.ObjectId;
  debtPayment?: "tax" | "credit";
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["expense", "income"], required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
  description: { type: String, default: "" },
  date: { type: Date, required: true, default: Date.now },
  tags: [{ type: String }],
  incomeType: { type: String, enum: ["bruto", "neto"] },
  isWriteOff: { type: Boolean, default: false },
  recurringPaymentId: { type: Schema.Types.ObjectId, ref: "RecurringPayment" },
  debtPayment: { type: String, enum: ["tax", "credit"] },
  createdAt: { type: Date, default: Date.now },
});

TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, type: 1, date: -1 });

export default mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);
