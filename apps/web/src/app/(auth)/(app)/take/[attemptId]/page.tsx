import { AttemptView } from "../../../../../components/take/attempt-view";

export default async function AttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  return <AttemptView attemptId={attemptId} />;
}
