import mongoose, { Schema, Document } from "mongoose";

export interface IRecurringPayment extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  amount: number;
  categoryId: mongoose.Types.ObjectId;
  frequency: "monthly" | "quarterly" | "yearly";
  dueDay: number;
  isActive: boolean;
  budgetType: "needs" | "wants" | "savings";
  isWriteOff: boolean;
  createdAt: Date;
}

const RecurringPaymentSchema = new Schema<IRecurringPayment>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  name: { type: String, required: true },
  amount: { type: Number, required: true },
  categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
  frequency: {
    type: String,
    enum: ["monthly", "quarterly", "yearly"],
    default: "monthly",
  },
  dueDay: { type: Number, default: 1, min: 1, max: 31 },
  isActive: { type: Boolean, default: true },
  isWriteOff: { type: Boolean, default: false },
  budgetType: {
    type: String,
    enum: ["needs", "wants", "savings"],
    default: "needs",
  },
  createdAt: { type: Date, default: Date.now },
});

RecurringPaymentSchema.index({ userId: 1, dueDay: 1, isActive: 1 });

export default mongoose.models.RecurringPayment ||
  mongoose.model<IRecurringPayment>("RecurringPayment", RecurringPaymentSchema);
