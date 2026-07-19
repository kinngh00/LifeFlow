import { afterAll,afterEach,beforeEach,describe,expect,it } from "vitest";
import { createAdminAccount } from "@/features/admin/auth/services/create-admin-account";
import { authenticateAdmin } from "@/features/admin/auth/services/admin-auth.service";
import { disconnectTestDatabase,getTestDatabase,uniqueTestValue } from "./helpers/database";
import { IntegrationTestScope } from "./helpers/test-scope";

const database=getTestDatabase();const password="correct horse battery staple";let scope:IntegrationTestScope;
async function create(){const email=`${uniqueTestValue("cli-admin")}@example.com`;const result=await createAdminAccount({email,displayName:"CLI 관리자",password,passwordConfirmation:password},database);scope.adminIds.push(result.id);return result}
describe("admin account creation",()=>{beforeEach(()=>{scope=new IntegrationTestScope(database)});afterEach(()=>scope.cleanup());afterAll(disconnectTestDatabase);
 it("실제 DB에 active 관리자를 생성한다",async()=>{const result=await create();expect(await database.adminUser.findUnique({where:{id:result.id}})).toMatchObject({active:true})});
 it("생성 계정으로 로그인 인증에 성공한다",async()=>{const result=await create();expect((await authenticateAdmin({email:result.email,password},database)).id).toBe(result.id)});
 it("중복 이메일 생성을 거부한다",async()=>{const result=await create();await expect(createAdminAccount({email:result.email,displayName:"중복",password,passwordConfirmation:password},database)).rejects.toMatchObject({code:"ADMIN_EMAIL_CONFLICT"})});
 it("DB에 평문 비밀번호를 저장하지 않는다",async()=>{const result=await create();const row=await database.adminUser.findUniqueOrThrow({where:{id:result.id}});expect(row.passwordHash).not.toBe(password);expect(row.passwordHash).toMatch(/^scrypt\$/)});
 it("scope 정리 후 관리자가 남지 않는다",async()=>{const result=await create();await scope.cleanup();expect(await database.adminUser.findUnique({where:{id:result.id}})).toBeNull()});
});
