import mongoose from "mongoose";
import Category from "@/lib/models/Category";

const BUDGET_TYPES = new Set(["needs", "wants", "savings", "obligations"]);

/**
 * Whitelists category fields and enforces the two-level hierarchy:
 * a parent must be a top-level category of the same type, and a category
 * that already has subcategories can't become a subcategory itself.
 */
export async function sanitizeCategoryFields(
  body: Record<string, unknown>,
  userId: string,
  existingId?: string,
) {
  const fields: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const name = String(body.name ?? "").trim().slice(0, 60);
    if (!name) throw new Error("Name is required");
    fields.name = name;
  }
  if (body.emoji !== undefined) fields.emoji = String(body.emoji).slice(0, 16);
  if (body.color !== undefined) fields.color = String(body.color).slice(0, 16);
  if (body.type !== undefined) {
    if (body.type !== "expense" && body.type !== "income") {
      throw new Error("Invalid type");
    }
    fields.type = body.type;
  }
  if (body.budgetType !== undefined) {
    if (!BUDGET_TYPES.has(String(body.budgetType))) {
      throw new Error("Invalid budget type");
    }
    fields.budgetType = body.budgetType;
  }
  if (body.isTax !== undefined) fields.isTax = Boolean(body.isTax);

  if (body.parentId !== undefined) {
    const parentId = body.parentId ? String(body.parentId) : null;
    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        throw new Error("Invalid parent");
      }
      if (parentId === existingId) {
        throw new Error("A category can't be inside itself");
      }
      const parent = await Category.findOne({ _id: parentId, userId }).lean<{
        type: string;
        parentId?: unknown;
      }>();
      if (!parent) throw new Error("Parent category not found");
      if (parent.parentId) {
        throw new Error("Subcategories can't have their own subcategories");
      }
      if (existingId) {
        const hasChildren = await Category.exists({
          userId,
          parentId: existingId,
        });
        if (hasChildren) {
          throw new Error(
            "This category has subcategories, so it can't move inside another",
          );
        }
      }
      const ownType =
        (fields.type as string | undefined) ??
        (existingId
          ? (
              await Category.findOne({ _id: existingId, userId })
                .select("type")
                .lean<{ type: string }>()
            )?.type
          : undefined);
      if (ownType && ownType !== parent.type) {
        throw new Error("Parent must be the same type (expense or income)");
      }
      fields.parentId = new mongoose.Types.ObjectId(parentId);
    } else {
      fields.parentId = null;
    }
  }

  return fields;
}
