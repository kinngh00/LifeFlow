import { DraftConfigurationEditor } from "@/features/admin/ui/draft-configuration-editor";
export default async function DraftEditPage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <DraftConfigurationEditor versionId={id}/>;}
