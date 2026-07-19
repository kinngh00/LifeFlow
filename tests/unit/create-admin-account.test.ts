import { describe,expect,it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { CreateAdminAccountSchema } from "@/features/admin/auth/schemas/create-admin-account.schema";
import { createAdminAccount } from "@/features/admin/auth/services/create-admin-account";
import { verifyAdminPassword } from "@/server/auth/password";

const password="correct horse battery staple";
function fakeDatabase(existing=false){let storedHash="";const database={adminUser:{findUnique:async()=>existing?{id:"existing"}:null,create:async({data}:{data:{email:string;displayName:string;passwordHash:string;active:boolean}})=>{storedHash=data.passwordHash;return{id:"admin-1",email:data.email,displayName:data.displayName,active:data.active,createdAt:new Date("2026-07-19")}}}} as unknown as PrismaClient;return{database,getHash:()=>storedHash}}
describe("create admin account",()=>{
 it("정상 입력을 검증한다",()=>expect(CreateAdminAccountSchema.safeParse({email:"admin@example.com",displayName:"관리자",password,passwordConfirmation:password}).success).toBe(true));
 it("이메일을 소문자로 정규화한다",()=>expect(CreateAdminAccountSchema.parse({email:" ADMIN@EXAMPLE.COM ",displayName:"관리자",password,passwordConfirmation:password}).email).toBe("admin@example.com"));
 it("비밀번호 불일치를 거부한다",()=>expect(()=>CreateAdminAccountSchema.parse({email:"admin@example.com",displayName:"관리자",password,passwordConfirmation:"different password value"})).toThrow());
 it("중복 이메일을 명확한 오류로 변환한다",async()=>{const{database}=fakeDatabase(true);await expect(createAdminAccount({email:"admin@example.com",displayName:"관리자",password,passwordConfirmation:password},database)).rejects.toMatchObject({code:"ADMIN_EMAIL_CONFLICT"})});
 it("반환값에 평문 비밀번호나 hash를 포함하지 않는다",async()=>{const{database}=fakeDatabase();const result=await createAdminAccount({email:"admin@example.com",displayName:"관리자",password,passwordConfirmation:password},database);expect(JSON.stringify(result)).not.toContain(password);expect(result).not.toHaveProperty("passwordHash")});
 it("기존 scrypt 형식으로 비밀번호를 해시한다",async()=>{const{database,getHash}=fakeDatabase();await createAdminAccount({email:"admin@example.com",displayName:"관리자",password,passwordConfirmation:password},database);expect(await verifyAdminPassword(password,getHash())).toBe(true)});
 it("active=true 관리자를 생성한다",async()=>{const{database}=fakeDatabase();expect((await createAdminAccount({email:"admin@example.com",displayName:"관리자",password,passwordConfirmation:password},database)).active).toBe(true)});
});
