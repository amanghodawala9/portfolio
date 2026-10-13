module.exports = function(eleventyConfig) {
  // Copy static assets (optional)
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addWatchTarget("./*.ipynb");

  return {
    pathPrefix: "/portfolio/",
    dir: {
      input: "src",
      output: "build",
      includes: "_includes"
    }
  };
};