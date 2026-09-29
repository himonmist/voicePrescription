import { RouterForm } from "./RouterForm";
export default async function Router({ searchParams }: { searchParams: Promise<{ task?: string }> }) {
  const { task = "" } = await searchParams;
  return <div className="mx-auto max-w-3xl space-y-4"><h1 className="text-2xl font-bold">Auto AI Assistant</h1><RouterForm initialTask={task.slice(0, 5000)} /></div>;
}
