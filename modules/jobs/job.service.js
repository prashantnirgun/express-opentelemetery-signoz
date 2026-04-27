import { trace } from "@opentelemetry/api";
import Job from "./job.model.js";

const tracer = trace.getTracer("job-service");

class JobService {
  async createJob(jobData) {
    const span = tracer.startSpan("service:createJob");
    try {
      span.setAttributes({
        "db.operation": "create",
        "db.collection": "jobs",
      });
      const job = new Job(jobData);
      const savedJob = await job.save();
      span.addEvent("job_created", { "job.id": savedJob._id.toString() });
      return savedJob;
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  async getAllJobs(filter = {}) {
    const span = tracer.startSpan("service:getAllJobs");
    try {
      span.setAttributes({
        "db.operation": "find",
        "db.collection": "jobs",
        "query.filter": JSON.stringify(filter),
      });
      const jobs = await Job.find(filter).sort({ createdAt: -1 });
      span.setAttributes({
        "query.results.count": jobs.length,
      });
      return jobs;
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  async getJobById(jobId) {
    const span = tracer.startSpan("service:getJobById");
    try {
      span.setAttributes({
        "db.operation": "findById",
        "db.collection": "jobs",
        "job.id": jobId,
      });
      const job = await Job.findById(jobId);
      if (!job) {
        span.addEvent("job_not_found");
      }
      return job;
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  async updateJob(jobId, updateData) {
    const span = tracer.startSpan("service:updateJob");
    try {
      span.setAttributes({
        "db.operation": "findByIdAndUpdate",
        "db.collection": "jobs",
        "job.id": jobId,
        "update.fields": Object.keys(updateData).join(","),
      });
      const job = await Job.findByIdAndUpdate(jobId, updateData, {
        new: true,
        runValidators: true,
      });
      if (job) {
        span.addEvent("job_updated");
      }
      return job;
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  async deleteJob(jobId) {
    const span = tracer.startSpan("service:deleteJob");
    try {
      span.setAttributes({
        "db.operation": "findByIdAndDelete",
        "db.collection": "jobs",
        "job.id": jobId,
      });
      const job = await Job.findByIdAndDelete(jobId);
      if (job) {
        span.addEvent("job_deleted");
      }
      return job;
    } catch (error) {
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }
}

export default new JobService();
