import { ProgramVersionVerification } from "@/features/admin/ui/program-version-verification";
export default async function ProgramVersionTestsPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <ProgramVersionVerification versionId={id}/>;}
