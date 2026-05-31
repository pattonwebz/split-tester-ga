import path from "node:path";

export default {
  entry: "./src/index.js",
  output: {
    filename: "frontend.js",
    path: path.resolve(process.cwd(), "build")
  },
  target: "web",
  mode: "production",
  optimization: {
    minimize: true
  }
};
