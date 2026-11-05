import { GenerationProgress } from "../../../../../../components/assessments/generation-progress";

export default async function GenerationPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <GenerationProgress jobId={jobId} />;
}
