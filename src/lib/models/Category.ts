import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  emoji: string;
  color: string;
  type: "expense" | "income";
  budgetType: "needs" | "wants" | "savings" | "obligations";
  isDefault: boolean;
  parentId?: mongoose.Types.ObjectId | null;
  isTax: boolean;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  name: { type: String, required: true },
  emoji: { type: String, required: true, default: "📦" },
  color: { type: String, required: true, default: "#6366f1" },
  type: { type: String, enum: ["expense", "income"], required: true },
  budgetType: {
    type: String,
    enum: ["needs", "wants", "savings", "obligations"],
    default: "needs",
  },
  isDefault: { type: Boolean, default: false },
  // One level of nesting: a subcategory points at its top-level parent.
  parentId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
  // Payments in this category count as tax paid (Insights → Taxes).
  isTax: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

CategorySchema.index({ userId: 1, type: 1, name: 1 });

export default mongoose.models.Category ||
  mongoose.model<ICategory>("Category", CategorySchema);
