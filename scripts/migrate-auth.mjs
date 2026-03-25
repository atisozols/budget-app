#!/usr/bin/env node

import bcrypt from "bcryptjs";
import mongoose from "mongoose";

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function buildLegacyFilter() {
  return {
    $or: [{ userId: { $exists: false } }, { userId: null }],
  };
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  const emailArg = getArg("--email");
  const password = getArg("--password");
  const nameArg = getArg("--name");
  const resetPassword = hasFlag("--reset-password");

  if (!mongoUri) {
    throw new Error("MONGODB_URI is required");
  }

  if (!emailArg) {
    throw new Error(
      'Usage: npm run migrate:auth -- --email you@example.com --password your-password --name "Your Name"',
    );
  }

  const email = emailArg.trim().toLowerCase();
  const name = nameArg?.trim() || email.split("@")[0];

  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection not available");
  }

  const users = db.collection("users");
  const categories = db.collection("categories");
  const transactions = db.collection("transactions");
  const recurringPayments = db.collection("recurringpayments");
  const settings = db.collection("settings");

  let user = await users.findOne({ email });
  let createdUser = false;

  if (!user) {
    if (!password) {
      throw new Error("A password is required when creating a new user");
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const insertResult = await users.insertOne({
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
    });

    user = await users.findOne({ _id: insertResult.insertedId });
    createdUser = true;
  } else if (password && resetPassword) {
    const hashedPassword = await bcrypt.hash(password, 12);
    await users.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword, name } },
    );
    user = await users.findOne({ _id: user._id });
  }

  if (!user) {
    throw new Error("Failed to create or load user");
  }

  const legacyFilter = buildLegacyFilter();

  const [categoryResult, transactionResult, recurringResult] =
    await Promise.all([
      categories.updateMany(legacyFilter, { $set: { userId: user._id } }),
      transactions.updateMany(legacyFilter, { $set: { userId: user._id } }),
      recurringPayments.updateMany(legacyFilter, {
        $set: { userId: user._id },
      }),
    ]);

  const currentUserSettings = await settings.findOne({ userId: user._id });
  const legacySettings = await settings
    .find(legacyFilter)
    .sort({ updatedAt: -1, createdAt: -1, _id: 1 })
    .toArray();

  let migratedSettingsId = null;
  let skippedLegacySettings = 0;

  if (!currentUserSettings && legacySettings.length > 0) {
    migratedSettingsId = legacySettings[0]._id;
    await settings.updateOne(
      { _id: migratedSettingsId },
      { $set: { userId: user._id } },
    );
    skippedLegacySettings = Math.max(legacySettings.length - 1, 0);
  } else if (currentUserSettings) {
    skippedLegacySettings = legacySettings.length;
  }

  console.log(
    JSON.stringify(
      {
        userId: String(user._id),
        email,
        createdUser,
        passwordReset: Boolean(password && resetPassword),
        migrated: {
          categories: categoryResult.modifiedCount,
          transactions: transactionResult.modifiedCount,
          recurringPayments: recurringResult.modifiedCount,
          settings: migratedSettingsId ? 1 : 0,
        },
        warnings: skippedLegacySettings
          ? [
              `${skippedLegacySettings} legacy settings document(s) were left untouched because only one settings record can belong to a user.`,
            ]
          : [],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
