import { db } from "./db/client";
import { schools, users, contracts, legs, legEvents } from "./db/schema";
import { eq } from "drizzle-orm";

export const DEMO_SENDER = {
  id: "demo-sender-amina",
  email: "amina@demo.trailpay.app",
  displayName: "Amina Wanjiku",
  role: "sender",
  country: "AE",
  lnAddress: "amina@blink.sv",
};

const SCHOOLS = [
  {
    slug: "kisumu-boys-high",
    name: "Kisumu Boys High School",
    city: "Kisumu",
    country: "KE",
    logoEmoji: "🦅",
    paybillNumber: "400200",
    termFeeLocal: 15000,
    adminId: "admin-kisumu",
    adminName: "Mr. Otieno (Bursar)",
  },
  {
    slug: "loreto-convent-msa",
    name: "Loreto Convent Mombasa",
    city: "Mombasa",
    country: "KE",
    logoEmoji: "🌺",
    paybillNumber: "522533",
    termFeeLocal: 18500,
    adminId: "admin-loreto",
    adminName: "Sr. Mary (Finance)",
  },
  {
    slug: "alliance-high",
    name: "Alliance High School",
    city: "Kikuyu",
    country: "KE",
    logoEmoji: "🛡️",
    paybillNumber: "888880",
    termFeeLocal: 22000,
    adminId: "admin-alliance",
    adminName: "Mrs. Kamau (Accounts)",
  },
  {
    slug: "makerere-college",
    name: "Makerere College School",
    city: "Kampala",
    country: "UG",
    logoEmoji: "📚",
    paybillNumber: "165900",
    termFeeLocal: 12000,
    adminId: "admin-makerere",
    adminName: "Mr. Okello (Bursar)",
  },
];

export async function seedDatabase() {
  const existing = await db.select().from(schools);
  if (existing.length > 0) return { seeded: false };

  await db
    .insert(users)
    .values({
      id: DEMO_SENDER.id,
      email: DEMO_SENDER.email,
      displayName: DEMO_SENDER.displayName,
      role: DEMO_SENDER.role,
      country: DEMO_SENDER.country,
      lnAddress: DEMO_SENDER.lnAddress,
    })
    .onConflictDoNothing();

  for (const s of SCHOOLS) {
    await db
      .insert(users)
      .values({
        id: s.adminId,
        displayName: s.adminName,
        role: "school_admin",
        country: s.country,
      })
      .onConflictDoNothing();

    await db
      .insert(schools)
      .values({
        slug: s.slug,
        name: s.name,
        city: s.city,
        country: s.country,
        logoEmoji: s.logoEmoji,
        paybillNumber: s.paybillNumber,
        termFeeLocal: s.termFeeLocal,
        localCurrency: s.country === "UG" ? "UGX" : "KES",
        adminUserId: s.adminId,
        attestationPubkey: `pk_${s.adminId}`,
        verifiedAt: new Date(),
      })
      .onConflictDoNothing();
  }
  return { seeded: true, schools: SCHOOLS.length };
}

export async function resetDatabase() {
  // Delete in FK-dependency order.
  await db.delete(legEvents);
  await db.delete(legs);
  await db.delete(contracts);
  await db.delete(schools);
  await db.delete(users);
  return seedDatabase();
}

export async function getDemoSchoolAdmin(schoolId: string) {
  const school = await db.query.schools.findFirst({ where: eq(schools.id, schoolId) });
  return school?.adminUserId ?? "admin-unknown";
}
