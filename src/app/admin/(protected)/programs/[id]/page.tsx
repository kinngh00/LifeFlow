import { AdminProgramDetailView } from "@/features/admin/ui/admin-program-detail";
export default async function AdminProgramDetailPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AdminProgramDetailView programId={id}/>;}
