import { supabase } from "./supabase";

type JobStatus = "pending" | "running" | "succeeded" | "failed";

interface JobLogEntry {
  tenant_id: string;
  source?: string;
  status: JobStatus;
  error?: string | null;
  job_id?: number;
}

export async function logJob(entry: JobLogEntry) {
  if (entry.job_id) {
    // Update existing job
    await supabase
      .from("jobs_log")
      .update({
        status: entry.status,
        finished_at: new Date().toISOString(),
        error: entry.error ?? null,
      })
      .eq("id", entry.job_id);
  } else {
    // Create new job
    await supabase.from("jobs_log").insert({
      tenant_id: entry.tenant_id,
      source: entry.source ?? "shopify",
      status: entry.status,
      started_at: entry.status === "running" ? new Date().toISOString() : undefined,
      finished_at: entry.status !== "running" ? new Date().toISOString() : undefined,
      error: entry.error ?? null,
    });
  }
}

export async function createJob(tenantId: string, source: string = "shopify") {
  const { data, error } = await supabase
    .from("jobs_log")
    .insert({
      tenant_id: tenantId,
      source,
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error("Failed to create job log entry");
  }

  return data.id;
}
