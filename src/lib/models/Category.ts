import mongoose, { Schema, Document } from "mongoose";

export interface ICategory extends Document {
  name: string;
  emoji: string;
  color: string;
  type: "expense" | "income";
  budgetType: "needs" | "wants" | "savings";
  isDefault: boolean;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategory>({
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

export default mongoose.models.Category ||
  mongoose.model<ICategory>("Category", CategorySchema);
