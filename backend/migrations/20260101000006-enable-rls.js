"use strict"

// Row-Level Security is the database-level half of tenant isolation (A.3).
// FORCE ROW LEVEL SECURITY matters here specifically because the app's own
// Postgres role owns these tables (it ran the migrations that created
// them), and plain ENABLE ROW LEVEL SECURITY exempts a table's owner by
// default — without FORCE, the app's own connection would silently bypass
// the policy it just created. (Superusers always bypass regardless; that's
// why the app must never connect as one — see backend/.env.example.)
//
// The session variables are set with `set_config(..., true)` inside each
// request's transaction (A.10, withOrgTransaction.ts), so they reset when
// the transaction ends and never leak to the next request sharing that
// pooled connection. `current_setting(..., true)` is meant to return NULL
// when unset — but on a pooled connection that has ever set this custom
// GUC before, it settles back to '' (empty string), not NULL, once the
// transaction ends (a Postgres quirk with custom, non-built-in settings).
// `nullif(x, '')` folds that empty string to NULL before the ::uuid cast,
// which would otherwise throw `invalid input syntax for type uuid: ""`
// instead of the fail-closed "no rows" we actually want.
const ORG_SCOPED_TABLES = ["memberships", "subscriptions"]

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const table of ORG_SCOPED_TABLES) {
      await queryInterface.sequelize.query(`
        ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;
        ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;
        CREATE POLICY org_isolation ON "${table}"
          USING (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
          WITH CHECK (organization_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
      `)
    }

    // Login has to discover which org(s) a user belongs to *before* any org
    // is known, so a plain org-scoped policy alone leaves login unable to
    // read its own membership rows. A user reading their own rows (matched
    // by their own verified id, not an attacker-supplied org) can't leak
    // another tenant's data, so it's safe as a second, SELECT-only
    // permissive policy (Postgres OR-combines permissive policies on the
    // same table/command) — see auth/tokens + services/authService.
    await queryInterface.sequelize.query(`
      CREATE POLICY self_membership_read ON "memberships"
        FOR SELECT
        USING (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid);
    `)
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP POLICY IF EXISTS self_membership_read ON "memberships";
    `)
    for (const table of ORG_SCOPED_TABLES) {
      await queryInterface.sequelize.query(`
        DROP POLICY IF EXISTS org_isolation ON "${table}";
        ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY;
      `)
    }
  },
}
