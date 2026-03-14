type TaskCardProps = {
  title: string;
  status?: string;
};

export function TaskCard({ title, status }: TaskCardProps) {
  return (
    <div>
      <h3>{title}</h3>
      {status ? <p>{status}</p> : null}
    </div>
  );
}