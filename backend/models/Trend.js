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

module.exports = mongoose.model("Trend", trendSchema);
