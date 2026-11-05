import { AssessmentEditor } from "../../../../../components/assessments/editor";

export default async function AssessmentPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  const { assessmentId } = await params;
  return <AssessmentEditor assessmentId={assessmentId} />;
}
