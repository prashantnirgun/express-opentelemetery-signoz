import { trace } from "@opentelemetry/api";
import jobService from "./job.service.js";

const tracer = trace.getTracer("job-controller");

export const createJob = async (req, res, next) => {
  const span = tracer.startSpan("controller:createJob");
  try {
    span.setAttributes({
      "job.title": req.body.title,
      "job.company": req.body.company,
    });
    const job = await jobService.createJob(req.body);
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    span.recordException(error);
    next(error);
  } finally {
    span.end();
  }
};

export const getAllJobs = async (req, res, next) => {
  const span = tracer.startSpan("controller:getAllJobs");
  try {
    span.setAttributes({
      "query.filter": JSON.stringify(req.query),
    });
    const jobs = await jobService.getAllJobs(req.query);
    span.setAttributes({
      "jobs.count": jobs.length,
    });
    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    span.recordException(error);
    next(error);
  } finally {
    span.end();
  }
};

export const getJobById = async (req, res, next) => {
  const span = tracer.startSpan("controller:getJobById");
  try {
    span.setAttributes({
      "job.id": req.params.id,
    });
    const job = await jobService.getJobById(req.params.id);
    if (!job) {
      span.addEvent("job_not_found");
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    span.recordException(error);
    next(error);
  } finally {
    span.end();
  }
};

export const updateJob = async (req, res, next) => {
  const span = tracer.startSpan("controller:updateJob");
  try {
    span.setAttributes({
      "job.id": req.params.id,
      "update.fields": Object.keys(req.body).join(","),
    });
    const job = await jobService.updateJob(req.params.id, req.body);
    if (!job) {
      span.addEvent("job_not_found");
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    span.recordException(error);
    next(error);
  } finally {
    span.end();
  }
};

export const deleteJob = async (req, res, next) => {
  const span = tracer.startSpan("controller:deleteJob");
  try {
    span.setAttributes({
      "job.id": req.params.id,
    });
    const job = await jobService.deleteJob(req.params.id);
    if (!job) {
      span.addEvent("job_not_found");
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    span.recordException(error);
    next(error);
  } finally {
    span.end();
  }
};
