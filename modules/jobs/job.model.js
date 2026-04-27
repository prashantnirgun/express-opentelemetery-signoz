import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    company: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
    },
    salary: {
      type: Number,
    },
    status: {
      type: String,
      enum: ["open", "closed", "draft"],
      default: "open",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Job", jobSchema);
