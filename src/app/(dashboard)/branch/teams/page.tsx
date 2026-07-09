import { redirect } from "next/navigation";

/** Branch Manager team view — reuses agency teams page scoped by branch */
export default function BranchTeamsPage() {
  redirect("/agency/teams");
}
