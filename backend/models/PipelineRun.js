const mongoose = require("mongoose");

const pipelineRunSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["collecting", "completed", "failed", "empty"],
      required: true,
      default: "collecting",
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    lastCollectedAt: {
      type: Date,
      default: null,
    },
    articleCount: {
      type: Number,
      default: 0,
    },
    keywordCount: {
      type: Number,
      default: 0,
    },
    categoryCount: {
      type: Number,
      default: 0,
    },
    sourceCount: {
      type: Number,
      default: 0,
    },
    failedSourceCount: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    collection: "pipeline_runs",
    timestamps: true,
  }
);

pipelineRunSchema.index({ startedAt: -1 });

module.exports = mongoose.model("PipelineRun", pipelineRunSchema);
