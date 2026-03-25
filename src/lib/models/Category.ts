import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  emoji: string;
  color: string;
  type: "expense" | "income";
  budgetType: "needs" | "wants" | "savings";
  isDefault: boolean;
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
    enum: ["needs", "wants", "savings"],
    default: "needs",
  },
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

CategorySchema.index({ userId: 1, type: 1, name: 1 });

export default mongoose.models.Category ||
  mongoose.model<ICategory>("Category", CategorySchema);
