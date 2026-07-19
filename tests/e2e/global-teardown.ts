import { Client } from "pg";
import { assertSafeTestDatabaseUrl } from "@/server/db/test-database-url";

export default async function globalTeardown() {
 const adminId=process.env.E2E_ADMIN_ID;if(!adminId)return;
 const connectionString = assertSafeTestDatabaseUrl({
  testDatabaseUrl: process.env.TEST_DATABASE_URL,
  databaseUrl: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL,
 });
 const client=new Client({connectionString,connectionTimeoutMillis:3000});await client.connect();await client.query("BEGIN");
 try{
  const programs=await client.query<{id:string}>('SELECT "id" FROM "SupportProgram" WHERE "createdById"=$1',[adminId]);const programIds=programs.rows.map(r=>r.id);
  if(programIds.length){const versions=await client.query<{id:string}>('SELECT "id" FROM "ProgramVersion" WHERE "programId"=ANY($1::text[])',[programIds]);const versionIds=versions.rows.map(r=>r.id);
   if(versionIds.length){const runs=await client.query<{id:string}>('SELECT "id" FROM "RuleTestRun" WHERE "programVersionId"=ANY($1::text[])',[versionIds]);const runIds=runs.rows.map(r=>r.id);if(runIds.length)await client.query('DELETE FROM "RuleTestResult" WHERE "testRunId"=ANY($1::text[])',[runIds]);await client.query('DELETE FROM "RuleTestResult" WHERE "testCaseId" IN (SELECT "id" FROM "RuleTestCase" WHERE "programVersionId"=ANY($1::text[]))',[versionIds]);await client.query('DELETE FROM "RuleTestRun" WHERE "programVersionId"=ANY($1::text[])',[versionIds]);await client.query('DELETE FROM "RuleTestCase" WHERE "programVersionId"=ANY($1::text[])',[versionIds]);await client.query('DELETE FROM "EligibilityRule" WHERE "programVersionId"=ANY($1::text[])',[versionIds]);await client.query('DELETE FROM "ProgramRegion" WHERE "programVersionId"=ANY($1::text[])',[versionIds]);await client.query('DELETE FROM "ProgramSource" WHERE "programVersionId"=ANY($1::text[])',[versionIds]);await client.query('DELETE FROM "PublicationEvent" WHERE "programVersionId"=ANY($1::text[]) OR "previousPublishedVersionId"=ANY($1::text[])',[versionIds]);await client.query('DELETE FROM "AdminAuditLog" WHERE "entityType"=$1 AND "entityId"=ANY($2::text[])',["ProgramVersion",versionIds]);}
   await client.query('UPDATE "SupportProgram" SET "currentPublishedVersionId"=NULL WHERE "id"=ANY($1::text[])',[programIds]);await client.query('DELETE FROM "ProgramVersion" WHERE "programId"=ANY($1::text[])',[programIds]);await client.query('DELETE FROM "SupportProgram" WHERE "id"=ANY($1::text[])',[programIds]);}
  await client.query('DELETE FROM "AdminSession" WHERE "adminUserId"=$1',[adminId]);await client.query('DELETE FROM "AdminAuditLog" WHERE "adminUserId"=$1',[adminId]);await client.query('DELETE FROM "AdminUser" WHERE "id"=$1',[adminId]);await client.query("COMMIT");
 }catch(error){await client.query("ROLLBACK");throw error}finally{await client.end()}
}
