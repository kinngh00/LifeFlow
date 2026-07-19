import { Suspense } from "react";
import { AdminProgramList } from "@/features/admin/ui/admin-program-list";

export const metadata = { title: "지원제도 관리" };
export default function AdminProgramsPage() { return <Suspense fallback={<p>목록을 불러오는 중입니다.</p>}><AdminProgramList /></Suspense>; }
