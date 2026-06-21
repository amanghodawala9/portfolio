module.exports = function(eleventyConfig) {
  // Copy static assets (optional)
  eleventyConfig.addPassthroughCopy("src/assets");

  return {
    pathPrefix: "/portfolio/",
    dir: {
      input: "src",
      output: "build",
      includes: "_includes"
    }
  };
};