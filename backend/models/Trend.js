const mongoose = require("mongoose");

const trendSchema = new mongoose.Schema(
  {
    keyword: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      default: "society",
      index: true,
    },
    categoryLabel: {
      type: String,
      required: true,
      default: "Society",
    },
    count: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

trendSchema.index({ category: 1, date: -1, count: -1 });
trendSchema.index({ category: 1, keyword: 1, date: 1 });

module.exports = mongoose.model("Trend", trendSchema);
