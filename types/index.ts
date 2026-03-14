export type Project = {
  id: string;
  name: string;
};

export type Task = {
  id: string;
  title: string;
  status?: string;
};

export type User = {
  id: string;
  email: string;
};