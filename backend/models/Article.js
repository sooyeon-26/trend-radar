const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
      unique: true,
    },
    source: {
      type: String,
      required: true,
    },
    feedUrl: {
      type: String,
      default: "",
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
    publishedAt: {
      type: String,
      required: true,
    },
    keywords: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

articleSchema.index({ category: 1, publishedAt: -1 });
articleSchema.index({ category: 1, keywords: 1, publishedAt: -1 });

module.exports = mongoose.model("Article", articleSchema);
