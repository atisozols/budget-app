#!/usr/bin/env node

// One-off migration to two-level categories.
//
//   node --env-file=.env.local scripts/migrate-categories.mjs --email you@x.com
//       → dry run: prints every planned move, writes nothing
//   ... --apply
//       → writes a full backup to backups/ first (importable from
//         Settings → Import), then applies the plan
//
// Rules: existing categories are never renamed or deleted (except the unused
// "Savings"); entries only move from a parent into one of its own new
// subcategories, so every parent keeps the same total.

import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const APPLY = process.argv.includes("--apply");

// ─── Plan ────────────────────────────────────────────────────────────
// match(description, transaction) → true if the entry moves into the sub.
const has = (...words) => (d) => words.some((w) => d.includes(w));

const SPLITS = [
  {
    parent: "Dining Out",
    subs: [
      {
        name: "Delivery",
        emoji: "🛵",
        color: "#10b981",
        budgetType: "wants",
        match: has("wolt", "bolt"),
      },
      {
        name: "Coffee & snacks",
        emoji: "☕",
        color: "#a16207",
        budgetType: "wants",
        match: has(
          "kukul",
          "coffee",
          "kafija",
          "kalve",
          "circlek",
          "circle k",
          "narvesen",
          "virsi",
          "mccafe",
          "mirinda",
          "breky rimi",
          "udens",
          "milk & madu",
          "milk and madu",
        ),
      },
      {
        name: "Bars & drinks",
        emoji: "🍸",
        color: "#ec4899",
        budgetType: "wants",
        match: has("drinks", "bar", "daikiri", "valmiermuiza"),
      },
      {
        name: "Eating out",
        emoji: "🍽️",
        color: "#f59e0b",
        budgetType: "wants",
        match: has(
          "lido",
          "lulu",
          "hesburger",
          "hes",
          "mcd",
          "mcdonald",
          "burger",
          "kfc",
          "manana",
          "stockpot",
          "duna",
          "kebab",
          "keb",
          "subwa",
          "sushi",
          "pizza",
          "hacapuri",
          "ezitis",
          "ezits",
          "ezītis",
          "hot king",
          "putra",
          "moku",
          "kristofers",
          "karbonades",
          "randevu",
          "dinner",
          "restaurant",
          "airport food",
          "brunch",
          "street bakery",
          "major market",
          "piknik",
          "ikea",
          "forum",
          "copenhagen",
        ),
      },
    ],
  },
  {
    parent: "Investments & Insurance",
    parentBudgetType: "needs",
    subs: [
      {
        name: "Debt repayment",
        emoji: "💳",
        color: "#ef4444",
        budgetType: "obligations",
        match: (d, t) => t.debtPayment === "credit" || d.includes("credit"),
      },
      {
        name: "Insurance",
        emoji: "🛡️",
        color: "#0ea5e9",
        budgetType: "needs",
        match: has("insurance", "ergo"),
      },
      {
        name: "Equipment & gear",
        emoji: "🎛️",
        color: "#8b5cf6",
        budgetType: "wants",
        match: has(
          "drums",
          "thomann",
          "dell",
          "galds",
          "sandisk",
          "office setup",
          "whoop",
          "bike fenders",
        ),
      },
    ],
  },
  {
    parent: "Services",
    subs: [
      {
        name: "Work software",
        emoji: "🤖",
        color: "#6366f1",
        budgetType: "needs",
        match: has("chatgpt", "claude", "captions", "splice"),
      },
      {
        name: "Hosting & dev",
        emoji: "🖥️",
        color: "#06b6d4",
        budgetType: "needs",
        match: has("render", "resend", "mongodb", "clerk", "godaddy", "zoho"),
      },
      {
        name: "Accounting",
        emoji: "📒",
        color: "#14b8a6",
        budgetType: "needs",
        match: has("accounting"),
      },
      {
        name: "Personal",
        emoji: "👤",
        color: "#a855f7",
        budgetType: "wants",
        match: has("icloud", "nordvpn", "google", "bike repair", "carwash"),
      },
    ],
  },
  {
    parent: "Other Income",
    subs: [
      {
        name: "Music gigs",
        emoji: "🎵",
        color: "#ec4899",
        budgetType: "needs",
        match: (d, t) => (t.tags || []).includes("Music"),
      },
    ],
  },
  {
    parent: "Taxes",
    parentBudgetType: "obligations",
    parentIsTax: true,
    subs: [
      {
        name: "Fees & fines",
        emoji: "🧾",
        color: "#f97316",
        budgetType: "needs",
        match: has("fine"),
      },
    ],
  },
];

// Existing categories that move under a parent (whole category, no splits).
const NEST = [
  { child: "Electricity", parent: "Utilities" },
  { child: "LMT", parent: "Phone & internet" },
  { child: "Internet", parent: "Phone & internet" },
  { child: "Contract Work", parent: "Other Income" },
];

const NEW_ROOTS = [
  {
    name: "Phone & internet",
    emoji: "📶",
    color: "#0ea5e9",
    type: "expense",
    budgetType: "needs",
  },
];

const BUDGET_TYPE_FIXES = [{ name: "Education", budgetType: "wants" }];
const DELETE_IF_UNUSED = ["Savings"];

// Tax payments made in 2026 that settle 2025 (Jan 6 VSAOI, Jun 14 IIN).
const TAX_YEAR_OVERRIDES = [
  { date: "2026-01-06", amount: 381.83, taxYear: 2025 },
  { date: "2026-06-14", amount: 711.36, taxYear: 2025 },
];

const SAVINGS = { savingsGoal: 200, savingsStartMonth: "2026-10" };

// ─── Run ─────────────────────────────────────────────────────────────

const fmt = (n) => `€${n.toFixed(2)}`;
const dateKey = (d) => new Date(d).toISOString().slice(0, 10);

async function main() {
  const email = getArg("--email")?.trim().toLowerCase();
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  if (!email) throw new Error("Usage: ... --email you@example.com [--apply]");

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const user = await db.collection("users").findOne({ email });
  if (!user) throw new Error(`No user ${email}`);
  const userId = user._id;

  const Categories = db.collection("categories");
  const Transactions = db.collection("transactions");
  const Recurring = db.collection("recurringpayments");
  const Settings = db.collection("settings");

  const categories = await Categories.find({ userId }).toArray();
  const transactions = await Transactions.find({ userId }).toArray();
  const recurring = await Recurring.find({ userId }).toArray();
  const settings = await Settings.findOne({ userId });

  const byName = (name) => categories.find((c) => c.name === name);
  const ops = []; // async closures, run in order on --apply
  const report = [];
  const log = (line = "") => report.push(line);

  // New top-level categories
  const created = new Map(); // name → _id (planned)
  for (const root of NEW_ROOTS) {
    const existing = byName(root.name);
    if (existing) {
      created.set(root.name, existing._id);
      continue;
    }
    const _id = new mongoose.Types.ObjectId();
    created.set(root.name, _id);
    log(`+ New category: ${root.emoji} ${root.name}`);
    ops.push(() =>
      Categories.insertOne({
        _id,
        userId,
        ...root,
        isDefault: false,
        parentId: null,
        isTax: false,
        createdAt: new Date(),
      }),
    );
  }
  const idOf = (name) => byName(name)?._id ?? created.get(name);

  // Nest whole categories
  for (const { child, parent } of NEST) {
    const childCat = byName(child);
    const parentId = idOf(parent);
    if (!childCat || !parentId) {
      log(`! Skipped nesting ${child} → ${parent} (not found)`);
      continue;
    }
    if (String(childCat.parentId ?? "") === String(parentId)) continue;
    const count = transactions.filter(
      (t) => String(t.categoryId) === String(childCat._id),
    ).length;
    log(`→ ${child} (${count} entries) now sits inside ${parent}`);
    ops.push(() =>
      Categories.updateOne({ _id: childCat._id }, { $set: { parentId } }),
    );
  }

  // Splits
  for (const split of SPLITS) {
    const parent = byName(split.parent);
    if (!parent) {
      log(`! Missing parent ${split.parent}`);
      continue;
    }
    log("");
    log(`══ ${parent.emoji} ${parent.name}`);

    const parentSet = {};
    if (split.parentBudgetType && parent.budgetType !== split.parentBudgetType) {
      parentSet.budgetType = split.parentBudgetType;
    }
    if (split.parentIsTax && !parent.isTax) parentSet.isTax = true;
    if (Object.keys(parentSet).length) {
      log(`   settings: ${JSON.stringify(parentSet)}`);
      ops.push(() => Categories.updateOne({ _id: parent._id }, { $set: parentSet }));
    }

    const entries = transactions.filter(
      (t) => String(t.categoryId) === String(parent._id),
    );
    const assigned = new Map(); // sub name → transactions
    const unplaced = [];
    for (const t of entries) {
      const d = (t.description || "").trim().toLowerCase();
      const sub = split.subs.find((s) => s.match(d, t));
      if (sub) {
        const list = assigned.get(sub.name) ?? [];
        list.push(t);
        assigned.set(sub.name, list);
      } else {
        unplaced.push(t);
      }
    }

    for (const sub of split.subs) {
      const existing = categories.find(
        (c) => c.name === sub.name && String(c.parentId) === String(parent._id),
      );
      const subId = existing?._id ?? new mongoose.Types.ObjectId();
      if (!existing) {
        ops.push(() =>
          Categories.insertOne({
            _id: subId,
            userId,
            name: sub.name,
            emoji: sub.emoji,
            color: sub.color,
            type: parent.type,
            budgetType: sub.budgetType,
            isDefault: false,
            parentId: parent._id,
            isTax: false,
            createdAt: new Date(),
          }),
        );
      }
      const list = assigned.get(sub.name) ?? [];
      const total = list.reduce((s, t) => s + t.amount, 0);
      const descs = new Map();
      for (const t of list) {
        const d = (t.description || "").trim().toLowerCase() || "(no description)";
        descs.set(d, (descs.get(d) ?? 0) + 1);
      }
      log(
        `   ${sub.emoji} ${sub.name}: ${list.length} entries, ${fmt(total)}${existing ? " (exists)" : " (new)"}`,
      );
      if (descs.size) {
        log(
          `      ${[...descs.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([d, n]) => (n > 1 ? `${d} ×${n}` : d))
            .join(", ")}`,
        );
      }
      if (list.length) {
        const ids = list.map((t) => t._id);
        ops.push(() =>
          Transactions.updateMany(
            { _id: { $in: ids }, userId },
            { $set: { categoryId: subId } },
          ),
        );
      }

      // Recurring definitions follow their entries into the subcategory.
      const recurringMatches = recurring.filter(
        (r) =>
          String(r.categoryId) === String(parent._id) &&
          sub.match((r.name || "").toLowerCase(), r),
      );
      if (recurringMatches.length) {
        log(
          `      recurring bills moved too: ${recurringMatches.map((r) => r.name).join(", ")}`,
        );
        const ids = recurringMatches.map((r) => r._id);
        ops.push(() =>
          Recurring.updateMany(
            { _id: { $in: ids }, userId },
            { $set: { categoryId: subId } },
          ),
        );
      }
    }

    const unplacedTotal = unplaced.reduce((s, t) => s + t.amount, 0);
    const unplacedDescs = new Map();
    for (const t of unplaced) {
      const d = (t.description || "").trim().toLowerCase() || "(no description)";
      unplacedDescs.set(d, (unplacedDescs.get(d) ?? 0) + 1);
    }
    log(
      `   ↳ stays on ${parent.name} (general): ${unplaced.length} entries, ${fmt(unplacedTotal)}`,
    );
    if (unplacedDescs.size) {
      log(
        `      ${[...unplacedDescs.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([d, n]) => (n > 1 ? `${d} ×${n}` : d))
          .join(", ")}`,
      );
    }
  }

  log("");
  log("══ Other changes");

  // Tax payments: never write-offs; mark which year they settle
  const taxes = byName("Taxes");
  if (taxes) {
    const wrongWriteOffs = transactions.filter(
      (t) =>
        String(t.categoryId) === String(taxes._id) &&
        t.isWriteOff &&
        !/fine/i.test(t.description || ""),
    );
    if (wrongWriteOffs.length) {
      log(
        `   Taxes: un-tick write-off on ${wrongWriteOffs.length} tax payments (${fmt(wrongWriteOffs.reduce((s, t) => s + t.amount, 0))})`,
      );
      const ids = wrongWriteOffs.map((t) => t._id);
      ops.push(() =>
        Transactions.updateMany(
          { _id: { $in: ids }, userId },
          { $set: { isWriteOff: false } },
        ),
      );
    }
    for (const override of TAX_YEAR_OVERRIDES) {
      const match = transactions.find(
        (t) =>
          String(t.categoryId) === String(taxes._id) &&
          dateKey(t.date) === override.date &&
          Math.abs(t.amount - override.amount) < 0.005,
      );
      if (!match) {
        log(`   ! Tax payment ${override.date} ${fmt(override.amount)} not found`);
        continue;
      }
      log(
        `   Taxes: ${override.date} ${fmt(override.amount)} counts toward ${override.taxYear} tax`,
      );
      ops.push(() =>
        Transactions.updateOne(
          { _id: match._id, userId },
          { $set: { taxYear: override.taxYear } },
        ),
      );
    }
  }

  for (const fix of BUDGET_TYPE_FIXES) {
    const category = byName(fix.name);
    if (category && category.budgetType !== fix.budgetType) {
      log(`   ${fix.name}: ${category.budgetType} → ${fix.budgetType}`);
      ops.push(() =>
        Categories.updateOne(
          { _id: category._id },
          { $set: { budgetType: fix.budgetType } },
        ),
      );
    }
  }

  for (const name of DELETE_IF_UNUSED) {
    const category = byName(name);
    if (!category) continue;
    const used =
      transactions.some((t) => String(t.categoryId) === String(category._id)) ||
      recurring.some((r) => String(r.categoryId) === String(category._id));
    if (used) {
      log(`   ${name}: kept (still in use)`);
      continue;
    }
    log(`   ${name}: removed (never used)`);
    ops.push(() => Categories.deleteOne({ _id: category._id, userId }));
  }

  if (
    settings &&
    (settings.savingsGoal !== SAVINGS.savingsGoal ||
      settings.savingsStartMonth !== SAVINGS.savingsStartMonth)
  ) {
    log(
      `   Savings goal: ${fmt(SAVINGS.savingsGoal)}/month, carry-over from ${SAVINGS.savingsStartMonth}`,
    );
    ops.push(() =>
      Settings.updateOne({ _id: settings._id }, { $set: SAVINGS }),
    );
  }

  console.log(report.join("\n"));

  if (!APPLY) {
    console.log(`\nDry run — ${ops.length} write operations planned, none applied.`);
    await mongoose.disconnect();
    return;
  }

  // Backup in the app's own export format (restorable via Settings → Import)
  const backupDir = path.resolve("backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `before-categories-${stamp}.json`);
  fs.writeFileSync(
    backupFile,
    JSON.stringify(
      {
        version: 1,
        exportDate: new Date().toISOString(),
        transactions,
        categories,
        recurring,
        settings,
      },
      null,
      2,
    ),
  );
  console.log(`\nBackup written: ${backupFile}`);

  for (const op of ops) await op();
  console.log(`Applied ${ops.length} write operations.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
