export type FormStatus = "idle" | "submitting" | "success" | "error";

export type FormState = {
  status: FormStatus;
  message?: string;
};
